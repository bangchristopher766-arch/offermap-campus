import { createUserSupabase } from "@/lib/supabase";
import { positionCategorySchema } from "@/lib/analysis-schema";
import { z } from "zod";

const inputSchema = z.object({ title: z.string().trim().min(1).max(160), category: positionCategorySchema.optional() });
const tokenFrom = (request: Request) => request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");

function normalize(value: string) {
  return value.toLowerCase().replace(/[\s（）()【】·_—-]/g, "").replaceAll("[", "").replaceAll("]", "").replace(/实习生|实习|校招|应届|届|高级|初级/g, "");
}

export async function POST(request: Request) {
  const input = inputSchema.safeParse(await request.json().catch(() => null));
  if (!input.success) return Response.json({ error: "岗位名称无效" }, { status: 400 });
  try {
    const supabase = createUserSupabase(tokenFrom(request));
    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) return Response.json({ error: "请先登录" }, { status: 401 });
    const { data, error } = await supabase.from("role_taxonomies").select("id,canonical_title,role_family,aliases").eq("status", "active");
    if (error) throw error;
    const title = normalize(input.data.title);
    const candidates = (data ?? []).map((role) => {
      const aliases = Array.isArray(role.aliases) ? role.aliases.filter((item): item is string => typeof item === "string") : [];
      const labels = [role.canonical_title, ...aliases].map(normalize);
      const exact = labels.some((label) => label === title);
      const contained = labels.some((label) => title.includes(label) || label.includes(title));
      const family = input.data.category === role.role_family;
      const confidence = exact ? 0.96 : contained ? 0.86 : family ? 0.58 : 0.18;
      return { ...role, confidence, matchedAlias: labels.find((label) => title.includes(label) || label.includes(title)) ?? null };
    }).sort((a, b) => b.confidence - a.confidence).slice(0, 4);
    const best = candidates[0] ?? null;
    return Response.json({ data: {
      rawTitle: input.data.title,
      canonicalRoleId: best?.id ?? null,
      canonicalTitle: best?.canonical_title ?? null,
      confidence: best?.confidence ?? 0,
      needsConfirmation: !best || best.confidence < 0.75,
      candidates,
    } });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "岗位名称标准化失败" }, { status: 503 });
  }
}
