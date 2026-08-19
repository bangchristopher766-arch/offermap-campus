import { resumeSuggestionsSchema, positionCategorySchema } from "@/lib/analysis-schema";
import { getAiConfiguration, isAiConfigured } from "@/lib/ai-client";
import { runAnalysis } from "@/lib/analysis-engine";
import { createUserSupabase } from "@/lib/supabase";

export const runtime = "edge";
const PROMPT_VERSION = "resume-v1-evidence-grounded";

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
    const body = await request.json().catch(() => ({})) as { force?: boolean };

    const { data: position, error: positionError } = await supabase.from("positions")
      .select("id,category,jd_text,resume_id").eq("id", positionId).maybeSingle();
    if (positionError) throw positionError;
    if (!position) return Response.json({ error: "岗位不存在或你无权分析" }, { status: 404 });

    let resumeQuery = supabase.from("resumes").select("id,version,parsed_text,content_hash");
    resumeQuery = position.resume_id ? resumeQuery.eq("id", position.resume_id) : resumeQuery.order("version", { ascending: false }).limit(1);
    const { data: resume, error: resumeError } = await resumeQuery.maybeSingle();
    if (resumeError) throw resumeError;
    if (!resume?.parsed_text) return Response.json({ error: "请先上传并解析母版简历" }, { status: 409 });

    const evidence = await loadEvidence(supabase, positionId);
    if (!evidence.length) return Response.json({ error: "请先生成证据地图，再生成定制简历" }, { status: 409 });
    const analysisContext = JSON.stringify(evidence);
    const ai = getAiConfiguration();
    const inputHash = await sha256(`${PROMPT_VERSION}\n${ai.provider}\n${ai.model}\n${resume.content_hash}\n${position.jd_text}\n${analysisContext}`);
    const current = await loadSuggestions(supabase, positionId);
    const { data: cachedRun } = await supabase.from("ai_runs").select("id,model,duration_ms")
      .eq("position_id", positionId).eq("task", "resume").eq("input_hash", inputHash).eq("status", "ready").maybeSingle();
    if (cachedRun && current.length && !body.force) return Response.json({ data: { suggestions: current, meta: { model: cachedRun.model, cached: true } } });
    if (cachedRun) await supabase.from("ai_runs").delete().eq("id", cachedRun.id);

    const { data: run, error: runError } = await supabase.from("ai_runs").insert({
      user_id: user.user.id, position_id: positionId, task: "resume", model: ai.model,
      prompt_version: PROMPT_VERSION, input_hash: inputHash, status: "processing",
    }).select("id").single();
    if (runError) throw runError;
    runId = run.id;

    const result = await runAnalysis({
      kind: "resume", category: positionCategorySchema.parse(position.category),
      jd: position.jd_text, resume: resume.parsed_text, analysisContext,
    });
    const validated = resumeSuggestionsSchema.parse(result.data);
    const suggestions = validated.suggestions.flatMap((item) => {
      const original = resume.parsed_text.includes(item.original)
        ? item.original
        : item.sourceQuotes.find((quote) => resume.parsed_text.includes(quote));
      return original ? [{ ...item, original }] : [];
    });
    if (!suggestions.length) throw new Error("模型没有返回可定位的简历原文");
    const { error: deleteError } = await supabase.from("resume_suggestions").delete().eq("position_id", positionId);
    if (deleteError) throw deleteError;
    if (suggestions.length) {
      const { error: insertError } = await supabase.from("resume_suggestions").insert(suggestions.map((item) => ({
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
    }).eq("id", runId);
    return Response.json({ data: { suggestions: await loadSuggestions(supabase, positionId), meta: { model: result.model, provider: result.provider, durationMs } } });
  } catch (error) {
    const message = error instanceof Error ? error.message : "定制简历生成失败";
    try {
      const supabase = createUserSupabase(tokenFrom(request));
      if (runId) await supabase.from("ai_runs").update({ status: "failed", duration_ms: Date.now() - startedAt, error_code: message.slice(0, 240) }).eq("id", runId);
    } catch { void 0; }
    return Response.json({ error: message.includes("引用") ? "定制建议的原文引用未通过校验，请重新生成" : message }, { status: message.includes("aborted") ? 504 : 502 });
  }
}
