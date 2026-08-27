import { createUserSupabase } from "@/lib/supabase";

const tokenFrom = (request: Request) => request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
const capabilityTerms = [
  "用户研究","需求分析","产品设计","产品规划","优先级","数据分析","数据验证","A/B测试","跨团队","项目管理",
  "人工智能","大模型","Agent","评测","Prompt","Python","Java","Go","SQL","数据库","系统设计","性能优化","故障排查",
  "用户分层","增长","留存","转化","活动运营","内容运营","市场洞察","品牌","渠道","预算","投入产出","英语",
];

function explainCoverage(jd: string, resume: string) {
  const source = `${jd}`.toLowerCase();
  const body = resume.toLowerCase();
  const relevant = capabilityTerms.filter((term) => source.includes(term.toLowerCase()));
  const covered = relevant.filter((term) => body.includes(term.toLowerCase()));
  const gaps = relevant.filter((term) => !body.includes(term.toLowerCase()));
  return {
    score: covered.length * 3 - gaps.length,
    covered,
    gaps,
    reason: covered.length ? `可直接召回：${covered.slice(0, 3).join("、")}` : "尚未发现可直接解释的关键词覆盖，建议查看完整证据地图",
  };
}

export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const supabase = createUserSupabase(tokenFrom(request));
    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) return Response.json({ error: "请先登录" }, { status: 401 });
    const { id } = await context.params;
    const [{ data: position, error: positionError }, { data: documents, error: documentsError }, { data: binding }] = await Promise.all([
      supabase.from("positions").select("id,title,jd_text,resume_id").eq("id", id).maybeSingle(),
      supabase.from("resume_documents").select("id,name,direction,is_default,current_version_id,resumes:resumes!resumes_resume_document_id_fkey(id,name,version,document_version,parsed_text,file_size,page_count,created_at,updated_at)").is("archived_at", null).order("is_default", { ascending: false }),
      supabase.from("position_resume_bindings").select("id,resume_version_id,selected_by,selected_at").eq("position_id", id).eq("status", "current").maybeSingle(),
    ]);
    if (positionError) throw positionError;
    if (documentsError) throw documentsError;
    if (!position) return Response.json({ error: "岗位不存在或无权访问" }, { status: 404 });
    const options = (documents ?? []).flatMap((document) => {
      const versions = Array.isArray(document.resumes) ? document.resumes : document.resumes ? [document.resumes] : [];
      return versions.map((version) => ({
        documentId: document.id,
        documentName: document.name,
        direction: document.direction,
        isDefault: document.is_default,
        isDocumentCurrent: document.current_version_id === version.id,
        versionId: version.id,
        version: version.document_version ?? version.version,
        fileName: version.name,
        updatedAt: version.updated_at,
        ...explainCoverage(position.jd_text || position.title, version.parsed_text || ""),
      }));
    }).sort((a, b) => Number(b.isDocumentCurrent) - Number(a.isDocumentCurrent) || b.score - a.score);
    const currentResumeVersionId = binding?.resume_version_id ?? position.resume_id ?? null;
    const best = [...options].sort((a, b) => b.score - a.score)[0];
    return Response.json({ data: {
      currentBinding: binding ? { ...binding, resumeVersionId: binding.resume_version_id } : currentResumeVersionId ? { id: null, resumeVersionId: currentResumeVersionId, selected_by: "legacy" } : null,
      recommendedVersionId: options.length === 1 ? options[0]?.versionId : best?.versionId ?? null,
      recommendationReason: options.length === 1 ? "当前只有一份简历，已直接选中" : best ? `${best.documentName} ${best.reason}` : "请先上传简历",
      options,
    } });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "读取简历候选失败" }, { status: 503 });
  }
}
