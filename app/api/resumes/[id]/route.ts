import { createUserSupabase } from "@/lib/supabase";
import { z } from "zod";

const sectionSchema = z.object({
  title: z.string().trim().min(1).max(40),
  items: z.array(z.string().trim().min(1).max(800)).min(1).max(60),
});

const updateSchema = z.object({
  sections: z.array(sectionSchema).min(1).max(16),
}).superRefine((value, context) => {
  const totalItems = value.sections.reduce((sum, section) => sum + section.items.length, 0);
  if (totalItems > 240) context.addIssue({ code: "custom", message: "简历内容过长，请控制在 240 行以内" });
});

function tokenFrom(request: Request) {
  return request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
}

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  const input = updateSchema.safeParse(await request.json().catch(() => null));
  if (!input.success) return Response.json({ error: input.error.issues[0]?.message ?? "简历解析内容无效" }, { status: 400 });

  try {
    const supabase = createUserSupabase(tokenFrom(request));
    const { data: user } = await supabase.auth.getUser();
    if (!user.user) return Response.json({ error: "请先登录" }, { status: 401 });

    const { id } = await context.params;
    const { data: existing, error: existingError } = await supabase
      .from("resumes")
      .select("id,name,version,document_version,resume_document_id,pdf_path,file_size,page_count,content_hash,structured_content")
      .eq("id", id)
      .maybeSingle();
    if (existingError) throw existingError;
    if (!existing) return Response.json({ error: "简历版本不存在或你无权修改" }, { status: 404 });

    const sections = input.data.sections.map((section) => ({
      title: section.title,
      items: section.items.map((item) => item.replace(/\s+/g, " ").trim()).filter(Boolean),
    })).filter((section) => section.items.length);
    const parsedText = sections.map((section) => `${section.title}\n${section.items.join("\n")}`).join("\n\n");
    if (parsedText.length < 80) return Response.json({ error: "简历内容过少，请保留完整经历后再保存" }, { status: 400 });

    const previous = existing.structured_content && typeof existing.structured_content === "object"
      ? existing.structured_content as Record<string, unknown>
      : {};
    const structuredContent = {
      ...previous,
      parser_version: 4,
      sections,
      quality: {
        level: "high",
        detected_sections: sections.length,
        total_lines: sections.reduce((sum, section) => sum + section.items.length, 0),
        warnings: [],
        method: "manual-correction",
        manually_corrected: true,
      },
    };

    const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(parsedText));
    const contentHash = Array.from(new Uint8Array(digest)).map((byte) => byte.toString(16).padStart(2, "0")).join("");
    const [{ data: latest }, { data: latestDocument }] = await Promise.all([
      supabase.from("resumes").select("version").order("version", { ascending: false }).limit(1).maybeSingle(),
      supabase.from("resumes").select("document_version").eq("resume_document_id", existing.resume_document_id).order("document_version", { ascending: false }).limit(1).maybeSingle(),
    ]);
    const newId = crypto.randomUUID();
    const { data, error } = await supabase.from("resumes").insert({
      id: newId,
      user_id: user.user.id,
      name: existing.name,
      parsed_text: parsedText,
      content_hash: contentHash,
      version: (latest?.version ?? existing.version) + 1,
      resume_document_id: existing.resume_document_id,
      document_version: (latestDocument?.document_version ?? existing.document_version ?? 0) + 1,
      parse_status: "ready",
      pdf_path: existing.pdf_path,
      file_size: existing.file_size,
      page_count: existing.page_count,
      structured_content: structuredContent,
    }).select("id,name,version,document_version,resume_document_id,file_size,page_count,structured_content,created_at,updated_at").single();
    if (error) throw error;
    if (existing.resume_document_id) {
      const { error: documentError } = await supabase.from("resume_documents").update({ current_version_id: data.id, updated_at: new Date().toISOString() }).eq("id", existing.resume_document_id);
      if (documentError) throw documentError;
    }
    return Response.json({ data, createdNewVersion: true, stalePositions: false });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "保存简历修改失败" }, { status: 503 });
  }
}

export async function PUT(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const supabase = createUserSupabase(tokenFrom(request));
    const { data: user } = await supabase.auth.getUser();
    if (!user.user) return Response.json({ error: "请先登录" }, { status: 401 });
    const { id } = await context.params;
    const { data: resume, error: resumeError } = await supabase.from("resumes").select("id,version,resume_document_id,document_version").eq("id", id).maybeSingle();
    if (resumeError) throw resumeError;
    if (!resume) return Response.json({ error: "简历版本不存在或你无权使用" }, { status: 404 });

    if (!resume.resume_document_id) return Response.json({ error: "该历史版本尚未归入简历资料库" }, { status: 409 });
    const now = new Date().toISOString();
    const { error: documentError } = await supabase.from("resume_documents").update({ current_version_id: id, updated_at: now }).eq("id", resume.resume_document_id);
    if (documentError) throw documentError;
    return Response.json({ data: { id, version: resume.document_version ?? resume.version, is_current: true } });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "切换母版简历失败" }, { status: 503 });
  }
}

export async function DELETE(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const supabase = createUserSupabase(tokenFrom(request));
    const { data: user } = await supabase.auth.getUser();
    if (!user.user) return Response.json({ error: "请先登录" }, { status: 401 });
    const { id } = await context.params;
    const [{ data: resume, error: resumeError }, { count: submissionCount }, { count: bindingCount }] = await Promise.all([
      supabase.from("resumes").select("id,version,document_version,resume_document_id,pdf_path").eq("id", id).maybeSingle(),
      supabase.from("application_submissions").select("id", { count: "exact", head: true }).eq("resume_version_id", id),
      supabase.from("position_resume_bindings").select("id", { count: "exact", head: true }).eq("resume_version_id", id).eq("status", "current"),
    ]);
    if (resumeError) throw resumeError;
    if (!resume) return Response.json({ error: "简历版本不存在或你无权删除" }, { status: 404 });

    if (submissionCount) return Response.json({ error: "这份简历已作为实际投递版本保存，不能删除；你可以将简历文档归档" }, { status: 409 });
    if (bindingCount) return Response.json({ error: "仍有岗位正在使用这份简历，请先在岗位页更换分析简历" }, { status: 409 });
    const { error: deleteError } = await supabase.from("resumes").delete().eq("id", id);
    if (deleteError) throw deleteError;
    const { data: replacement, error: replacementError } = await supabase.from("resumes").select("id,version,document_version")
      .eq("resume_document_id", resume.resume_document_id).order("document_version", { ascending: false }).limit(1).maybeSingle();
    if (replacementError) throw replacementError;
    if (resume.resume_document_id) await supabase.from("resume_documents").update({ current_version_id: replacement?.id ?? null, updated_at: new Date().toISOString() }).eq("id", resume.resume_document_id);

    let storageWarning: string | null = null;
    if (resume.pdf_path) {
      const { count: sharedCount } = await supabase.from("resumes").select("id", { count: "exact", head: true }).eq("pdf_path", resume.pdf_path);
      if (!sharedCount) {
        const { error: storageError } = await supabase.storage.from("resume-pdfs").remove([resume.pdf_path]);
        if (storageError) storageWarning = "数据库版本已删除，原文件将在稍后清理";
      }
    }
    return Response.json({ deleted: true, deletedVersion: resume.document_version ?? resume.version, currentResume: replacement ?? null, warning: storageWarning });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "删除简历版本失败" }, { status: 503 });
  }
}
