import { createUserSupabase } from "@/lib/supabase";
import { z } from "zod";

const updateSchema = z.object({ name: z.string().trim().min(1).max(80) });
const tokenFrom = (request: Request) => request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  const input = updateSchema.safeParse(await request.json().catch(() => null));
  if (!input.success) return Response.json({ error: "公司名称无效" }, { status: 400 });
  try {
    const supabase = createUserSupabase(tokenFrom(request));
    const { id } = await context.params;
    const { data, error } = await supabase.from("companies").update(input.data).eq("id", id).select().single();
    if (error) throw error;
    return Response.json({ data });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "更新失败" }, { status: 503 });
  }
}

export async function DELETE(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const supabase = createUserSupabase(tokenFrom(request));
    const { id } = await context.params;
    const { count } = await supabase.from("positions").select("id", { count: "exact", head: true }).eq("company_id", id);
    const { error } = await supabase.from("companies").delete().eq("id", id);
    if (error) throw error;
    return Response.json({ deleted: true, deletedPositions: count ?? 0 });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "删除失败" }, { status: 503 });
  }
}
