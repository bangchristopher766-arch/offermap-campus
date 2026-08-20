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
      .select("id,structured_content")
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

    const { data, error } = await supabase
      .from("resumes")
      .update({ parsed_text: parsedText, structured_content: structuredContent, updated_at: new Date().toISOString() })
      .eq("id", id)
      .select("id,name,version,file_size,page_count,structured_content,created_at,updated_at")
      .single();
    if (error) throw error;

    await supabase
      .from("positions")
      .update({ analysis_status: "stale", updated_at: new Date().toISOString() })
      .eq("user_id", user.user.id)
      .in("analysis_status", ["processing", "ready", "failed"]);

    return Response.json({ data, stalePositions: true });
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
    const { data: resume, error: resumeError } = await supabase.from("resumes").select("id,version").eq("id", id).maybeSingle();
    if (resumeError) throw resumeError;
    if (!resume) return Response.json({ error: "简历版本不存在或你无权使用" }, { status: 404 });

    const now = new Date().toISOString();
    const { error: touchError } = await supabase.from("resumes").update({ updated_at: now }).eq("id", id);
    if (touchError) throw touchError;
    const { error: linkError } = await supabase.from("positions").update({ resume_id: id, updated_at: now }).eq("user_id", user.user.id);
    if (linkError) throw linkError;
    const { error: staleError } = await supabase.from("positions").update({ analysis_status: "stale", updated_at: now }).eq("user_id", user.user.id).in("analysis_status", ["processing", "ready", "failed"]);
    if (staleError) throw staleError;
    return Response.json({ data: { id, version: resume.version, is_current: true } });
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
    const [{ data: resume, error: resumeError }, { data: activePosition }, { data: activeResume }] = await Promise.all([
      supabase.from("resumes").select("id,version,pdf_path").eq("id", id).maybeSingle(),
      supabase.from("positions").select("resume_id").not("resume_id", "is", null).order("updated_at", { ascending: false }).limit(1).maybeSingle(),
      supabase.from("resumes").select("id").order("updated_at", { ascending: false }).limit(1).maybeSingle(),
    ]);
    if (resumeError) throw resumeError;
    if (!resume) return Response.json({ error: "简历版本不存在或你无权删除" }, { status: 404 });

    const { error: deleteError } = await supabase.from("resumes").delete().eq("id", id);
    if (deleteError) throw deleteError;
    const previousActiveId = activePosition?.resume_id ?? activeResume?.id ?? null;
    const preservedActiveId = previousActiveId && previousActiveId !== id ? previousActiveId : null;
    let replacementQuery = supabase.from("resumes").select("id,version");
    replacementQuery = preservedActiveId ? replacementQuery.eq("id", preservedActiveId) : replacementQuery.order("updated_at", { ascending: false }).limit(1);
    const { data: replacement, error: replacementError } = await replacementQuery.maybeSingle();
    if (replacementError) throw replacementError;

    const now = new Date().toISOString();
    const { error: linkError } = await supabase.from("positions").update({ resume_id: replacement?.id ?? null, updated_at: now }).eq("user_id", user.user.id);
    if (linkError) throw linkError;
    const { error: staleError } = await supabase.from("positions").update({ analysis_status: "stale", updated_at: now }).eq("user_id", user.user.id).in("analysis_status", ["processing", "ready", "failed"]);
    if (staleError) throw staleError;

    let storageWarning: string | null = null;
    if (resume.pdf_path) {
      const { error: storageError } = await supabase.storage.from("resume-pdfs").remove([resume.pdf_path]);
      if (storageError) storageWarning = "数据库版本已删除，原文件将在稍后清理";
    }
    return Response.json({ deleted: true, deletedVersion: resume.version, currentResume: replacement ?? null, warning: storageWarning });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "删除简历版本失败" }, { status: 503 });
  }
}
