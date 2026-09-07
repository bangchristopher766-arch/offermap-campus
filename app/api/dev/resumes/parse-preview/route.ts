import { PdfParseError } from "@/lib/pdf-document-parser";
import { parseResumePdf } from "@/lib/resume-parser";

export const runtime = "edge";

const MAX_PDF_BYTES = 10 * 1024 * 1024;

function isLoopbackRequest(request: Request) {
  const hostname = new URL(request.url).hostname;
  return hostname === "localhost" || hostname === "127.0.0.1" || hostname === "[::1]" || hostname === "::1";
}

function isLocalPreviewEnabled(request: Request) {
  return process.env.NODE_ENV === "development" && isLoopbackRequest(request);
}

export async function POST(request: Request) {
  // This endpoint exists only for local smoke testing. It must never become an
  // unauthenticated production parsing API, even when a request spoofs Host.
  if (!isLocalPreviewEnabled(request)) return Response.json({ error: "Not Found" }, { status: 404 });

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return Response.json({ error: "无法读取上传内容" }, { status: 400 });
  }

  const file = form.get("file");
  if (!(file instanceof File)) return Response.json({ error: "请选择 PDF 文件" }, { status: 400 });
  if (file.type !== "application/pdf") return Response.json({ error: "仅支持 PDF 文件" }, { status: 415 });
  if (!file.size) return Response.json({ error: "PDF 文件不能为空" }, { status: 422 });
  if (file.size > MAX_PDF_BYTES) return Response.json({ error: "文件不能超过 10 MB" }, { status: 413 });

  const bytes = new Uint8Array(await file.arrayBuffer());
  if (new TextDecoder().decode(bytes.slice(0, 5)) !== "%PDF-") {
    return Response.json({ error: "上传内容不是有效 PDF", code: "invalid" }, { status: 422 });
  }

  try {
    // Deliberately skip storage, authentication and AI enhancement. The result
    // is returned to this browser tab and lives in client memory only.
    const result = await parseResumePdf(bytes.slice());
    return Response.json({
      data: {
        name: file.name.slice(0, 240),
        file_size: file.size,
        page_count: result.totalPages,
        structured_content: result.structuredContent,
      },
      character_count: result.text.length,
      local_only: true,
    });
  } catch (error) {
    if (error instanceof PdfParseError) {
      return Response.json({ error: error.message, code: error.code }, { status: 422 });
    }
    return Response.json({ error: "PDF 解析失败，请确认文件不是扫描件或加密文件" }, { status: 422 });
  }
}
