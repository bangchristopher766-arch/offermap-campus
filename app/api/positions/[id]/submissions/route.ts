import { createUserSupabase } from "@/lib/supabase";
import { z } from "zod";

const inputSchema = z.object({
  resumeVersionId: z.string().uuid(),
  submittedAt: z.string().datetime().optional(),
  channel: z.string().trim().max(120).optional().default(""),
  note: z.string().trim().max(1200).optional().default(""),
});
const tokenFrom = (request: Request) => request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");

async function owned(request: Request, positionId: string) {
  const supabase = createUserSupabase(tokenFrom(request));
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) return { error: Response.json({ error: "请先登录" }, { status: 401 }) } as const;
  const { data: position } = await supabase.from("positions").select("id").eq("id", positionId).maybeSingle();
  if (!position) return { error: Response.json({ error: "岗位不存在或无权访问" }, { status: 404 }) } as const;
  return { supabase, user: userData.user };
}

export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    const result = await owned(request, id);
    if ("error" in result) return result.error;
    const { data, error } = await result.supabase.from("application_submissions")
      .select("id,resume_version_id,submitted_at,channel,note,created_at,resumes(id,name,version,document_version,resume_documents:resume_documents!resumes_resume_document_id_fkey(name,direction))")
      .eq("position_id", id).order("submitted_at", { ascending: false });
    if (error) throw error;
    return Response.json({ data: data ?? [] });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "读取投递记录失败" }, { status: 503 });
  }
}

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const input = inputSchema.safeParse(await request.json().catch(() => null));
  if (!input.success) return Response.json({ error: "投递信息无效" }, { status: 400 });
  try {
    const { id } = await context.params;
    const result = await owned(request, id);
    if ("error" in result) return result.error;
    const { data: resume } = await result.supabase.from("resumes").select("id").eq("id", input.data.resumeVersionId).maybeSingle();
    if (!resume) return Response.json({ error: "简历版本不存在或无权使用" }, { status: 404 });
    const { data, error } = await result.supabase.from("application_submissions").insert({
      user_id: result.user.id,
      position_id: id,
      resume_version_id: resume.id,
      submitted_at: input.data.submittedAt ?? new Date().toISOString(),
      channel: input.data.channel,
      note: input.data.note,
    }).select().single();
    if (error) throw error;
    return Response.json({ data }, { status: 201 });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "保存投递版本失败" }, { status: 503 });
  }
}
