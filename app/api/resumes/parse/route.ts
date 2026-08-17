import { extractText } from "unpdf";

export const runtime = "edge";

export async function POST(request: Request) {
  const form = await request.formData();
  const file = form.get("file");
  if (!(file instanceof File)) return Response.json({ error: "请选择 PDF 文件" }, { status: 400 });
  if (file.type !== "application/pdf") return Response.json({ error: "仅支持 PDF 文件" }, { status: 415 });
  if (file.size > 5 * 1024 * 1024) return Response.json({ error: "文件不能超过 5 MB" }, { status: 413 });

  try {
    const bytes = new Uint8Array(await file.arrayBuffer());
    const result = await extractText(bytes, { mergePages: true });
    const text = result.text.split(String.fromCharCode(0)).join("").trim();
    if (text.length < 80) return Response.json({ error: "没有识别到足够文字，暂不支持扫描版 PDF" }, { status: 422 });
    return Response.json({ name: file.name, pages: result.totalPages, text, characterCount: text.length });
  } catch {
    return Response.json({ error: "PDF 解析失败，请确认文件不是扫描件或加密文件" }, { status: 422 });
  }
}
