import { createUserSupabase } from "@/lib/supabase";
import { z } from "zod";

const createSchema = z.object({
  name: z.string().trim().min(1).max(80),
  direction: z.string().trim().max(80).optional().default(""),
  isDefault: z.boolean().optional().default(false),
});

const tokenFrom = (request: Request) => request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");

export async function GET(request: Request) {
  try {
    const supabase = createUserSupabase(tokenFrom(request));
    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) return Response.json({ error: "请先登录" }, { status: 401 });
    const { data, error } = await supabase
      .from("resume_documents")
      .select("id,name,direction,is_default,current_version_id,archived_at,created_at,updated_at,resumes:resumes!resumes_resume_document_id_fkey(id,name,version,document_version,file_size,page_count,parse_status,structured_content,created_at,updated_at)")
      .is("archived_at", null)
      .order("is_default", { ascending: false })
      .order("updated_at", { ascending: false });
    if (error) throw error;
    return Response.json({ data: data ?? [] });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "读取简历库失败" }, { status: 503 });
  }
}

export async function POST(request: Request) {
  const input = createSchema.safeParse(await request.json().catch(() => null));
  if (!input.success) return Response.json({ error: input.error.issues[0]?.message ?? "简历信息无效" }, { status: 400 });
  try {
    const supabase = createUserSupabase(tokenFrom(request));
    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) return Response.json({ error: "请先登录" }, { status: 401 });
    const { count, error: countError } = await supabase.from("resume_documents").select("id", { count: "exact", head: true }).is("archived_at", null);
    if (countError) throw countError;
    const shouldDefault = input.data.isDefault || !count;
    if (shouldDefault) await supabase.from("resume_documents").update({ is_default: false }).eq("user_id", userData.user.id);
    const { data, error } = await supabase.from("resume_documents").insert({
      user_id: userData.user.id,
      name: input.data.name,
      direction: input.data.direction,
      is_default: shouldDefault,
    }).select().single();
    if (error) throw error;
    return Response.json({ data }, { status: 201 });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "创建简历失败" }, { status: 503 });
  }
}
