import { parseResumePdf } from "@/lib/resume-parser";
import { enhanceResumeStructure } from "@/lib/resume-ai-parser";
import { createUserSupabase } from "@/lib/supabase";
import { downloadPrivatePdf } from "@/lib/supabase-storage";

function tokenFrom(request: Request) {
  return request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
}

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const accessToken = tokenFrom(request);
    const supabase = createUserSupabase(accessToken);
    const { data: user } = await supabase.auth.getUser();
    if (!user.user) return Response.json({ error: "请先登录" }, { status: 401 });

    const { id } = await context.params;
    const { data: resume, error: resumeError } = await supabase
      .from("resumes")
      .select("id,pdf_path")
      .eq("id", id)
      .single();
    if (resumeError || !resume?.pdf_path) return Response.json({ error: "没有找到可重新解析的 PDF" }, { status: 404 });

    if (!accessToken) return Response.json({ error: "请先登录" }, { status: 401 });
    const bytes = await downloadPrivatePdf(resume.pdf_path, accessToken);
    const result = await parseResumePdf(bytes);
    if (result.text.trim().length < 80) return Response.json({ error: "没有识别到足够文字，暂不支持扫描版 PDF" }, { status: 422 });
    const structuredContent = await enhanceResumeStructure(result.text, result.structuredContent);

    const { data, error } = await supabase
      .from("resumes")
      .update({ parsed_text: result.text, file_size: bytes.byteLength, page_count: result.totalPages, structured_content: structuredContent, updated_at: new Date().toISOString() })
      .eq("id", id)
      .select("id,name,version,file_size,page_count,structured_content,created_at,updated_at")
      .single();
    if (error) throw error;

    await supabase.from("positions").update({ analysis_status: "stale" }).eq("user_id", user.user.id).in("analysis_status", ["processing", "ready", "failed"]);
    return Response.json({ data });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "重新解析失败" }, { status: 503 });
  }
}
