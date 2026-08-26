import { createUserSupabase } from "@/lib/supabase";

const tokenFrom = (request: Request) => request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");

export async function GET(request: Request) {
  try {
    const supabase = createUserSupabase(tokenFrom(request));
    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) return Response.json({ error: "请先登录" }, { status: 401 });
    const positionId = new URL(request.url).searchParams.get("positionId");
    if (!positionId) return Response.json({ error: "缺少岗位信息" }, { status: 400 });
    const { data: position } = await supabase.from("positions").select("id,title,category,industry,seniority,product_type,canonical_role_id,role_profile_id").eq("id", positionId).maybeSingle();
    if (!position) return Response.json({ error: "岗位不存在或无权访问" }, { status: 404 });
    const { data: taxonomies, error: taxonomyError } = await supabase.from("role_taxonomies").select("id,canonical_title,role_family,aliases").eq("status", "active");
    if (taxonomyError) throw taxonomyError;
    const normalizedTitle = position.title.toLowerCase().replace(/\s+/g, "");
    const ranked = (taxonomies ?? []).map((role) => {
      const aliases = Array.isArray(role.aliases) ? role.aliases.filter((item): item is string => typeof item === "string") : [];
      const matched = [role.canonical_title, ...aliases].some((label) => normalizedTitle.includes(label.toLowerCase().replace(/\s+/g, "")));
      return { role, score: position.canonical_role_id === role.id ? 100 : matched ? 90 : role.role_family === position.category ? 55 : 0 };
    }).sort((a, b) => b.score - a.score);
    const selectedRole = ranked[0]?.role;
    if (!selectedRole) return Response.json({ data: null });
    const { data: profiles, error: profileError } = await supabase.from("role_profiles")
      .select("id,industry,seniority,product_type,version,sample_count,company_count,effective_from,generated_at,reviewed_status,source_summary,role_taxonomies(id,canonical_title,role_family),role_requirements(id,label,description,category,prevalence_level,confidence,source_count,display_order)")
      .eq("role_taxonomy_id", selectedRole.id).in("reviewed_status", ["curated_seed","reviewed"]).order("version", { ascending: false });
    if (profileError) throw profileError;
    const profile = (profiles ?? []).sort((a, b) => Number(b.industry === position.industry) - Number(a.industry === position.industry))[0] ?? null;
    if (!profile) return Response.json({ data: null });
    return Response.json({ data: {
      ...profile,
      match: {
        canonicalRoleId: selectedRole.id,
        canonicalTitle: selectedRole.canonical_title,
        confidence: ranked[0]?.score === 100 ? 0.98 : ranked[0]?.score === 90 ? 0.88 : 0.58,
        needsConfirmation: (ranked[0]?.score ?? 0) < 75,
      },
      scope: [position.industry || profile.industry, selectedRole.canonical_title, position.seniority || profile.seniority].filter(Boolean).join(" / "),
    } });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "匹配岗位画像失败" }, { status: 503 });
  }
}
