import { createUserSupabase } from "@/lib/supabase";
import { positionResearchSchema, researchPosition, webResearchConfiguration } from "@/lib/web-research";

export const runtime = "edge";
const PROMPT_VERSION = "position-research-v1-cited";

function tokenFrom(request: Request) {
  return request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
}

async function sha256(value: string) {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return Array.from(new Uint8Array(digest)).map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

function companyNameOf(value: unknown) {
  if (Array.isArray(value)) return String((value[0] as { name?: string } | undefined)?.name ?? "目标公司");
  return String((value as { name?: string } | null)?.name ?? "目标公司");
}

async function loadPosition(supabase: ReturnType<typeof createUserSupabase>, id: string) {
  const { data, error } = await supabase.from("positions")
    .select("id,title,category,department,location,jd_text,position_revision,companies(name)")
    .eq("id", id).maybeSingle();
  if (error) throw error;
  return data;
}

async function loadLatestResearch(supabase: ReturnType<typeof createUserSupabase>, positionId: string) {
  const { data, error } = await supabase.from("ai_runs")
    .select("id,model,prompt_version,input_hash,duration_ms,result_snapshot,created_at,completed_at")
    .eq("position_id", positionId).eq("task", "research").eq("status", "ready")
    .order("created_at", { ascending: false }).limit(1).maybeSingle();
  if (error) throw error;
  if (!data?.result_snapshot) return null;
  const parsed = positionResearchSchema.safeParse(data.result_snapshot);
  return parsed.success ? { ...data, result_snapshot: parsed.data } : null;
}

export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const supabase = createUserSupabase(tokenFrom(request));
    const { data: user } = await supabase.auth.getUser();
    if (!user.user) return Response.json({ error: "请先登录" }, { status: 401 });
    const { id } = await context.params;
    const position = await loadPosition(supabase, id);
    if (!position) return Response.json({ error: "岗位不存在或你无权查看" }, { status: 404 });
    const latest = await loadLatestResearch(supabase, id);
    return Response.json({ data: {
      research: latest?.result_snapshot ?? null,
      stale: Boolean(latest && latest.result_snapshot.positionRevision !== (position.position_revision ?? 1)),
      configured: webResearchConfiguration().configured,
      meta: latest ? { model: latest.model, durationMs: latest.duration_ms, completedAt: latest.completed_at } : null,
    } });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "岗位情报读取失败" }, { status: 503 });
  }
}

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const startedAt = Date.now();
  let runId = "";
  try {
    const configuration = webResearchConfiguration();
    if (!configuration.configured) return Response.json({ error: "联网搜索或 AI 服务尚未配置" }, { status: 503 });
    const supabase = createUserSupabase(tokenFrom(request));
    const { data: user } = await supabase.auth.getUser();
    if (!user.user) return Response.json({ error: "请先登录" }, { status: 401 });
    const { id } = await context.params;
    const body = await request.json().catch(() => ({})) as { force?: boolean };
    const position = await loadPosition(supabase, id);
    if (!position) return Response.json({ error: "岗位不存在或你无权调研" }, { status: 404 });
    const company = companyNameOf(position.companies);
    const inputHash = await sha256(`${PROMPT_VERSION}\n${company}\n${position.title}\n${position.category}\n${position.department}\n${position.location}\n${position.jd_text}\n${position.position_revision ?? 1}`);
    const { data: cached } = await supabase.from("ai_runs")
      .select("id,model,duration_ms,result_snapshot,completed_at")
      .eq("position_id", id).eq("task", "research").eq("input_hash", inputHash).eq("status", "ready")
      .maybeSingle();
    const cachedResearch = cached?.result_snapshot ? positionResearchSchema.safeParse(cached.result_snapshot) : null;
    if (cached && cachedResearch?.success && !body.force && new Date(cachedResearch.data.expiresAt).getTime() > Date.now()) {
      return Response.json({ data: { research: cachedResearch.data, stale: false, meta: { cached: true, model: cached.model, durationMs: cached.duration_ms, completedAt: cached.completed_at } } });
    }
    const { data: active } = await supabase.from("ai_runs").select("id,created_at")
      .eq("position_id", id).eq("task", "research").eq("status", "processing")
      .order("created_at", { ascending: false }).limit(1).maybeSingle();
    if (active && Date.now() - new Date(active.created_at).getTime() < 2 * 60 * 1_000) {
      return Response.json({ data: { inProgress: true } }, { status: 202 });
    }
    if (cached?.id) await supabase.from("ai_runs").delete().eq("id", cached.id);
    const { data: run, error: runError } = await supabase.from("ai_runs").insert({
      user_id: user.user.id,
      position_id: id,
      task: "research",
      model: `tavily + ${configuration.model}`,
      prompt_version: PROMPT_VERSION,
      input_hash: inputHash,
      status: "processing",
      position_revision: position.position_revision ?? 1,
    }).select("id").single();
    if (runError) throw runError;
    runId = run.id;
    const result = await researchPosition({
      company,
      title: position.title,
      category: position.category,
      department: position.department,
      location: position.location,
      jd: position.jd_text,
      positionRevision: position.position_revision ?? 1,
    });
    const durationMs = Date.now() - startedAt;
    const { error: updateError } = await supabase.from("ai_runs").update({
      status: "ready",
      model: `tavily + ${result.model}`,
      duration_ms: durationMs,
      input_tokens: result.usage?.prompt_tokens ?? null,
      output_tokens: result.usage?.completion_tokens ?? null,
      result_snapshot: result.data,
      completed_at: new Date().toISOString(),
    }).eq("id", runId);
    if (updateError) throw updateError;
    return Response.json({ data: { research: result.data, stale: false, meta: { model: result.model, provider: result.provider, durationMs } } });
  } catch (error) {
    if (runId) {
      try {
        await createUserSupabase(tokenFrom(request)).from("ai_runs").update({ status: "failed", duration_ms: Date.now() - startedAt, error_code: error instanceof Error ? error.message.slice(0, 400) : "RESEARCH_FAILED", completed_at: new Date().toISOString() }).eq("id", runId);
      } catch { void 0; }
    }
    return Response.json({ error: error instanceof Error ? error.message : "岗位情报生成失败" }, { status: 503 });
  }
}
