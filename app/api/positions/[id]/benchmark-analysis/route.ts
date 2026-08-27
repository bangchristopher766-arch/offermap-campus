import { runBenchmarkEvidenceAnalysis } from "@/lib/analysis-engine";
import { getAiConfiguration, isAiConfigured } from "@/lib/ai-client";
import { positionCategorySchema } from "@/lib/analysis-schema";
import { createUserSupabase } from "@/lib/supabase";

export const runtime = "edge";
const PROMPT_VERSION = "benchmark-evidence-v2-fixed-requirements";
const tokenFrom = (request: Request) => request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");

function normalize(value: string) {
  return value.toLowerCase().replace(/[\s\p{P}\p{S}]+/gu, "");
}

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const startedAt = Date.now();
  let runId = "";
  try {
    if (!isAiConfigured()) return Response.json({ error: "AI 服务尚未配置" }, { status: 503 });
    const supabase = createUserSupabase(tokenFrom(request));
    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) return Response.json({ error: "请先登录" }, { status: 401 });
    const { id } = await context.params;
    const { data: position } = await supabase.from("positions").select("id,title,category,industry,seniority,product_type,position_revision,resume_id,role_profile_id").eq("id", id).maybeSingle();
    if (!position) return Response.json({ error: "岗位不存在或无权访问" }, { status: 404 });
    const { data: binding } = await supabase.from("position_resume_bindings").select("resume_version_id").eq("position_id", id).eq("status", "current").maybeSingle();
    const resumeId = binding?.resume_version_id ?? position.resume_id;
    if (!resumeId) return Response.json({ error: "请先为岗位选择一份分析简历", code: "RESUME_REQUIRED" }, { status: 409 });
    const { data: resume } = await supabase.from("resumes").select("id,name,version,document_version,parsed_text,structured_content,content_hash").eq("id", resumeId).maybeSingle();
    if (!resume?.parsed_text || resume.parsed_text.length < 80) return Response.json({ error: "所选简历尚未完成解析" }, { status: 409 });

    let profileId = position.role_profile_id as string | null;
    if (!profileId) {
      const { data: taxonomies } = await supabase.from("role_taxonomies").select("id,canonical_title,role_family,aliases").eq("status", "active");
      const title = normalize(position.title);
      const ranked = (taxonomies ?? []).map((role) => {
        const aliases = Array.isArray(role.aliases) ? role.aliases.filter((item): item is string => typeof item === "string") : [];
        const labels = [role.canonical_title, ...aliases].map(normalize);
        return { role, score: labels.some((label) => title.includes(label)) ? 100 : role.role_family === position.category ? 50 : 0 };
      }).sort((a, b) => b.score - a.score);
      const role = ranked[0]?.role;
      if (!role) return Response.json({ error: "暂时没有适合该岗位的通用能力画像" }, { status: 404 });
      const { data: profile } = await supabase.from("role_profiles").select("id").eq("role_taxonomy_id", role.id).in("reviewed_status", ["curated_seed","reviewed"]).order("version", { ascending: false }).limit(1).maybeSingle();
      if (!profile) return Response.json({ error: "暂时没有适合该岗位的通用能力画像" }, { status: 404 });
      profileId = profile.id;
      await supabase.from("positions").update({ canonical_role_id: role.id, role_profile_id: profile.id, updated_at: new Date().toISOString() }).eq("id", id);
    }
    const { data: profile, error: profileError } = await supabase.from("role_profiles")
      .select("id,version,industry,seniority,product_type,generated_at,source_summary,role_taxonomies(id,canonical_title,role_family),role_requirements(id,label,description,category,prevalence_level,confidence,source_count,display_order)")
      .eq("id", profileId).maybeSingle();
    if (profileError) throw profileError;
    if (!profile) return Response.json({ error: "岗位通用能力画像不存在" }, { status: 404 });
    const requirements = (Array.isArray(profile.role_requirements) ? profile.role_requirements : []).sort((a, b) => a.display_order - b.display_order);
    if (!requirements.length) return Response.json({ error: "岗位画像尚未配置能力要求" }, { status: 409 });

    const config = getAiConfiguration();
    const inputHash = `${position.position_revision}:${resume.content_hash}:${profile.id}:${profile.version}:${PROMPT_VERSION}`;
    const { data: active } = await supabase.from("ai_runs").select("id,task,created_at").eq("position_id", id).eq("status", "processing").order("created_at", { ascending: false }).limit(1).maybeSingle();
    if (active) return Response.json({ data: { inProgress: true, activeRun: { id: active.id, task: active.task, kind: active.task === "benchmark" ? "benchmark" : "evidence", phase: null, startedAt: active.created_at, stalled: false } } }, { status: 202 });
    const { data: cached } = await supabase.from("ai_runs").select("id").eq("position_id", id).eq("task", "benchmark").eq("input_hash", inputHash).eq("status", "ready").maybeSingle();
    if (cached) await supabase.from("ai_runs").delete().eq("id", cached.id);
    const { data: run, error: runError } = await supabase.from("ai_runs").insert({
      user_id: userData.user.id,
      position_id: id,
      task: "benchmark",
      model: config.model,
      prompt_version: PROMPT_VERSION,
      input_hash: inputHash,
      status: "processing",
      position_revision: position.position_revision,
      resume_version_id: resume.id,
      role_profile_id: profile.id,
      role_profile_version: profile.version,
    }).select("id").single();
    if (runError) throw runError;
    runId = run.id;
    const result = await runBenchmarkEvidenceAnalysis({
      category: positionCategorySchema.parse(position.category),
      resume: resume.parsed_text,
      structuredResume: resume.structured_content,
      requirements: requirements.map((item) => ({
        id: item.id,
        label: item.label,
        description: item.description,
        prevalenceLevel: item.prevalence_level,
      })),
    });
    const evidenceResult = result.data;
    await supabase.from("benchmark_evidence").delete().eq("position_id", id).eq("resume_version_id", resume.id).eq("role_profile_id", profile.id);
    const resultById = new Map(evidenceResult.requirements.map((item) => [item.id, item]));
    const rows = requirements.map((requirement) => {
      const item = resultById.get(requirement.id);
      const quotes = item?.resumeQuotes ?? [];
      return {
        user_id: userData.user.id,
        position_id: id,
        resume_version_id: resume.id,
        role_profile_id: profile.id,
        role_profile_version: profile.version,
        role_requirement_id: requirement.id,
        status: item ? item.status : "uncertain",
        resume_quotes: quotes,
        rationale: item?.rationale ?? "模型未能稳定完成这一项判断，已降级为待确认。",
        missing_information: item?.missingInformation ?? "",
        action: item?.action ?? "补充可定位的真实经历后重新分析。",
        confidence: requirement.confidence,
        citation_verified: quotes.every((quote: string) => resume.parsed_text.includes(quote)),
      };
    });
    const { data: evidence, error: evidenceError } = await supabase.from("benchmark_evidence").insert(rows)
      .select("id,status,resume_quotes,rationale,missing_information,action,confidence,citation_verified,user_confirmed,ignored_at,role_requirements(id,label,description,category,prevalence_level,source_count,display_order)");
    if (evidenceError) throw evidenceError;
    await supabase.from("ai_runs").update({ status: "ready", model: result.model, duration_ms: Date.now() - startedAt, input_tokens: result.usage?.prompt_tokens ?? null, output_tokens: result.usage?.completion_tokens ?? null, completed_at: new Date().toISOString(), result_snapshot: evidenceResult }).eq("id", runId);
    const { error: snapshotError } = await supabase.from("analysis_snapshots").insert({
      user_id: userData.user.id,
      position_id: id,
      analysis_type: "benchmark",
      position_revision: position.position_revision,
      resume_version_id: resume.id,
      role_profile_id: profile.id,
      role_profile_version: profile.version,
      prompt_version: PROMPT_VERSION,
      model: result.model,
      result_json: evidenceResult,
    });
    if (snapshotError) throw snapshotError;
    return Response.json({ data: { profile, evidence: evidence ?? [], resume: { id: resume.id, name: resume.name, version: resume.document_version ?? resume.version }, meta: { model: result.model, provider: result.provider, durationMs: Date.now() - startedAt } } });
  } catch (error) {
    const message = error instanceof Error ? error.message : "岗位能力分析失败";
    try {
      if (runId) {
        const supabase = createUserSupabase(tokenFrom(request));
        await supabase.from("ai_runs").update({ status: "failed", duration_ms: Date.now() - startedAt, error_code: message.slice(0, 240), completed_at: new Date().toISOString() }).eq("id", runId);
      }
    } catch { void 0; }
    return Response.json({ error: message }, { status: 502 });
  }
}
