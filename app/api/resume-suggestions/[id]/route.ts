import { createUserSupabase } from "@/lib/supabase";

export const runtime = "edge";

function tokenFrom(request: Request) {
  return request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
}

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const supabase = createUserSupabase(tokenFrom(request));
    const { data: user } = await supabase.auth.getUser();
    if (!user.user) return Response.json({ error: "请先登录" }, { status: 401 });
    const { id } = await context.params;
    const body = await request.json().catch(() => ({})) as { accepted?: boolean; editedText?: string | null };
    const updates: { accepted?: boolean; edited_text?: string | null } = {};
    if (typeof body.accepted === "boolean") updates.accepted = body.accepted;
    if (typeof body.editedText === "string" || body.editedText === null) updates.edited_text = body.editedText;
    if (!Object.keys(updates).length) return Response.json({ error: "没有可保存的修改" }, { status: 400 });
    const { data, error } = await supabase.from("resume_suggestions").update(updates).eq("id", id)
      .select("id,action,original_text,suggested_text,reason,risk,accepted,edited_text,created_at").maybeSingle();
    if (error) throw error;
    if (!data) return Response.json({ error: "建议不存在或你无权修改" }, { status: 404 });
    return Response.json({ data });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "建议保存失败" }, { status: 503 });
  }
}
