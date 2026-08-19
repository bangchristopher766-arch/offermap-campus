import { evidenceMapSchema, positionCategorySchema } from "@/lib/analysis-schema";
import { isAiConfigured } from "@/lib/ai-client";
import { runAnalysis } from "@/lib/analysis-engine";
import { createUserSupabase } from "@/lib/supabase";

export const runtime = "edge";
const PROMPT_VERSION = "evidence-v3-safe-line-ids";

function tokenFrom(request: Request) {
  return request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
}

async function sha256(value: string) {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return Array.from(new Uint8Array(digest)).map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

async function loadPosition(supabase: ReturnType<typeof createUserSupabase>, id: string) {
  const { data, error } = await supabase
    .from("positions")
    .select("id,title,category,department,location,job_code,jd_text,resume_id,analysis_status,analyzed_resume_version,companies(name),applications(current_stage,next_event_at,next_event_type)")
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  return data;
}

async function loadEvidence(supabase: ReturnType<typeof createUserSupabase>, positionId: string) {
  const { data, error } = await supabase
    .from("requirements")
    .select("id,kind,requirement,jd_quote,importance,requirement_evidence(id,status,rationale,action,evidence_items(id,resume_quote))")
    .eq("position_id", positionId)
    .order("created_at");
  if (error) throw error;
  return data ?? [];
}

export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const supabase = createUserSupabase(tokenFrom(request));
    const { data: user } = await supabase.auth.getUser();
    if (!user.user) return Response.json({ error: "请先登录" }, { status: 401 });
    const { id } = await context.params;
    const position = await loadPosition(supabase, id);
    if (!position) return Response.json({ error: "岗位不存在或你无权查看" }, { status: 404 });
    const evidence = await loadEvidence(supabase, id);
    return Response.json({ data: { position, evidence } });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "分析读取失败" }, { status: 503 });
  }
}

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const startedAt = Date.now();
  let runId = "";
  let positionId = "";
  try {
    if (!isAiConfigured()) return Response.json({ error: "AI 服务尚未配置" }, { status: 503 });
    const accessToken = tokenFrom(request);
    const supabase = createUserSupabase(accessToken);
    const { data: user } = await supabase.auth.getUser();
    if (!user.user) return Response.json({ error: "请先登录" }, { status: 401 });
    const params = await context.params;
    positionId = params.id;
    const body = await request.json().catch(() => ({})) as { force?: boolean };
    const position = await loadPosition(supabase, positionId);
    if (!position) return Response.json({ error: "岗位不存在或你无权分析" }, { status: 404 });

    let resumeQuery = supabase.from("resumes").select("id,name,version,parsed_text,content_hash");
    resumeQuery = position.resume_id ? resumeQuery.eq("id", position.resume_id) : resumeQuery.order("version", { ascending: false }).limit(1);
    const { data: resume, error: resumeError } = await resumeQuery.maybeSingle();
    if (resumeError) throw resumeError;
    if (!resume?.parsed_text || resume.parsed_text.trim().length < 80) return Response.json({ error: "请先上传并成功解析一份母版简历", code: "RESUME_REQUIRED" }, { status: 409 });

    const category = positionCategorySchema.parse(position.category);
    const inputHash = await sha256(`${PROMPT_VERSION}\n${resume.content_hash}\n${position.jd_text}`);
    const { data: cachedRun } = await supabase.from("ai_runs").select("id,model,duration_ms").eq("position_id", positionId).eq("task", "evidence").eq("input_hash", inputHash).eq("status", "ready").maybeSingle();
    const currentEvidence = await loadEvidence(supabase, positionId);
    if (cachedRun && currentEvidence.length && !body.force) {
      return Response.json({ data: { position, evidence: currentEvidence, meta: { model: cachedRun.model, durationMs: cachedRun.duration_ms, cached: true } } });
    }
    if (cachedRun && (body.force || !currentEvidence.length)) await supabase.from("ai_runs").delete().eq("id", cachedRun.id);
    const { data: run, error: runError } = await supabase.from("ai_runs").insert({
      user_id: user.user.id,
      position_id: positionId,
      task: "evidence",
      model: process.env.AI_MODEL || "glm-4.5-flash",
      prompt_version: PROMPT_VERSION,
      input_hash: inputHash,
      status: "processing",
    }).select("id").single();
    if (runError) throw runError;
    runId = run.id;
    await supabase.from("positions").update({ analysis_status: "processing", resume_id: resume.id, updated_at: new Date().toISOString() }).eq("id", positionId);

    const result = await runAnalysis({ kind: "evidence", category, jd: position.jd_text, resume: resume.parsed_text });
    const validated = evidenceMapSchema.parse(result.data);

    const oldEvidenceIds = currentEvidence.flatMap((item) => {
      const relations = Array.isArray(item.requirement_evidence) ? item.requirement_evidence : item.requirement_evidence ? [item.requirement_evidence] : [];
      return relations.flatMap((relation) => {
        const evidenceItems = Array.isArray(relation.evidence_items) ? relation.evidence_items : relation.evidence_items ? [relation.evidence_items] : [];
        return evidenceItems.map((evidenceItem) => evidenceItem.id);
      });
    });
    const { error: deleteError } = await supabase.from("requirements").delete().eq("position_id", positionId);
    if (deleteError) throw deleteError;
    if (oldEvidenceIds.length) await supabase.from("evidence_items").delete().in("id", oldEvidenceIds);

    for (const item of validated.requirements) {
      const { data: requirement, error: requirementError } = await supabase.from("requirements").insert({
        user_id: user.user.id,
        position_id: positionId,
        kind: item.type,
        requirement: item.requirement,
        jd_quote: item.jdQuote,
        importance: item.importance,
      }).select("id").single();
      if (requirementError) throw requirementError;

      let evidenceId: string | null = null;
      if (item.resumeQuote) {
        const { data: evidence, error: evidenceError } = await supabase.from("evidence_items").insert({
          user_id: user.user.id,
          resume_id: resume.id,
          title: item.requirement,
          resume_quote: item.resumeQuote,
        }).select("id").single();
        if (evidenceError) throw evidenceError;
        evidenceId = evidence.id;
      }

      const { error: relationError } = await supabase.from("requirement_evidence").insert({
        user_id: user.user.id,
        requirement_id: requirement.id,
        evidence_id: evidenceId,
        status: item.status,
        rationale: item.rationale,
        action: item.action,
      });
      if (relationError) throw relationError;
    }

    const durationMs = Date.now() - startedAt;
    await supabase.from("ai_runs").update({
      status: "ready",
      model: result.model,
      duration_ms: durationMs,
      input_tokens: result.usage?.prompt_tokens ?? null,
      output_tokens: result.usage?.completion_tokens ?? null,
    }).eq("id", runId);
    await supabase.from("positions").update({
      analysis_status: "ready",
      analyzed_resume_version: resume.version,
      updated_at: new Date().toISOString(),
    }).eq("id", positionId);

    const refreshed = await loadPosition(supabase, positionId);
    const evidence = await loadEvidence(supabase, positionId);
    return Response.json({ data: { position: refreshed, evidence, meta: { model: result.model, provider: result.provider, durationMs } } });
  } catch (error) {
    const message = error instanceof Error ? error.message : "分析失败";
    try {
      const supabase = createUserSupabase(tokenFrom(request));
      if (runId) await supabase.from("ai_runs").update({ status: "failed", duration_ms: Date.now() - startedAt, error_code: message.slice(0, 240) }).eq("id", runId);
      if (positionId) await supabase.from("positions").update({ analysis_status: "failed", updated_at: new Date().toISOString() }).eq("id", positionId);
    } catch { void 0; }
    return Response.json({ error: message.includes("引用") ? "模型引用未通过原文校验，请重新生成" : message }, { status: message.includes("aborted") ? 504 : 502 });
  }
}
