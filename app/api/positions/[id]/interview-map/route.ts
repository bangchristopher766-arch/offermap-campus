import { interviewMapSchema, positionCategorySchema } from "@/lib/analysis-schema";
import { getAiConfiguration, isAiConfigured } from "@/lib/ai-client";
import { runAnalysis } from "@/lib/analysis-engine";
import { createUserSupabase } from "@/lib/supabase";

export const runtime = "edge";
const PROMPT_VERSION = "interview-v1-evidence-grounded";

function tokenFrom(request: Request) {
  return request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
}

async function sha256(value: string) {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return Array.from(new Uint8Array(digest)).map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

async function loadEvidence(supabase: ReturnType<typeof createUserSupabase>, positionId: string) {
  const { data, error } = await supabase.from("requirements")
    .select("id,kind,requirement,jd_quote,importance,requirement_evidence(id,status,rationale,action,evidence_items(id,resume_quote))")
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
    if (!evidence.length) return Response.json({ error: "请先生成证据地图，再生成面试追问地图" }, { status: 409 });
    const analysisContext = JSON.stringify(evidence);
    const ai = getAiConfiguration();
    const inputHash = await sha256(`${PROMPT_VERSION}\n${ai.provider}\n${ai.model}\n${resume.content_hash}\n${position.jd_text}\n${analysisContext}`);
    const current = await loadQuestions(supabase, positionId);
    const { data: cachedRun } = await supabase.from("ai_runs").select("id,model,duration_ms")
      .eq("position_id", positionId).eq("task", "interview").eq("input_hash", inputHash).eq("status", "ready").maybeSingle();
    if (cachedRun && current.length && !body.force) return Response.json({ data: { questions: current, meta: { model: cachedRun.model, cached: true } } });
    if (cachedRun) await supabase.from("ai_runs").delete().eq("id", cachedRun.id);

    const { data: run, error: runError } = await supabase.from("ai_runs").insert({
      user_id: user.user.id, position_id: positionId, task: "interview", model: ai.model,
      prompt_version: PROMPT_VERSION, input_hash: inputHash, status: "processing",
    }).select("id").single();
    if (runError) throw runError;
    runId = run.id;

    const result = await runAnalysis({
      kind: "interview", category: positionCategorySchema.parse(position.category),
      jd: position.jd_text, resume: resume.parsed_text, analysisContext,
    });
    const validated = interviewMapSchema.parse(result.data);
    const validRequirementIds = new Set(evidence.map((item) => item.id));
    const validEvidenceIds = new Set(evidence.flatMap((item) => {
      const relations = Array.isArray(item.requirement_evidence) ? item.requirement_evidence : item.requirement_evidence ? [item.requirement_evidence] : [];
      return relations.flatMap((relation) => {
        const sources = Array.isArray(relation.evidence_items) ? relation.evidence_items : relation.evidence_items ? [relation.evidence_items] : [];
        return sources.map((source) => source.id);
      });
    }));

    const { error: deleteError } = await supabase.from("interview_questions").delete().eq("position_id", positionId);
    if (deleteError) throw deleteError;
    let insertedQuestions = 0;
    for (const item of validated.questions) {
      let requirementIds = item.requirementIds.filter((id) => validRequirementIds.has(id));
      if (!requirementIds.length) {
        requirementIds = evidence.filter((requirement) => item.jdQuotes.includes(requirement.jd_quote)).map((requirement) => requirement.id).slice(0, 4);
      }
      if (!requirementIds.length) continue;
      let evidenceIds = item.evidenceIds.filter((id) => validEvidenceIds.has(id));
      if (!evidenceIds.length && item.resumeQuotes.length) {
        evidenceIds = evidence.flatMap((requirement) => {
          const relations = Array.isArray(requirement.requirement_evidence) ? requirement.requirement_evidence : requirement.requirement_evidence ? [requirement.requirement_evidence] : [];
          return relations.flatMap((relation) => {
            const sources = Array.isArray(relation.evidence_items) ? relation.evidence_items : relation.evidence_items ? [relation.evidence_items] : [];
            return sources.filter((source) => item.resumeQuotes.includes(source.resume_quote)).map((source) => source.id);
          });
        }).slice(0, 6);
      }
      const { data: question, error: questionError } = await supabase.from("interview_questions").insert({
        user_id: user.user.id,
        position_id: positionId,
        priority: item.priority,
        priority_reason: item.priorityReason,
        main_question: item.mainQuestion,
        intent: item.intent,
        answer_structure: item.answerStructure,
        missing_information: item.missingInformation,
        risk: item.risk,
        source_requirement_ids: requirementIds,
        source_evidence_ids: evidenceIds,
      }).select("id").single();
      if (questionError) throw questionError;
      const { error: followupError } = await supabase.from("question_followups").insert(item.followups.map((followup, index) => ({
        user_id: user.user.id,
        question_id: question.id,
        sort_order: index + 1,
        question: followup,
      })));
      if (followupError) throw followupError;
      insertedQuestions += 1;
    }
    if (!insertedQuestions) throw new Error("模型没有返回可关联到证据地图的面试问题");

    const durationMs = Date.now() - startedAt;
    await supabase.from("ai_runs").update({
      status: "ready", model: result.model, duration_ms: durationMs,
      input_tokens: result.usage?.prompt_tokens ?? null, output_tokens: result.usage?.completion_tokens ?? null,
    }).eq("id", runId);
    return Response.json({ data: { questions: await loadQuestions(supabase, positionId), meta: { model: result.model, provider: result.provider, durationMs } } });
  } catch (error) {
    const message = error instanceof Error ? error.message : "面试追问地图生成失败";
    try {
      const supabase = createUserSupabase(tokenFrom(request));
      if (runId) await supabase.from("ai_runs").update({ status: "failed", duration_ms: Date.now() - startedAt, error_code: message.slice(0, 240) }).eq("id", runId);
    } catch { void 0; }
    return Response.json({ error: message.includes("引用") ? "面试问题的原文引用未通过校验，请重新生成" : message }, { status: message.includes("aborted") ? 504 : 502 });
  }
}
