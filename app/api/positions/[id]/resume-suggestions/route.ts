import { resumeSuggestionsSchema, positionCategorySchema } from "@/lib/analysis-schema";
import { getAiConfiguration, isAiConfigured } from "@/lib/ai-client";
import { runAnalysis } from "@/lib/analysis-engine";
import { claimAiRun } from "@/lib/ai-run-guard";
import { createUserSupabase } from "@/lib/supabase";

export const runtime = "edge";
const PROMPT_VERSION = "resume-v5-fast-single-call";

function tokenFrom(request: Request) {
  return request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
}

async function sha256(value: string) {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return Array.from(new Uint8Array(digest)).map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

async function loadSuggestions(supabase: ReturnType<typeof createUserSupabase>, positionId: string) {
  const { data, error } = await supabase.from("resume_suggestions")
    .select("id,action,original_text,suggested_text,reason,risk,accepted,edited_text,created_at")
    .eq("position_id", positionId).order("created_at");
  if (error) throw error;
  return data ?? [];
}

async function loadEvidence(supabase: ReturnType<typeof createUserSupabase>, positionId: string) {
  const { data, error } = await supabase.from("requirements")
    .select("id,kind,requirement,jd_quote,importance,requirement_evidence(id,status,rationale,action,evidence_items(id,resume_quote))")
    .eq("position_id", positionId).order("created_at");
  if (error) throw error;
  return data ?? [];
}

function normalizeText(value: string) {
  return value.toLowerCase().replace(/[\s\p{P}\p{S}]+/gu, "");
}

function resumeQuotesFromRequirement(requirement: Awaited<ReturnType<typeof loadEvidence>>[number]) {
  const relations = Array.isArray(requirement.requirement_evidence)
    ? requirement.requirement_evidence
    : requirement.requirement_evidence ? [requirement.requirement_evidence] : [];
  return relations.flatMap((relation) => {
    const sources = Array.isArray(relation.evidence_items) ? relation.evidence_items : relation.evidence_items ? [relation.evidence_items] : [];
    return sources.map((source) => source.resume_quote);
  });
}

function enrichSuggestions(items: Awaited<ReturnType<typeof loadSuggestions>>, evidence: Awaited<ReturnType<typeof loadEvidence>>) {
  return items.map((item) => ({
    ...item,
    jd_quotes: evidence.filter((requirement) => resumeQuotesFromRequirement(requirement).some((quote) => normalizeText(quote) === normalizeText(item.original_text)))
      .map((requirement) => requirement.jd_quote)
      .filter((quote, index, all) => all.indexOf(quote) === index)
      .slice(0, 2),
  }));
}

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const startedAt = Date.now();
  let runId = "";
  try {
    if (!isAiConfigured()) return Response.json({ error: "AI 服务尚未配置" }, { status: 503 });
    const accessToken = tokenFrom(request);
    const supabase = createUserSupabase(accessToken);
    const { data: user } = await supabase.auth.getUser();
    if (!user.user) return Response.json({ error: "请先登录" }, { status: 401 });
    const { id: positionId } = await context.params;
    const body = await request.json().catch(() => ({})) as { force?: boolean; phase?: "core" | "expand" };
    const phase = body.phase === "expand" ? "expand" : "core";

    const { data: position, error: positionError } = await supabase.from("positions")
      .select("id,category,jd_text,resume_id,position_revision,role_profile_id").eq("id", positionId).maybeSingle();
    if (positionError) throw positionError;
    if (!position) return Response.json({ error: "岗位不存在或你无权分析" }, { status: 404 });

    let resumeQuery = supabase.from("resumes").select("id,version,document_version,parsed_text,content_hash");
    resumeQuery = position.resume_id ? resumeQuery.eq("id", position.resume_id) : resumeQuery.order("version", { ascending: false }).limit(1);
    const { data: resume, error: resumeError } = await resumeQuery.maybeSingle();
    if (resumeError) throw resumeError;
    if (!resume?.parsed_text) return Response.json({ error: "请先上传并解析母版简历" }, { status: 409 });

    const evidence = await loadEvidence(supabase, positionId);
    if (!evidence.length) return Response.json({ error: "请先生成证据地图，再生成定制简历" }, { status: 409 });
    const analysisContext = JSON.stringify(evidence);
    const ai = getAiConfiguration();
    const current = await loadSuggestions(supabase, positionId);
    const existingContext = phase === "expand" ? JSON.stringify(current.map((item) => ({ action: item.action, original: item.original_text, suggested: item.suggested_text }))) : "";
    const inputHash = await sha256(`${PROMPT_VERSION}\n${phase}\n${ai.provider}\n${ai.model}\n${resume.content_hash}\n${resume.parsed_text}\n${position.jd_text}\n${analysisContext}\n${existingContext}`);
    const task = `resume-${phase}`;
    const { data: cachedRun } = await supabase.from("ai_runs").select("id,model,duration_ms")
      .eq("position_id", positionId).eq("task", task).eq("input_hash", inputHash).eq("status", "ready").maybeSingle();
    if (cachedRun && !body.force) return Response.json({ data: { suggestions: enrichSuggestions(current, evidence), meta: { model: cachedRun.model, cached: true, resumeCompleted: true } } });
    if (cachedRun) await supabase.from("ai_runs").delete().eq("id", cachedRun.id);

    const claim = await claimAiRun({ supabase, userId: user.user.id, positionId, task, model: ai.model, promptVersion: PROMPT_VERSION, inputHash });
    if (!claim.acquired) {
      return Response.json({ data: { suggestions: enrichSuggestions(current, evidence), meta: { activeRun: claim.activeRun, inProgress: Boolean(claim.activeRun), completed: Boolean("completed" in claim && claim.completed), resumeCompleted: current.length > 0 } } }, { status: claim.activeRun ? 202 : 200 });
    }
    runId = claim.runId;

    const result = await runAnalysis({
      kind: "resume", category: positionCategorySchema.parse(position.category),
      jd: position.jd_text, resume: resume.parsed_text, analysisContext, existingContext, phase,
    });
    const validated = resumeSuggestionsSchema.parse(result.data);
    const suggestions = validated.suggestions.flatMap((item) => {
      const original = resume.parsed_text.includes(item.original)
        ? item.original
        : item.sourceQuotes.find((quote) => resume.parsed_text.includes(quote));
      return original ? [{ ...item, original }] : [];
    });
    if (phase === "core") {
      const { error: deleteError } = await supabase.from("resume_suggestions").delete().eq("position_id", positionId);
      if (deleteError) throw deleteError;
    }
    const existingForDeduplication = phase === "expand" ? current : [];
    const seenOriginals = new Set(existingForDeduplication.map((item) => normalizeText(item.original_text)));
    const seenSuggested = new Set(existingForDeduplication.map((item) => normalizeText(item.suggested_text)));
    const freshSuggestions = suggestions.filter((item) => {
      const originalKey = normalizeText(item.original);
      const suggestedKey = normalizeText(item.suggested);
      if (seenOriginals.has(originalKey) || seenSuggested.has(suggestedKey)) return false;
      seenOriginals.add(originalKey);
      seenSuggested.add(suggestedKey);
      return true;
    }).slice(0, phase === "core" ? 4 : 2);
    if (freshSuggestions.length) {
      const { error: insertError } = await supabase.from("resume_suggestions").insert(freshSuggestions.map((item) => ({
        user_id: user.user.id,
        position_id: positionId,
        action: item.action,
        original_text: item.original,
        suggested_text: item.suggested,
        reason: item.reason,
        risk: item.risk,
        accepted: false,
      })));
      if (insertError) throw insertError;
    }

    const durationMs = Date.now() - startedAt;
    await supabase.from("ai_runs").update({
      status: "ready", model: result.model, duration_ms: durationMs,
      input_tokens: result.usage?.prompt_tokens ?? null, output_tokens: result.usage?.completion_tokens ?? null,
      position_revision: position.position_revision,
      resume_version_id: resume.id,
      role_profile_id: position.role_profile_id,
      completed_at: new Date().toISOString(),
      result_snapshot: validated,
      error_code: null,
    }).eq("id", runId);
    const { error: snapshotError } = await supabase.from("analysis_snapshots").insert({
      user_id: user.user.id,
      position_id: positionId,
      analysis_type: phase === "core" ? "resume_core" : "resume_expand",
      position_revision: position.position_revision,
      resume_version_id: resume.id,
      role_profile_id: position.role_profile_id,
      prompt_version: PROMPT_VERSION,
      model: result.model,
      result_json: validated,
    });
    if (snapshotError) throw snapshotError;
    const saved = await loadSuggestions(supabase, positionId);
    return Response.json({ data: { suggestions: enrichSuggestions(saved, evidence), meta: { model: result.model, provider: result.provider, durationMs, phase, resumeCompleted: true } } });
  } catch (error) {
    const message = error instanceof Error ? error.message : "定制简历生成失败";
    try {
      const supabase = createUserSupabase(tokenFrom(request));
      if (runId) await supabase.from("ai_runs").update({ status: "failed", duration_ms: Date.now() - startedAt, error_code: message.slice(0, 240) }).eq("id", runId);
    } catch { void 0; }
    return Response.json({ error: message.includes("引用") ? "定制建议的原文引用未通过校验，请重新生成" : message }, { status: message.includes("aborted") ? 504 : 502 });
  }
}
