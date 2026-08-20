import { evidenceMapSchema, positionCategorySchema } from "@/lib/analysis-schema";
import { getAiConfiguration, isAiConfigured } from "@/lib/ai-client";
import { runAnalysis } from "@/lib/analysis-engine";
import { claimAiRun, loadActiveAiRun } from "@/lib/ai-run-guard";
import { createUserSupabase } from "@/lib/supabase";

export const runtime = "edge";
const PROMPT_VERSION = "evidence-v4-semantic-multi-evidence";

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

async function loadResumeSummary(supabase: ReturnType<typeof createUserSupabase>, resumeId?: string | null) {
  let query = supabase.from("resumes").select("id,name,version,structured_content");
  query = resumeId ? query.eq("id", resumeId) : query.order("version", { ascending: false }).limit(1);
  const { data, error } = await query.maybeSingle();
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

async function loadSuggestions(supabase: ReturnType<typeof createUserSupabase>, positionId: string) {
  const { data, error } = await supabase.from("resume_suggestions")
    .select("id,action,original_text,suggested_text,reason,risk,accepted,edited_text,created_at")
    .eq("position_id", positionId).order("created_at");
  if (error) throw error;
  return data ?? [];
}

async function loadQuestions(supabase: ReturnType<typeof createUserSupabase>, positionId: string) {
  const { data, error } = await supabase.from("interview_questions")
    .select("id,priority,priority_reason,main_question,intent,answer_structure,missing_information,risk,source_requirement_ids,source_evidence_ids,created_at,question_followups(id,sort_order,question)")
    .eq("position_id", positionId).order("created_at");
  if (error) throw error;
  return (data ?? []).map((item) => ({
    ...item,
    question_followups: Array.isArray(item.question_followups)
      ? [...item.question_followups].sort((a, b) => a.sort_order - b.sort_order)
      : item.question_followups,
  }));
}

type SavedPreparation = {
  kind?: string;
  version?: number;
  status?: "not_started" | "drafting" | "ready";
  answerDraft?: string;
  realExample?: string;
  keyMetrics?: string;
  notes?: string;
  updatedAt?: string;
};

async function enrichQuestionPreparations(supabase: ReturnType<typeof createUserSupabase>, questions: Awaited<ReturnType<typeof loadQuestions>>) {
  if (!questions.length) return questions;
  const ids = questions.map((question) => question.id);
  const { data, error } = await supabase.from("feedback")
    .select("id,target_id,comment,created_at").eq("target_type", "interview_question")
    .in("target_id", ids).order("created_at", { ascending: false });
  if (error) throw error;
  const latest = new Map<string, SavedPreparation>();
  for (const row of data ?? []) {
    if (!row.target_id || latest.has(row.target_id)) continue;
    try {
      const parsed = JSON.parse(row.comment) as SavedPreparation;
      if (parsed.kind === "question-preparation" && parsed.version === 1) latest.set(row.target_id, parsed);
    } catch { void 0; }
  }
  return questions.map((question) => ({ ...question, preparation: latest.get(question.id) ?? null }));
}

function normalizeText(value: string) {
  return value.toLowerCase().replace(/[\s\p{P}\p{S}]+/gu, "");
}

function enrichSuggestions(suggestions: Awaited<ReturnType<typeof loadSuggestions>>, evidence: Awaited<ReturnType<typeof loadEvidence>>) {
  return suggestions.map((suggestion) => ({
    ...suggestion,
    jd_quotes: evidence.filter((requirement) => {
      const relations = Array.isArray(requirement.requirement_evidence)
        ? requirement.requirement_evidence
        : requirement.requirement_evidence ? [requirement.requirement_evidence] : [];
      return relations.some((relation) => {
        const sources = Array.isArray(relation.evidence_items) ? relation.evidence_items : relation.evidence_items ? [relation.evidence_items] : [];
        return sources.some((source) => normalizeText(source.resume_quote) === normalizeText(suggestion.original_text));
      });
    }).map((requirement) => requirement.jd_quote).filter((quote, index, all) => all.indexOf(quote) === index).slice(0, 2),
  }));
}

export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const supabase = createUserSupabase(tokenFrom(request));
    const { data: user } = await supabase.auth.getUser();
    if (!user.user) return Response.json({ error: "请先登录" }, { status: 401 });
    const { id } = await context.params;
    const position = await loadPosition(supabase, id);
    if (!position) return Response.json({ error: "岗位不存在或你无权查看" }, { status: 404 });
    const [evidence, suggestions, rawQuestions, completedRuns, resume, activeRun, historyRuns] = await Promise.all([
      loadEvidence(supabase, id), loadSuggestions(supabase, id), loadQuestions(supabase, id),
      supabase.from("ai_runs").select("task,prompt_version").eq("position_id", id).eq("status", "ready").in("task", ["resume-core", "interview-core"]),
      loadResumeSummary(supabase, position.resume_id),
      loadActiveAiRun(supabase, id),
      supabase.from("ai_runs").select("id,task,model,status,duration_ms,input_tokens,output_tokens,error_code,created_at").eq("position_id", id).order("created_at", { ascending: false }).limit(20),
    ]);
    const questions = await enrichQuestionPreparations(supabase, rawQuestions);
    const completedRows = completedRuns.data ?? [];
    // A ready core run is the durable completion signal. Do not gate visibility on
    // a hard-coded prompt version: prompt upgrades must not hide persisted results.
    const resumeCompleted = completedRows.some((run) => run.task === "resume-core");
    const interviewCompleted = completedRows.some((run) => run.task === "interview-core");
    return Response.json({ data: { position, resume, evidence, suggestions: resumeCompleted ? enrichSuggestions(suggestions, evidence) : [], questions, meta: { resumeCompleted, interviewCompleted, activeRun, history: historyRuns.data ?? [] } } });
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

    let resumeQuery = supabase.from("resumes").select("id,name,version,parsed_text,structured_content,content_hash");
    resumeQuery = position.resume_id ? resumeQuery.eq("id", position.resume_id) : resumeQuery.order("version", { ascending: false }).limit(1);
    const { data: resume, error: resumeError } = await resumeQuery.maybeSingle();
    if (resumeError) throw resumeError;
    if (!resume?.parsed_text || resume.parsed_text.trim().length < 80) return Response.json({ error: "请先上传并成功解析一份母版简历", code: "RESUME_REQUIRED" }, { status: 409 });

    const category = positionCategorySchema.parse(position.category);
    const aiConfiguration = getAiConfiguration();
    const inputHash = await sha256(`${PROMPT_VERSION}\n${aiConfiguration.provider}\n${aiConfiguration.model}\n${resume.content_hash}\n${resume.parsed_text}\n${position.jd_text}`);
    const { data: cachedRun } = await supabase.from("ai_runs").select("id,model,duration_ms").eq("position_id", positionId).eq("task", "evidence").eq("input_hash", inputHash).eq("status", "ready").maybeSingle();
    const currentEvidence = await loadEvidence(supabase, positionId);
    if (cachedRun && currentEvidence.length && !body.force) {
      return Response.json({ data: { position, evidence: currentEvidence, meta: { model: cachedRun.model, durationMs: cachedRun.duration_ms, cached: true } } });
    }
    if (cachedRun && (body.force || !currentEvidence.length)) await supabase.from("ai_runs").delete().eq("id", cachedRun.id);
    const claim = await claimAiRun({ supabase, userId: user.user.id, positionId, task: "evidence", model: aiConfiguration.model, promptVersion: PROMPT_VERSION, inputHash });
    if (!claim.acquired) {
      if (claim.activeRun?.kind === "evidence") await supabase.from("positions").update({ analysis_status: "processing", updated_at: new Date().toISOString() }).eq("id", positionId);
      const refreshed = await loadPosition(supabase, positionId);
      return Response.json({ data: { position: refreshed, evidence: currentEvidence, meta: { activeRun: claim.activeRun, inProgress: Boolean(claim.activeRun), completed: Boolean("completed" in claim && claim.completed) } } }, { status: claim.activeRun ? 202 : 200 });
    }
    runId = claim.runId;
    await supabase.from("positions").update({ analysis_status: "processing", resume_id: resume.id, updated_at: new Date().toISOString() }).eq("id", positionId);

    const result = await runAnalysis({ kind: "evidence", category, jd: position.jd_text, resume: resume.parsed_text, structuredResume: resume.structured_content });
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
    const [{ error: suggestionDeleteError }, { error: questionDeleteError }] = await Promise.all([
      supabase.from("resume_suggestions").delete().eq("position_id", positionId),
      supabase.from("interview_questions").delete().eq("position_id", positionId),
    ]);
    if (suggestionDeleteError) throw suggestionDeleteError;
    if (questionDeleteError) throw questionDeleteError;
    await supabase.from("ai_runs").delete().eq("position_id", positionId).in("task", ["resume-core", "resume-expand", "interview-core", "interview-expand"]);
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

      const resumeQuotes = item.resumeQuotes.length ? item.resumeQuotes : item.resumeQuote ? [item.resumeQuote] : [];
      if (!resumeQuotes.length) {
        const { error: relationError } = await supabase.from("requirement_evidence").insert({
          user_id: user.user.id,
          requirement_id: requirement.id,
          evidence_id: null,
          status: item.status,
          rationale: item.rationale,
          action: item.action,
        });
        if (relationError) throw relationError;
      }

      for (const resumeQuote of resumeQuotes) {
        const { data: evidence, error: evidenceError } = await supabase.from("evidence_items").insert({
          user_id: user.user.id,
          resume_id: resume.id,
          title: item.requirement,
          resume_quote: resumeQuote,
        }).select("id").single();
        if (evidenceError) throw evidenceError;
        const { error: relationError } = await supabase.from("requirement_evidence").insert({
          user_id: user.user.id,
          requirement_id: requirement.id,
          evidence_id: evidence.id,
          status: item.status,
          rationale: item.rationale,
          action: item.action,
        });
        if (relationError) throw relationError;
      }
    }

    const durationMs = Date.now() - startedAt;
    await supabase.from("ai_runs").update({
      status: "ready",
      model: result.model,
      duration_ms: durationMs,
      input_tokens: result.usage?.prompt_tokens ?? null,
      output_tokens: result.usage?.completion_tokens ?? null,
      error_code: null,
    }).eq("id", runId);
    await supabase.from("positions").update({
      analysis_status: "ready",
      analyzed_resume_version: resume.version,
      updated_at: new Date().toISOString(),
    }).eq("id", positionId);

    const refreshed = await loadPosition(supabase, positionId);
    const evidence = await loadEvidence(supabase, positionId);
    const [suggestions, questions] = await Promise.all([loadSuggestions(supabase, positionId), loadQuestions(supabase, positionId)]);
    return Response.json({ data: { position: refreshed, evidence, suggestions, questions, meta: { model: result.model, provider: result.provider, durationMs } } });
  } catch (error) {
    const message = error instanceof Error ? error.message : "分析失败";
    try {
      const supabase = createUserSupabase(tokenFrom(request));
      if (runId) await supabase.from("ai_runs").update({ status: "failed", duration_ms: Date.now() - startedAt, error_code: message.slice(0, 240) }).eq("id", runId);
      if (positionId && runId) await supabase.from("positions").update({ analysis_status: "failed", updated_at: new Date().toISOString() }).eq("id", positionId);
    } catch { void 0; }
    return Response.json({ error: message.includes("引用") ? "模型引用未通过原文校验，请重新生成" : message }, { status: message.includes("aborted") ? 504 : 502 });
  }
}
