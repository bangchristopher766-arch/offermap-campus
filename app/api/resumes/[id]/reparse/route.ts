import { parseResumePdf } from "@/lib/resume-parser";
import { enhanceResumeStructure } from "@/lib/resume-ai-parser";
import { createUserSupabase } from "@/lib/supabase";
import { downloadPrivatePdf } from "@/lib/supabase-storage";
import { PdfParseError } from "@/lib/pdf-document-parser";

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
      .select("id,name,version,document_version,resume_document_id,pdf_path,content_hash")
      .eq("id", id)
      .single();
    if (resumeError || !resume?.pdf_path) return Response.json({ error: "没有找到可重新解析的 PDF" }, { status: 404 });

    if (!accessToken) return Response.json({ error: "请先登录" }, { status: 401 });
    const bytes = await downloadPrivatePdf(resume.pdf_path, accessToken);
    const result = await parseResumePdf(bytes.slice());
    const structuredContent = await enhanceResumeStructure(result.document, result.structuredContent);
    const digest = await crypto.subtle.digest("SHA-256", bytes as BufferSource);
    const contentHash = Array.from(new Uint8Array(digest)).map((byte) => byte.toString(16).padStart(2, "0")).join("");
    const [{ data: latest }, { data: latestDocument }] = await Promise.all([
      supabase.from("resumes").select("version").order("version", { ascending: false }).limit(1).maybeSingle(),
      resume.resume_document_id ? supabase.from("resumes").select("document_version").eq("resume_document_id", resume.resume_document_id).order("document_version", { ascending: false }).limit(1).maybeSingle() : Promise.resolve({ data: null }),
    ]);
    const { data, error } = await supabase.from("resumes").insert({
      user_id: user.user.id,
      name: resume.name,
      parsed_text: result.text,
      content_hash: contentHash,
      version: (latest?.version ?? resume.version) + 1,
      resume_document_id: resume.resume_document_id,
      document_version: (latestDocument?.document_version ?? resume.document_version ?? 0) + 1,
      parse_status: "ready",
      pdf_path: resume.pdf_path,
      file_size: bytes.byteLength,
      page_count: result.totalPages,
      structured_content: structuredContent,
    }).select("id,name,version,document_version,resume_document_id,file_size,page_count,structured_content,created_at,updated_at").single();
    if (error) throw error;
    if (resume.resume_document_id) {
      const { error: documentError } = await supabase.from("resume_documents").update({ current_version_id: data.id, updated_at: new Date().toISOString() }).eq("id", resume.resume_document_id);
      if (documentError) throw documentError;
    }
    return Response.json({ data, createdNewVersion: true, stalePositions: false });
  } catch (error) {
    if (error instanceof PdfParseError) return Response.json({ error: error.message, code: error.code }, { status: 422 });
    return Response.json({ error: error instanceof Error ? error.message : "重新解析失败" }, { status: 503 });
  }
}
