import { createUserSupabase } from "@/lib/supabase";

function tokenFrom(request: Request) {
  return request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
}

export async function GET(request: Request) {
  try {
    const supabase = createUserSupabase(tokenFrom(request));
    const { data: user } = await supabase.auth.getUser();
    if (!user.user) return Response.json({ error: "请先登录" }, { status: 401 });

    const [{ data, error }, { data: activeBindings }, { data: documents, error: documentsError }] = await Promise.all([supabase
      .from("resumes")
      .select("id,name,version,document_version,resume_document_id,file_size,page_count,parse_status,structured_content,created_at,updated_at,resume_documents:resume_documents!resumes_resume_document_id_fkey(id,name,direction,is_default,current_version_id)")
      .order("version", { ascending: false }),
    supabase.from("position_resume_bindings").select("resume_version_id").eq("status", "current"),
    supabase.from("resume_documents").select("id,name,direction,is_default,current_version_id,created_at,updated_at").is("archived_at", null).order("is_default", { ascending: false }).order("updated_at", { ascending: false })]);
    if (error) throw error;
    if (documentsError) throw documentsError;
    const boundIds = new Set((activeBindings ?? []).map((binding) => binding.resume_version_id));
    const rows = (data ?? []).map((resume) => {
      const relation = Array.isArray(resume.resume_documents) ? resume.resume_documents[0] : resume.resume_documents;
      return {
        ...resume,
        document_id: relation?.id ?? resume.resume_document_id,
        document_name: relation?.name ?? "默认母版简历",
        direction: relation?.direction ?? "",
        is_default_document: Boolean(relation?.is_default),
        is_current: relation?.current_version_id === resume.id,
        is_bound: boundIds.has(resume.id),
      };
    });
    return Response.json({ data: rows, documents: documents ?? [] });
  } catch (error) {
    const message = error instanceof Error ? error.message : "读取简历失败";
    return Response.json({ error: /resume_document|position_resume_bindings/i.test(message) ? "多简历资料库尚未初始化，请先执行 0004 数据迁移" : message }, { status: 503 });
  }
}
