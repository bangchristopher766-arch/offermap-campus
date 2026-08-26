import { createUserSupabase } from "@/lib/supabase";
import { z } from "zod";

const inputSchema = z.object({
  resumeVersionId: z.string().uuid(),
  reason: z.enum(["user_selected","system_recommended"]).optional().default("user_selected"),
});
const tokenFrom = (request: Request) => request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");

export async function PUT(request: Request, context: { params: Promise<{ id: string }> }) {
  const input = inputSchema.safeParse(await request.json().catch(() => null));
  if (!input.success) return Response.json({ error: "请选择有效的简历版本" }, { status: 400 });
  try {
    const supabase = createUserSupabase(tokenFrom(request));
    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) return Response.json({ error: "请先登录" }, { status: 401 });
    const { id } = await context.params;
    const [{ data: position }, { data: resume }] = await Promise.all([
      supabase.from("positions").select("id,resume_id").eq("id", id).maybeSingle(),
      supabase.from("resumes").select("id,document_version,version").eq("id", input.data.resumeVersionId).maybeSingle(),
    ]);
    if (!position) return Response.json({ error: "岗位不存在或无权访问" }, { status: 404 });
    if (!resume) return Response.json({ error: "简历版本不存在或无权使用" }, { status: 404 });
    const now = new Date().toISOString();
    const { data: previous } = await supabase.from("position_resume_bindings").select("id,resume_version_id").eq("position_id", id).eq("status", "current").maybeSingle();
    if (previous?.resume_version_id === resume.id) return Response.json({ data: { ...previous, unchanged: true, previousAnalysisPreserved: true } });
    if (previous) {
      const { error: historyError } = await supabase.from("position_resume_bindings").update({ status: "history", ended_at: now }).eq("id", previous.id);
      if (historyError) throw historyError;
    }
    const { data, error } = await supabase.from("position_resume_bindings").insert({
      user_id: userData.user.id,
      position_id: id,
      resume_version_id: resume.id,
      status: "current",
      selected_by: input.data.reason === "system_recommended" ? "system_recommended" : "user",
      selected_at: now,
    }).select().single();
    if (error) throw error;
    const { error: positionUpdateError } = await supabase.from("positions").update({ resume_id: resume.id, analysis_status: "stale", updated_at: now }).eq("id", id);
    if (positionUpdateError) throw positionUpdateError;
    return Response.json({ data: { ...data, resumeVersion: resume.document_version ?? resume.version, previousAnalysisPreserved: true, status: "ready_to_analyze" } });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "更换分析简历失败" }, { status: 503 });
  }
}
