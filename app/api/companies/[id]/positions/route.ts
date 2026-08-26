import { positionCategorySchema } from "@/lib/analysis-schema";
import { createUserSupabase } from "@/lib/supabase";
import { z } from "zod";

const positionSchema = z.object({
  title: z.string().trim().min(1).max(120),
  category: positionCategorySchema,
  department: z.string().trim().max(120).optional().default(""),
  location: z.string().trim().max(80).optional().default(""),
  job_code: z.string().trim().max(80).optional().default(""),
  industry: z.string().trim().max(80).optional().default(""),
  seniority: z.string().trim().max(40).optional().default("early_career"),
  product_type: z.string().trim().max(60).optional().default(""),
  company_type: z.string().trim().max(80).optional().default(""),
  jd_text: z.string().trim().max(30_000).optional().default(""),
});

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const input = positionSchema.safeParse(await request.json().catch(() => null));
  if (!input.success) return Response.json({ error: "岗位信息不完整", details: input.error.flatten() }, { status: 400 });
  try {
    const token = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
    const supabase = createUserSupabase(token);
    const { data: user } = await supabase.auth.getUser();
    if (!user.user) return Response.json({ error: "请先登录" }, { status: 401 });
    const { id: companyId } = await context.params;
    const { data, error } = await supabase.from("positions").insert({ ...input.data, company_id: companyId, user_id: user.user.id }).select().single();
    if (error) throw error;
    return Response.json({ data }, { status: 201 });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "创建失败" }, { status: 503 });
  }
}
