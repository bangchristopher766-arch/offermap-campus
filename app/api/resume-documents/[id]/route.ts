import { createUserSupabase } from "@/lib/supabase";
import { z } from "zod";

const updateSchema = z.object({
  name: z.string().trim().min(1).max(80).optional(),
  direction: z.string().trim().max(80).optional(),
  isDefault: z.boolean().optional(),
  archived: z.boolean().optional(),
});

const tokenFrom = (request: Request) => request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  const input = updateSchema.safeParse(await request.json().catch(() => null));
  if (!input.success) return Response.json({ error: "简历信息无效" }, { status: 400 });
  try {
    const supabase = createUserSupabase(tokenFrom(request));
    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) return Response.json({ error: "请先登录" }, { status: 401 });
    const { id } = await context.params;
    if (input.data.isDefault) await supabase.from("resume_documents").update({ is_default: false }).eq("user_id", userData.user.id);
    const values = {
      ...(input.data.name !== undefined ? { name: input.data.name } : {}),
      ...(input.data.direction !== undefined ? { direction: input.data.direction } : {}),
      ...(input.data.isDefault !== undefined ? { is_default: input.data.isDefault } : {}),
      ...(input.data.archived !== undefined ? { archived_at: input.data.archived ? new Date().toISOString() : null } : {}),
      updated_at: new Date().toISOString(),
    };
    const { data, error } = await supabase.from("resume_documents").update(values).eq("id", id).select().single();
    if (error) throw error;
    return Response.json({ data });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "保存简历信息失败" }, { status: 503 });
  }
}
