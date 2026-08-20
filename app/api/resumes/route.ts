import { createUserSupabase } from "@/lib/supabase";

function tokenFrom(request: Request) {
  return request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
}

export async function GET(request: Request) {
  try {
    const supabase = createUserSupabase(tokenFrom(request));
    const { data: user } = await supabase.auth.getUser();
    if (!user.user) return Response.json({ error: "请先登录" }, { status: 401 });

    const [{ data, error }, { data: activePosition }] = await Promise.all([supabase
      .from("resumes")
      .select("id,name,version,file_size,page_count,structured_content,created_at,updated_at")
      .order("version", { ascending: false }),
    supabase.from("positions").select("resume_id").not("resume_id", "is", null).order("updated_at", { ascending: false }).limit(1).maybeSingle()]);
    if (error) throw error;
    const latestTouched = [...(data ?? [])].sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime())[0];
    const activeId = activePosition?.resume_id ?? latestTouched?.id ?? data?.[0]?.id ?? null;
    return Response.json({ data: (data ?? []).map((resume) => ({ ...resume, is_current: resume.id === activeId })) });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "读取简历失败" }, { status: 503 });
  }
}
