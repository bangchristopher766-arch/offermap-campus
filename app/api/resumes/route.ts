import { createUserSupabase } from "@/lib/supabase";

function tokenFrom(request: Request) {
  return request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
}

export async function GET(request: Request) {
  try {
    const supabase = createUserSupabase(tokenFrom(request));
    const { data: user } = await supabase.auth.getUser();
    if (!user.user) return Response.json({ error: "请先登录" }, { status: 401 });

    const { data, error } = await supabase
      .from("resumes")
      .select("id,name,version,file_size,page_count,structured_content,created_at,updated_at")
      .order("version", { ascending: false });
    if (error) throw error;
    return Response.json({ data });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "读取简历失败" }, { status: 503 });
  }
}
