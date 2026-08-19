import { analysisRequestSchema } from "@/lib/analysis-schema";
import { isAiConfigured } from "@/lib/ai-client";
import { runAnalysis } from "@/lib/analysis-engine";
import { createUserSupabase } from "@/lib/supabase";

export const runtime = "edge";

export async function POST(request: Request) {
  const token = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  const supabase = createUserSupabase(token);
  const { data: user } = await supabase.auth.getUser();
  if (!user.user) return Response.json({ error: "请先登录" }, { status: 401 });
  const parsed = analysisRequestSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: "输入不完整", details: parsed.error.flatten() }, { status: 400 });

  if (!isAiConfigured()) return Response.json({ error: "AI 服务尚未配置", code: "DEMO_MODE" }, { status: 503 });

  const { kind, category, jd, resume } = parsed.data;
  const startedAt = Date.now();

  try {
    const result = await runAnalysis({ kind, category, jd, resume });
    return Response.json({ data: result.data, meta: { durationMs: Date.now() - startedAt, model: result.model, provider: result.provider, usage: result.usage } });
  } catch (error) {
    const message = error instanceof Error ? error.message : "分析失败";
    return Response.json({ error: message }, { status: message.includes("aborted") ? 504 : 502 });
  }
}
