import { createUserSupabase } from "@/lib/supabase";
import { downloadPrivatePdf } from "@/lib/supabase-storage";

function tokenFrom(request: Request) {
  return request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
}

function safeFilename(name: string) {
  return name.replace(/[\r\n"\\/]/g, "_").slice(0, 180) || "resume.pdf";
}

export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const accessToken = tokenFrom(request);
    const supabase = createUserSupabase(accessToken);
    const { data: user } = await supabase.auth.getUser();
    if (!user.user) return Response.json({ error: "请先登录" }, { status: 401 });

    const { id } = await context.params;
    const { data: resume, error: resumeError } = await supabase
      .from("resumes")
      .select("name,pdf_path")
      .eq("id", id)
      .single();
    if (resumeError || !resume?.pdf_path) return Response.json({ error: "没有找到 PDF 文件" }, { status: 404 });

    if (!accessToken) return Response.json({ error: "请先登录" }, { status: 401 });
    const bytes = await downloadPrivatePdf(resume.pdf_path, accessToken);
    const signature = new TextDecoder().decode(bytes.slice(0, 5));
    if (signature !== "%PDF-") return Response.json({ error: "保存的文件不是有效 PDF，请重新上传" }, { status: 422 });

    const filename = safeFilename(resume.name);
    return new Response(bytes, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Length": String(bytes.byteLength),
        "Content-Disposition": `inline; filename="resume.pdf"; filename*=UTF-8''${encodeURIComponent(filename)}`,
        "Cache-Control": "private, no-store, max-age=0",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "PDF 读取失败" }, { status: 503 });
  }
}
