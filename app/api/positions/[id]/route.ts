import { positionCategorySchema } from "@/lib/analysis-schema";
import { createUserSupabase } from "@/lib/supabase";
import { z } from "zod";

const updateSchema = z.object({
  title: z.string().trim().min(1).max(120).optional(),
  category: positionCategorySchema.optional(),
  department: z.string().trim().max(120).optional(),
  location: z.string().trim().max(80).optional(),
  job_code: z.string().trim().max(80).optional(),
  jd_text: z.string().trim().min(80).max(30_000).optional(),
});
const tokenFrom = (request: Request) => request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  const input = updateSchema.safeParse(await request.json().catch(() => null));
  if (!input.success) return Response.json({ error: "岗位信息无效" }, { status: 400 });
  try {
    const supabase = createUserSupabase(tokenFrom(request));
    const { id } = await context.params;
    const changes = { ...input.data, ...(input.data.jd_text ? { analysis_status: "stale" } : {}), updated_at: new Date().toISOString() };
    const { data, error } = await supabase.from("positions").update(changes).eq("id", id).select().single();
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
    const { error } = await supabase.from("positions").delete().eq("id", id);
    if (error) throw error;
    return Response.json({ deleted: true });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "删除失败" }, { status: 503 });
  }
}
