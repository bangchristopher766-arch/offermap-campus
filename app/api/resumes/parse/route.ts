import { extractText } from "unpdf";
import { createUserSupabase } from "@/lib/supabase";
import { structureResumeText } from "@/lib/resume-structure";

export const runtime = "edge";

function tokenFrom(request: Request) {
  return request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
}

async function sha256(bytes: Uint8Array) {
  const digest = await crypto.subtle.digest("SHA-256", bytes as BufferSource);
  return Array.from(new Uint8Array(digest)).map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

export async function POST(request: Request) {
  const supabase = createUserSupabase(tokenFrom(request));
  const { data: user } = await supabase.auth.getUser();
  if (!user.user) return Response.json({ error: "请先登录" }, { status: 401 });

  const form = await request.formData();
  const file = form.get("file");
  if (!(file instanceof File)) return Response.json({ error: "请选择 PDF 文件" }, { status: 400 });
  if (file.type !== "application/pdf") return Response.json({ error: "仅支持 PDF 文件" }, { status: 415 });
  if (file.size > 10 * 1024 * 1024) return Response.json({ error: "文件不能超过 10 MB" }, { status: 413 });

  let uploadedPath = "";
  try {
    const bytes = new Uint8Array(await file.arrayBuffer());
    const result = await extractText(bytes, { mergePages: true });
    const text = result.text.split(String.fromCharCode(0)).join("").trim();
    if (text.length < 80) return Response.json({ error: "没有识别到足够文字，暂不支持扫描版 PDF" }, { status: 422 });

    const contentHash = await sha256(bytes);
    const { data: duplicate } = await supabase
      .from("resumes")
      .select("id,name,version,file_size,page_count,pdf_path,structured_content,created_at,updated_at")
      .eq("content_hash", contentHash)
      .maybeSingle();
    if (duplicate) return Response.json({ data: duplicate, duplicate: true });

    const { data: latest, error: latestError } = await supabase
      .from("resumes")
      .select("version")
      .order("version", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (latestError) throw latestError;

    const resumeId = crypto.randomUUID();
    const version = (latest?.version ?? 0) + 1;
    uploadedPath = `${user.user.id}/${resumeId}/resume.pdf`;
    const { error: uploadError } = await supabase.storage
      .from("resume-pdfs")
      .upload(uploadedPath, bytes, { contentType: "application/pdf", upsert: false });
    if (uploadError) throw uploadError;

    const structuredContent = structureResumeText(text);
    const { data: resume, error: insertError } = await supabase
      .from("resumes")
      .insert({
        id: resumeId,
        user_id: user.user.id,
        name: file.name.slice(0, 240),
        parsed_text: text,
        content_hash: contentHash,
        version,
        pdf_path: uploadedPath,
        file_size: file.size,
        page_count: result.totalPages,
        structured_content: structuredContent,
      })
      .select("id,name,version,file_size,page_count,pdf_path,structured_content,created_at,updated_at")
      .single();
    if (insertError) throw insertError;

    await supabase.from("positions").update({ resume_id: resume.id }).eq("user_id", user.user.id);
    await supabase.from("positions").update({ analysis_status: "stale" }).eq("user_id", user.user.id).in("analysis_status", ["processing", "ready", "failed"]);

    const { data: signed } = await supabase.storage.from("resume-pdfs").createSignedUrl(uploadedPath, 600);
    return Response.json({ data: { ...resume, preview_url: signed?.signedUrl ?? null }, character_count: text.length }, { status: 201 });
  } catch (error) {
    if (uploadedPath) await supabase.storage.from("resume-pdfs").remove([uploadedPath]);
    const message = error instanceof Error ? error.message : "PDF 解析失败";
    const migrationMissing = /pdf_path|structured_content|resume-pdfs|bucket/i.test(message);
    return Response.json({ error: migrationMissing ? "简历存储尚未初始化，请先执行最新数据库迁移" : "PDF 解析失败，请确认文件不是扫描件或加密文件", details: message }, { status: migrationMissing ? 503 : 422 });
  }
}
