import { createUserSupabase } from "@/lib/supabase";
import { z } from "zod";

const companySchema = z.object({ name: z.string().trim().min(1).max(80) });

function tokenFrom(request: Request) {
  return request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
}

export async function GET(request: Request) {
  try {
    const supabase = createUserSupabase(tokenFrom(request));
    const { data, error } = await supabase.from("companies").select("*, positions(*, applications(*))").order("created_at");
    if (error) throw error;
    return Response.json({ data });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "读取失败" }, { status: 503 });
  }
}

export async function POST(request: Request) {
  const input = companySchema.safeParse(await request.json().catch(() => null));
  if (!input.success) return Response.json({ error: "公司名称无效" }, { status: 400 });
  try {
    const supabase = createUserSupabase(tokenFrom(request));
    const { data: user } = await supabase.auth.getUser();
    if (!user.user) return Response.json({ error: "请先登录" }, { status: 401 });
    const { data: duplicates } = await supabase.from("companies").select("id").eq("name", input.data.name).limit(1);
    const { data, error } = await supabase.from("companies").insert({ ...input.data, user_id: user.user.id }).select().single();
    if (error) throw error;
    return Response.json({ data, warning: duplicates?.length ? "你已经创建过同名公司" : null }, { status: 201 });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "创建失败" }, { status: 503 });
  }
}
