const BUCKET = "resume-pdfs";

function storageConfig() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const apiKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !apiKey) throw new Error("Supabase 尚未配置");
  return { url: url.replace(/\/$/, ""), apiKey };
}

function encodedPath(path: string) {
  return path.split("/").map(encodeURIComponent).join("/");
}

async function storageError(response: Response, fallback: string) {
  const payload = await response.json().catch(() => null) as { message?: string; error?: string } | null;
  return new Error(payload?.message ?? payload?.error ?? `${fallback}（${response.status}）`);
}

export async function uploadPrivatePdf(path: string, bytes: Uint8Array, accessToken: string, upsert: boolean) {
  if (bytes.byteLength < 5 || new TextDecoder().decode(bytes.slice(0, 5)) !== "%PDF-") throw new Error("上传内容不是有效 PDF");
  const { url, apiKey } = storageConfig();
  const body = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength);
  const response = await fetch(`${url}/storage/v1/object/${BUCKET}/${encodedPath(path)}`, {
    method: "POST",
    headers: {
      apikey: apiKey,
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/pdf",
      "x-upsert": upsert ? "true" : "false",
      "Cache-Control": "private, max-age=0",
    },
    body,
  });
  if (!response.ok) throw await storageError(response, "PDF 上传失败");

  const verified = await downloadPrivatePdf(path, accessToken);
  if (verified.byteLength !== bytes.byteLength || new TextDecoder().decode(verified.slice(0, 5)) !== "%PDF-") {
    throw new Error("PDF 上传校验失败，请重新尝试");
  }
}

export async function downloadPrivatePdf(path: string, accessToken: string) {
  const { url, apiKey } = storageConfig();
  const response = await fetch(`${url}/storage/v1/object/authenticated/${BUCKET}/${encodedPath(path)}`, {
    headers: { apikey: apiKey, Authorization: `Bearer ${accessToken}`, "Cache-Control": "no-store" },
  });
  if (!response.ok) throw await storageError(response, "PDF 读取失败");
  const bytes = new Uint8Array(await response.arrayBuffer());
  if (!bytes.byteLength) throw new Error("线上 PDF 文件为空，请重新上传原文件");
  return bytes;
}
