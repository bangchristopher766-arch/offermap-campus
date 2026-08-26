import { createUserSupabase } from "@/lib/supabase";
import { parseResumePdf } from "@/lib/resume-parser";
import { enhanceResumeStructure } from "@/lib/resume-ai-parser";
import { uploadPrivatePdf } from "@/lib/supabase-storage";

export const runtime = "edge";
const EMPTY_FILE_HASH = "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855";

function tokenFrom(request: Request) {
  return request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
}

async function sha256(bytes: Uint8Array) {
  const digest = await crypto.subtle.digest("SHA-256", bytes as BufferSource);
  return Array.from(new Uint8Array(digest)).map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

export async function POST(request: Request) {
  const accessToken = tokenFrom(request);
  const supabase = createUserSupabase(accessToken);
  const { data: user } = await supabase.auth.getUser();
  if (!user.user) return Response.json({ error: "请先登录" }, { status: 401 });

  const form = await request.formData();
  const file = form.get("file");
  const requestedDocumentId = String(form.get("documentId") ?? "").trim();
  const documentName = String(form.get("documentName") ?? "").trim().slice(0, 80);
  const direction = String(form.get("direction") ?? "").trim().slice(0, 80);
  if (!(file instanceof File)) return Response.json({ error: "请选择 PDF 文件" }, { status: 400 });
  if (file.type !== "application/pdf") return Response.json({ error: "仅支持 PDF 文件" }, { status: 415 });
  if (file.size > 10 * 1024 * 1024) return Response.json({ error: "文件不能超过 10 MB" }, { status: 413 });

  let uploadedPath = "";
  try {
    let resumeDocument: { id: string; current_version_id?: string | null } | null = null;
    if (requestedDocumentId) {
      const { data, error } = await supabase.from("resume_documents").select("id,current_version_id").eq("id", requestedDocumentId).maybeSingle();
      if (error) throw error;
      if (!data) return Response.json({ error: "目标简历不存在或你无权更新" }, { status: 404 });
      resumeDocument = data;
    } else {
      const { count, error: countError } = await supabase.from("resume_documents").select("id", { count: "exact", head: true }).is("archived_at", null);
      if (countError) throw countError;
      const { data, error } = await supabase.from("resume_documents").insert({
        user_id: user.user.id,
        name: documentName || file.name.replace(/\.pdf$/i, "").slice(0, 80) || "未命名简历",
        direction,
        is_default: !count,
      }).select("id,current_version_id").single();
      if (error) throw error;
      resumeDocument = data;
    }
    const bytes = new Uint8Array(await file.arrayBuffer());
    const signature = new TextDecoder().decode(bytes.slice(0, 5));
    if (signature !== "%PDF-") return Response.json({ error: "上传内容不是有效 PDF" }, { status: 422 });
    const contentHash = await sha256(bytes);
    // PDF.js transfers/detaches its input buffer. Parse a copy so the original
    // bytes remain intact for hashing, private storage, and upload verification.
    const result = await parseResumePdf(bytes.slice());
    const text = result.text.split(String.fromCharCode(0)).join("").trim();
    if (text.length < 80) return Response.json({ error: "没有识别到足够文字，暂不支持扫描版 PDF" }, { status: 422 });
    const structuredContent = await enhanceResumeStructure(text, result.structuredContent);

    const { data: hashDuplicate } = await supabase
      .from("resumes")
      .select("id,name,version,document_version,resume_document_id,file_size,page_count,pdf_path,structured_content,created_at,updated_at")
      .eq("content_hash", contentHash)
      .eq("resume_document_id", resumeDocument.id)
      .maybeSingle();
    let duplicate = hashDuplicate;
    if (!duplicate) {
      const { data: legacyEmptyVersion } = await supabase
        .from("resumes")
        .select("id,name,version,document_version,resume_document_id,file_size,page_count,pdf_path,structured_content,created_at,updated_at")
        .eq("content_hash", EMPTY_FILE_HASH)
        .eq("name", file.name.slice(0, 240))
        .eq("file_size", file.size)
        .eq("resume_document_id", resumeDocument.id)
        .order("version", { ascending: false })
        .limit(1)
        .maybeSingle();
      duplicate = legacyEmptyVersion;
    }
    if (duplicate) {
      if (!accessToken) return Response.json({ error: "请先登录" }, { status: 401 });
      const duplicatePath = duplicate.pdf_path || `${user.user.id}/${duplicate.id}/resume.pdf`;
      await uploadPrivatePdf(duplicatePath, bytes, accessToken, true);
      const { data: refreshed, error: refreshError } = await supabase
        .from("resumes")
        .update({ name: file.name.slice(0, 240), parsed_text: text, content_hash: contentHash, pdf_path: duplicatePath, file_size: bytes.byteLength, page_count: result.totalPages, structured_content: structuredContent, updated_at: new Date().toISOString() })
        .eq("id", duplicate.id)
        .select("id,name,version,document_version,resume_document_id,file_size,page_count,pdf_path,structured_content,created_at,updated_at")
        .single();
      if (refreshError) throw refreshError;
      await supabase.from("resume_documents").update({ current_version_id: refreshed.id, updated_at: new Date().toISOString() }).eq("id", resumeDocument.id);
      return Response.json({ data: refreshed, duplicate: true, reparsed: true });
    }

    const { data: latest, error: latestError } = await supabase
      .from("resumes")
      .select("version")
      .order("version", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (latestError) throw latestError;
    const { data: latestDocumentVersion, error: latestDocumentError } = await supabase
      .from("resumes")
      .select("document_version")
      .eq("resume_document_id", resumeDocument.id)
      .order("document_version", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (latestDocumentError) throw latestDocumentError;

    const resumeId = crypto.randomUUID();
    const version = (latest?.version ?? 0) + 1;
    uploadedPath = `${user.user.id}/${resumeId}/resume.pdf`;
    if (!accessToken) return Response.json({ error: "请先登录" }, { status: 401 });
    await uploadPrivatePdf(uploadedPath, bytes, accessToken, false);

    const { data: resume, error: insertError } = await supabase
      .from("resumes")
      .insert({
        id: resumeId,
        user_id: user.user.id,
        name: file.name.slice(0, 240),
        parsed_text: text,
        content_hash: contentHash,
        version,
        resume_document_id: resumeDocument.id,
        document_version: (latestDocumentVersion?.document_version ?? 0) + 1,
        parse_status: "ready",
        pdf_path: uploadedPath,
        file_size: file.size,
        page_count: result.totalPages,
        structured_content: structuredContent,
      })
      .select("id,name,version,document_version,resume_document_id,file_size,page_count,pdf_path,structured_content,created_at,updated_at")
      .single();
    if (insertError) throw insertError;
    const { error: documentError } = await supabase.from("resume_documents").update({ current_version_id: resume.id, updated_at: new Date().toISOString() }).eq("id", resumeDocument.id);
    if (documentError) throw documentError;

    return Response.json({ data: resume, character_count: text.length }, { status: 201 });
  } catch (error) {
    if (uploadedPath) await supabase.storage.from("resume-pdfs").remove([uploadedPath]);
    const message = error instanceof Error ? error.message : "PDF 解析失败";
    const migrationMissing = /pdf_path|structured_content|resume-pdfs|bucket|resume_document|document_version/i.test(message);
    const storageFailure = /上传|存储|线上 PDF|校验失败/i.test(message);
    return Response.json({ error: migrationMissing ? "简历存储尚未初始化，请先执行最新数据库迁移" : storageFailure ? message : "PDF 解析失败，请确认文件不是扫描件或加密文件", details: message }, { status: migrationMissing || storageFailure ? 503 : 422 });
  }
}
