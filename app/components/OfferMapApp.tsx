"use client";
/* eslint-disable @next/next/no-html-link-for-pages -- full document navigation is intentional for Vinext dynamic routes */

import {
  AlertCircle,
  ArrowRight,
  ArrowUpRight,
  BriefcaseBusiness,
  CalendarDays,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  CircleDot,
  Command,
  Copy,
  Download,
  FileCheck2,
  FileText,
  Filter,
  Globe2,
  LoaderCircle,
  LogOut,
  Map,
  History,
  MoreHorizontal,
  MoveDown,
  MoveUp,
  PanelRightOpen,
  PencilLine,
  Plus,
  RefreshCw,
  Route,
  Search,
  ExternalLink,
  ShieldCheck,
  SlidersHorizontal,
  Sparkles,
  Target,
  Trash2,
  Upload,
  WandSparkles,
  X,
} from "lucide-react";
import type { Session } from "@supabase/supabase-js";
import { getBrowserSupabase, isSupabaseConfigured } from "@/lib/supabase-browser";
import type { SupabasePublicConfig } from "@/lib/supabase-config";
import { useEffect, useMemo, useRef, useState } from "react";

export type OfferMapView = "home" | "resume" | "positions" | "map" | "analysis";
type DemoState = "normal" | "empty" | "loading" | "error";
type AnalysisRunKind = "evidence" | "benchmark" | "resume" | "interview";
type AnalysisTab = AnalysisRunKind | "research" | "preparation";
type AnalysisRunPhase = "deep" | "expand" | null;
type Category = "技术" | "产品" | "运营" | "市场";
type ApplicationStage = "感兴趣" | "准备中" | "已投递" | "笔试中" | "一面中" | "二面中" | "终面中" | "Offer 沟通" | "已录用" | "未通过" | "已放弃";
type DemoPosition = { id: string; title: string; category?: Category; department?: string; locationRaw?: string; location: string; jdText?: string; industry?: string; seniority?: string; productType?: string; companyType?: string; stage: ApplicationStage; analysis: string; next?: string; href: string };
type WorkspaceCompany = { id: string; name: string; mark: string; groups: Array<{ category: Category; positions: DemoPosition[] }> };
type NewPositionInput = { company: string; title: string; category: Category; department: string; location: string; jdText: string; industry: string; seniority: string; productType: string; companyType: string };
type UpdatePositionInput = { title: string; category: Category; department: string; location: string; jdText: string; industry: string; seniority: string; productType: string; companyType: string };
type StageUpdateInput = { stage: ApplicationStage; occurredAt: string; nextEventAt?: string; nextEventType?: string; note?: string };
type ResumeSection = { title: string; items: string[]; originalTitle?: string | null; normalizedKind?: string | null; sourceBlockIds?: string[] };
type ResumeParseQuality = { level: "high" | "medium" | "low"; detected_sections: number; total_lines: number; warnings: string[]; method?: string; ai_enhanced?: boolean; manually_corrected?: boolean };
const CURRENT_PDF_PARSER_VERSION = 5;
type ResumeVersion = {
  id: string;
  name: string;
  version: number;
  document_version?: number | null;
  resume_document_id?: string | null;
  document_id?: string | null;
  document_name?: string;
  direction?: string;
  is_default_document?: boolean;
  is_bound?: boolean;
  file_size: number;
  page_count: number;
  structured_content: { parser_version?: number; sections?: ResumeSection[]; quality?: ResumeParseQuality; document?: { source?: { extractionMethod?: string }; pages?: unknown[] } } | null;
  created_at: string;
  updated_at: string;
  is_current?: boolean;
};
type LocalPdfParsePayload = {
  data: Pick<ResumeVersion, "name" | "file_size" | "page_count" | "structured_content">;
  character_count: number;
  local_only: true;
};
type AnalysisEvidenceRelation = {
  status: "strong" | "partial" | "missing";
  rationale: string;
  action: string;
  evidence_items?: { id: string; resume_quote: string } | Array<{ id: string; resume_quote: string }> | null;
};
type AnalysisEvidenceItem = {
  id: string;
  kind: "required" | "preferred" | "responsibility";
  requirement: string;
  jd_quote: string;
  importance: "high" | "medium" | "low";
  requirement_evidence?: AnalysisEvidenceRelation | AnalysisEvidenceRelation[] | null;
};
type ResumeSuggestionRecord = {
  id: string;
  action: "keep" | "rewrite" | "add" | "deemphasize";
  original_text: string;
  suggested_text: string;
  reason: string;
  risk: string;
  accepted: boolean;
  edited_text?: string | null;
  jd_quotes?: string[];
};
type InterviewQuestionRecord = {
  id: string;
  priority: "high" | "medium" | "low";
  priority_reason: string;
  main_question: string;
  intent: string;
  answer_structure: string[];
  missing_information: string;
  risk: string;
  source_requirement_ids: string[];
  source_evidence_ids: string[];
  question_followups?: Array<{ id: string; sort_order: number; question: string }>;
  preparation?: QuestionPreparation | null;
};
type QuestionPreparation = {
  status: "not_started" | "drafting" | "ready";
  answerDraft: string;
  realExample: string;
  keyMetrics: string;
  notes: string;
  updatedAt?: string;
};
type AnalysisPosition = {
  id: string;
  title: string;
  category: "technology" | "product" | "operations" | "marketing";
  department: string;
  location: string;
  job_code: string;
  jd_text: string;
  industry?: string;
  seniority?: string;
  product_type?: string;
  company_type?: string;
  position_revision?: number;
  role_profile_id?: string | null;
  analysis_status: "pending" | "processing" | "ready" | "stale" | "failed";
  analyzed_resume_version?: number | null;
  companies?: { name: string } | Array<{ name: string }> | null;
  applications?: Array<{ current_stage: string; next_event_at?: string | null; next_event_type?: string | null }>;
};
type AnalysisResume = {
  id: string;
  name: string;
  version: number;
  document_version?: number | null;
  resume_document_id?: string | null;
  resume_documents?: { id: string; name: string; direction: string; is_default: boolean } | Array<{ id: string; name: string; direction: string; is_default: boolean }> | null;
  structured_content?: { sections?: ResumeSection[] } | null;
};
type ActiveAnalysisRun = {
  id: string;
  task: string;
  kind: AnalysisRunKind;
  phase: "core" | "expand" | null;
  startedAt: string;
  stalled: boolean;
};
type AnalysisRunRecord = {
  id: string;
  task: string;
  model: string;
  status: "processing" | "ready" | "failed";
  duration_ms?: number | null;
  input_tokens?: number | null;
  output_tokens?: number | null;
  error_code?: string | null;
  created_at: string;
  position_revision?: number | null;
  resume_version_id?: string | null;
  role_profile_id?: string | null;
  role_profile_version?: number | null;
};
type ResumeOption = { documentId: string; documentName: string; direction: string; isDefault: boolean; isDocumentCurrent: boolean; versionId: string; version: number; fileName: string; updatedAt: string; score?: number; reason?: string; covered?: string[]; gaps?: string[] };
type BenchmarkEvidenceRecord = {
  id: string;
  status: "strong" | "partial" | "missing" | "uncertain";
  resume_quotes: string[];
  rationale: string;
  missing_information: string;
  action: string;
  confidence?: number | null;
  citation_verified: boolean;
  ignored_at?: string | null;
  role_requirements?: { id: string; label: string; description: string; category: string; prevalence_level: "high" | "common" | "occasional" | "low"; source_count: number; display_order: number } | Array<{ id: string; label: string; description: string; category: string; prevalence_level: "high" | "common" | "occasional" | "low"; source_count: number; display_order: number }> | null;
};
type BenchmarkProfile = { id: string; version: number; industry: string; seniority: string; product_type?: string; generated_at: string; source_summary: string; role_taxonomies?: { canonical_title: string; role_family: string } | Array<{ canonical_title: string; role_family: string }> | null };
type SubmissionRecord = { id: string; resume_version_id: string; submitted_at: string; channel: string; note: string; resumes?: { name: string; version: number; document_version?: number; resume_documents?: { name: string; direction: string } | Array<{ name: string; direction: string }> | null } | Array<{ name: string; version: number; document_version?: number; resume_documents?: { name: string; direction: string } | Array<{ name: string; direction: string }> | null }> | null };
type PositionResearchSource = {
  id: string;
  title: string;
  url: string;
  domain: string;
  excerpt: string;
  score: number | null;
  publishedDate: string | null;
  sourceType: "company" | "recruiting" | "interview";
};
type PositionResearch = {
  version: 1;
  positionRevision: number;
  overview: string;
  insights: Array<{
    id: string;
    category: "company" | "role" | "interview" | "action";
    title: string;
    summary: string;
    sourceIds: string[];
    confidence: "high" | "medium" | "low";
    caveat: string;
  }>;
  sources: PositionResearchSource[];
  queries: string[];
  generatedAt: string;
  expiresAt: string;
};
type PositionResearchState = { research: PositionResearch | null; stale: boolean; configured?: boolean; meta?: { model?: string; durationMs?: number; completedAt?: string } | null };
type PositionAnalysisData = {
  position: AnalysisPosition;
  resume?: AnalysisResume | null;
  binding?: { id?: string | null; resumeVersionId: string; selected_by?: string; selected_at?: string } | null;
  resumeOptions?: ResumeOption[];
  submissions?: SubmissionRecord[];
  benchmark?: { profile?: BenchmarkProfile | null; evidence: BenchmarkEvidenceRecord[] };
  evidence: AnalysisEvidenceItem[];
  suggestions: ResumeSuggestionRecord[];
  questions: InterviewQuestionRecord[];
  meta?: { model?: string; provider?: string; durationMs?: number; phase?: "core" | "expand"; resumeCompleted?: boolean; interviewCompleted?: boolean; activeRun?: ActiveAnalysisRun | null; inProgress?: boolean; completed?: boolean; history?: AnalysisRunRecord[] };
};

const NAV_ITEMS: Array<{ key: OfferMapView; label: string; href: string }> = [
  { key: "home", label: "首页", href: "/workspace" },
  { key: "resume", label: "我的简历", href: "/resume" },
  { key: "positions", label: "目标岗位", href: "/positions" },
  { key: "map", label: "求职地图", href: "/map" },
];

const ACCOUNT_AVATAR_GRADIENTS = [
  "linear-gradient(145deg, #2f6fed, #7047c8)",
  "linear-gradient(145deg, #008f7a, #176b87)",
  "linear-gradient(145deg, #e06c45, #ad3f67)",
  "linear-gradient(145deg, #4776a8, #324b72)",
  "linear-gradient(145deg, #8a61d2, #4f67c8)",
  "linear-gradient(145deg, #b07425, #8d4f32)",
];

function createAccountAvatar({ email, name, accountKey }: { email?: string; name?: string; accountKey?: string }) {
  const emailName = email?.split("@")[0]?.trim() ?? "";
  const displayName = name?.trim() || emailName || "访客";
  const firstCharacter = Array.from(displayName).find((character) => /[\p{L}\p{N}]/u.test(character)) ?? "访";
  const label = /[a-z]/i.test(firstCharacter) ? firstCharacter.toUpperCase() : firstCharacter;
  const seed = accountKey || email || displayName;
  let hash = 0;
  for (const character of seed) hash = (hash * 31 + (character.codePointAt(0) ?? 0)) >>> 0;
  return { label, displayName, background: ACCOUNT_AVATAR_GRADIENTS[hash % ACCOUNT_AVATAR_GRADIENTS.length] };
}

const ALL_STAGES: ApplicationStage[] = ["感兴趣", "准备中", "已投递", "笔试中", "一面中", "二面中", "终面中", "Offer 沟通", "已录用", "未通过", "已放弃"];

const demoCompanies: WorkspaceCompany[] = [
  {
    id: "byte",
    name: "字节跳动",
    mark: "字节",
    groups: [
      { category: "技术", positions: [{ id: "byte-da", title: "数据分析实习生", location: "上海 · 商业化", stage: "已投递", analysis: "2 项待补强", href: "/positions/sample" }] },
      { category: "产品", positions: [
        { id: "byte-pm", title: "AI 产品经理实习生", location: "北京 · Flow 产品", stage: "二面中", analysis: "2 个问题待准备", next: "8 月 21 日 15:00", href: "/positions/byte-pm" },
        { id: "byte-strategy", title: "策略产品实习生", location: "北京 · 电商", stage: "准备中", analysis: "尚未生成分析", href: "/positions/sample" },
      ] },
      { category: "运营" as Category, positions: [] },
      { category: "市场", positions: [{ id: "byte-mkt", title: "商业化市场实习生", location: "上海 · 巨量引擎", stage: "感兴趣", analysis: "尚未生成分析", href: "/positions/sample" }] },
    ],
  },
  {
    id: "meituan",
    name: "美团",
    mark: "美团",
    groups: [
      { category: "技术" as Category, positions: [] },
      { category: "产品", positions: [{ id: "mt-pm", title: "到店产品实习生", location: "北京 · 到店事业群", stage: "已投递", analysis: "1 项待补强", href: "/positions/sample" }] },
      { category: "运营", positions: [{ id: "mt-ops", title: "用户增长运营实习生", location: "上海 · 优选", stage: "一面中", analysis: "3 个问题待准备", next: "8 月 20 日 10:30", href: "/positions/sample" }] },
      { category: "市场" as Category, positions: [] },
    ],
  },
  {
    id: "tencent",
    name: "腾讯",
    mark: "腾讯",
    groups: [
      { category: "技术", positions: [{ id: "tencent-ba", title: "商业分析实习生", location: "深圳 · PCG", stage: "Offer 沟通", analysis: "准备较完整", next: "等待薪资沟通", href: "/positions/sample" }] },
      { category: "产品" as Category, positions: [] },
      { category: "运营" as Category, positions: [] },
      { category: "市场" as Category, positions: [] },
    ],
  },
];

const demoResumeVersions: ResumeVersion[] = [{
  id: "demo-resume-v3",
  name: "林同学-互联网求职简历.pdf",
  version: 3,
  file_size: 1_887_437,
  page_count: 2,
  structured_content: { sections: [
    { title: "教育经历", items: ["华东师范大学 · 新闻传播学"] },
    { title: "实习经历", items: ["用户增长、产品运营"] },
    { title: "项目经历", items: ["校园内容社区、AI 求职助手"] },
    { title: "技能与证书", items: ["SQL、Figma、数据分析、英语"] },
  ] },
  created_at: "2026-08-16T14:40:00.000Z",
  updated_at: "2026-08-16T14:40:00.000Z",
}];

function stageTone(stage: ApplicationStage) {
  if (["一面中", "二面中", "终面中"].includes(stage)) return "interview";
  if (["Offer 沟通", "已录用"].includes(stage)) return "offer";
  if (["未通过", "已放弃"].includes(stage)) return "closed";
  if (["已投递", "笔试中"].includes(stage)) return "applied";
  return "planning";
}

const CATEGORY_TO_DB: Record<Category, "technology" | "product" | "operations" | "marketing"> = { 技术: "technology", 产品: "product", 运营: "operations", 市场: "marketing" };
const CATEGORY_FROM_DB: Record<string, Category> = { technology: "技术", product: "产品", operations: "运营", marketing: "市场" };
const STAGE_TO_DB: Record<ApplicationStage, string> = {
  感兴趣: "interested", 准备中: "preparing", 已投递: "applied", 笔试中: "written_test", 一面中: "interview_1", 二面中: "interview_2",
  终面中: "final_interview", "Offer 沟通": "offer_discussion", 已录用: "hired", 未通过: "rejected", 已放弃: "withdrawn",
};
const STAGE_FROM_DB: Record<string, ApplicationStage> = Object.fromEntries(Object.entries(STAGE_TO_DB).map(([label, value]) => [value, label])) as Record<string, ApplicationStage>;

function mapWorkspaceCompanies(rows: unknown): WorkspaceCompany[] {
  if (!Array.isArray(rows)) return [];
  return rows.map((raw) => {
    const company = raw as { id: string; name: string; positions?: Array<Record<string, unknown>> };
    const groups = (["技术", "产品", "运营", "市场"] as Category[]).map((category) => ({
      category,
      positions: (company.positions ?? []).filter((position) => CATEGORY_FROM_DB[String(position.category)] === category).map((position) => {
        const applications = Array.isArray(position.applications) ? position.applications as Array<Record<string, unknown>> : [];
        const application = applications[0];
        const nextEvent = typeof application?.next_event_at === "string" ? new Date(application.next_event_at) : null;
        return {
          id: String(position.id),
          title: String(position.title),
          category,
          department: typeof position.department === "string" ? position.department : "",
          locationRaw: typeof position.location === "string" ? position.location : "",
          location: [position.location, position.department].filter(Boolean).join(" · ") || "地点待补充",
          jdText: typeof position.jd_text === "string" ? position.jd_text : "",
          industry: typeof position.industry === "string" ? position.industry : "互联网",
          seniority: typeof position.seniority === "string" ? position.seniority : "intern",
          productType: typeof position.product_type === "string" ? position.product_type : "",
          companyType: typeof position.company_type === "string" ? position.company_type : "",
          stage: STAGE_FROM_DB[String(application?.current_stage)] ?? "准备中",
          analysis: position.analysis_status === "ready" ? "分析已完成" : position.analysis_status === "stale" ? "分析需要更新" : "尚未生成分析",
          next: nextEvent && !Number.isNaN(nextEvent.getTime()) ? formatDisplayDate(nextEvent, true) : undefined,
          href: `/positions/${position.id}`,
        } satisfies DemoPosition;
      }),
    }));
    return { id: company.id, name: company.name, mark: company.name.slice(0, 2), groups };
  });
}

async function fetchWorkspaceJson(path: string, accessToken: string, init?: RequestInit) {
  const headers = new Headers(init?.headers);
  headers.set("Authorization", `Bearer ${accessToken}`);
  if (!(init?.body instanceof FormData) && !headers.has("Content-Type")) headers.set("Content-Type", "application/json");
  const response = await fetch(path, { ...init, headers });
  const payload = await response.json().catch(() => ({})) as { data?: unknown; error?: string };
  if (!response.ok) throw new Error(payload.error ?? "请求失败");
  return payload;
}

const evidence = [
  {
    type: "必备要求",
    title: "能够独立完成用户需求分析与产品方案设计",
    status: "证据充分",
    tone: "good",
    quote: "负责校园内容社区从 0 到 1 的需求调研、原型设计和两轮迭代。",
    reason: "证据覆盖需求发现、方案设计和迭代闭环。面试时需明确你的个人决策边界。",
  },
  {
    type: "岗位职责",
    title: "结合数据和用户反馈持续优化产品体验",
    status: "部分支持",
    tone: "partial",
    quote: "通过问卷与访谈收集 126 份反馈，推动首页信息架构调整。",
    reason: "有用户反馈证据，但没有说明数据如何影响决策，也缺少上线后的结果指标。",
  },
  {
    type: "加分要求",
    title: "有 AI 产品或大模型应用项目经验",
    status: "暂无证据",
    tone: "missing",
    quote: "母版简历中未找到可直接引用的事实性证据。",
    reason: "建议补充真实项目过程、模型能力边界和验证结果，系统不会代写不存在的经历。",
  },
];

const suggestions = [
  {
    action: "改写",
    section: "项目经历 · 校园内容社区",
    original: "负责产品调研和功能设计，跟进开发上线。",
    revised: "访谈 18 名校园用户并归纳 4 类内容发现阻碍，主导重构首页信息架构；协同设计与研发完成两轮迭代。",
    reason: "补齐用户问题、个人动作和协作对象，直接回应 JD 对需求分析与项目推动的要求。",
  },
  {
    action: "补充",
    section: "项目经历 · AI 求职助手",
    original: "基于大模型搭建求职问答助手。",
    revised: "围绕简历与 JD 难以串联的问题设计证据地图，通过引用定位和结构化输出降低 AI 建议失真风险。",
    reason: "把“使用模型”改为可被追问、可被验证的 AI 产品过程。",
  },
];

const questions = [
  {
    priority: "高",
    title: "你如何从 126 份用户反馈中，判断应该优先调整首页信息架构？",
    intent: "验证你是否真正掌握用户研究、问题归因和优先级判断，而不只是执行了调研。",
    followups: ["反馈样本是怎么筛选的？", "你用什么方法归纳问题？", "为什么先改首页而不是搜索？", "如何验证调整有效？"],
  },
  {
    priority: "高",
    title: "在 AI 求职助手项目里，哪些决策是你独立完成的？",
    intent: "确认你的个人贡献、能力边界和对 AI 输出可靠性的产品判断。",
    followups: ["为什么选择证据地图？", "引用定位怎么验证？", "模型输出错误时如何处理？", "如果时间减半会保留什么？"],
  },
];

const STATE_COPY: Record<OfferMapView, Record<Exclude<DemoState, "normal">, { title: string; body: string; action?: string }>> = {
  home: {
    empty: { title: "从任何一块开始", body: "上传简历、保存岗位或打开求职地图都可以，没有固定顺序。", action: "选择一个入口" },
    loading: { title: "正在同步工作台", body: "正在整理最近的岗位和准备记录。" },
    error: { title: "工作台暂时无法载入", body: "你的简历与岗位数据仍然安全，请稍后重试。", action: "重新载入" },
  },
  resume: {
    empty: { title: "上传你的母版简历", body: "支持文本型 PDF。它可以独立维护，不会被岗位定制建议覆盖。", action: "选择 PDF" },
    loading: { title: "正在解析简历", body: "正在按页面版式恢复文字顺序和模块边界，预计还需 20 秒。" },
    error: { title: "这份 PDF 暂时无法解析", body: "文件可能是扫描件或包含受保护内容，请换用文本型 PDF。", action: "重新选择" },
  },
  positions: {
    empty: { title: "添加第一个目标岗位", body: "先选公司和岗位类别，再粘贴岗位名称与 JD。无需先上传简历。", action: "新建岗位" },
    loading: { title: "正在整理岗位 JD", body: "正在拆分岗位职责、必备要求和加分要求。" },
    error: { title: "JD 解析没有完成", body: "岗位原文已经保存，你可以稍后重试。", action: "重新解析" },
  },
  map: {
    empty: { title: "你的求职地图还是空的", body: "添加岗位后，公司、类别与具体岗位会自动出现在这里。", action: "添加目标岗位" },
    loading: { title: "正在生成求职地图", body: "正在汇总公司、岗位类别、证据覆盖和准备状态。" },
    error: { title: "部分节点未能载入", body: "已保留可用信息，失败节点会在重试后补齐。", action: "重新生成" },
  },
  analysis: {
    empty: { title: "这个岗位还没有分析", body: "生成后将得到证据地图、定制简历建议和面试追问地图。", action: "开始分析" },
    loading: { title: "正在深度串联 JD 与简历", body: "当前步骤：定位简历证据并验证原文引用。" },
    error: { title: "证据地图生成中断", body: "输入已经保留，失败发生在引用验证步骤，没有展示不可靠结果。", action: "继续生成" },
  },
};

function AppHeader({ view, companies, userEmail, userName, accountKey, signOut, openPassword }: { view: OfferMapView; companies: WorkspaceCompany[]; userEmail?: string; userName?: string; accountKey?: string; signOut?: () => void; openPassword?: () => void }) {
  const navView = view === "analysis" ? "positions" : view;
  const [searchOpen, setSearchOpen] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const accountAvatar = createAccountAvatar({ email: userEmail, name: userName, accountKey });
  const searchablePositions = companies.flatMap((company) => company.groups.flatMap((group) => group.positions.map((position) => ({ ...position, company: company.name, category: group.category }))));
  const searchResults = searchablePositions.filter((position) => `${position.company}${position.title}${position.category}`.toLowerCase().includes(searchQuery.toLowerCase()));
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setSearchOpen(true);
      }
      if (event.key === "Escape") { setSearchOpen(false); setCreateOpen(false); setProfileOpen(false); }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);
  return (
    <>
      <header className="app-header">
        <div className="header-inner">
          <a className="brand" href="/workspace" aria-label="OfferMap 工作台首页">
            <span className="brand-symbol"><Route size={18} /></span><span>OfferMap</span>
          </a>
          <nav className="main-nav" aria-label="主导航">
            {NAV_ITEMS.map((item) => <a key={item.key} href={item.href} className={navView === item.key ? "active" : ""}>{item.label}</a>)}
          </nav>
          <div className="header-tools">
            <button className="header-search-button" type="button" onClick={() => setSearchOpen(true)} aria-label="全局搜索"><Search size={16} /><span>搜索</span><kbd>⌘ K</kbd></button>
            <div className="header-menu-wrap">
              <button className="header-new-button" type="button" onClick={() => { setCreateOpen(!createOpen); setProfileOpen(false); }} aria-expanded={createOpen}><Plus size={15} />新建</button>
              {createOpen && <div className="header-popover create-menu"><a href="/positions"><BriefcaseBusiness size={16} /><span><strong>新建岗位</strong><small>保存公司、类别与 JD</small></span></a><a href="/resume"><Upload size={16} /><span><strong>上传简历</strong><small>更新母版简历版本</small></span></a></div>}
            </div>
            <div className="header-menu-wrap">
              <button className="avatar account-avatar" style={{ background: accountAvatar.background }} type="button" onClick={() => { setProfileOpen(!profileOpen); setCreateOpen(false); }} aria-label={`${accountAvatar.displayName}的个人中心`} aria-expanded={profileOpen}>{accountAvatar.label}</button>
              {profileOpen && <div className="header-popover profile-menu"><div className="profile-summary"><span className="avatar account-avatar" style={{ background: accountAvatar.background }}>{accountAvatar.label}</span><div><strong>{accountAvatar.displayName}</strong><small>{userEmail ?? "演示账号 · 求职方向"}</small></div></div><a href="/resume"><FileText size={15} />母版简历</a><a href="/map"><Map size={15} />我的求职地图</a><a href="/"><Route size={15} />使用指南</a>{signOut ? <><button type="button" onClick={() => { setProfileOpen(false); openPassword?.(); }}><ShieldCheck size={15} />设置登录密码</button><button type="button" onClick={signOut}><LogOut size={15} />退出登录</button></> : <div className="profile-plan"><Sparkles size={13} />演示账号 · 配置 Supabase 后启用登录</div>}</div>}
            </div>
          </div>
        </div>
      </header>
      {searchOpen && <div className="search-overlay" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && setSearchOpen(false)}><section className="global-search" role="dialog" aria-modal="true" aria-label="全局搜索"><div className="global-search-input"><Search size={19} /><input value={searchQuery} onChange={(event) => setSearchQuery(event.target.value)} placeholder="搜索公司、岗位或类别" /><button type="button" onClick={() => setSearchOpen(false)}>ESC</button></div><div className="search-result-label">{searchQuery ? `找到 ${searchResults.length} 个结果` : "最近访问"}</div><div className="search-results">{searchResults.slice(0, 6).map((position) => <a href={position.href} key={position.id}><span className="search-result-icon"><BriefcaseBusiness size={16} /></span><span><strong>{position.title}</strong><small>{position.company} · {position.category} · {position.location}</small></span><em className={`application-stage ${stageTone(position.stage)}`}>{position.stage}</em></a>)}</div><div className="search-help"><Command size={13} />输入关键词搜索，按 Enter 打开</div></section></div>}
    </>
  );
}

function PageHeader({ eyebrow, title, description, action }: { eyebrow: string; title: string; description: string; action?: React.ReactNode }) {
  return (
    <div className="page-header">
      <div><p className="eyebrow">{eyebrow}</p><h1>{title}</h1><p className="page-description">{description}</p></div>
      {action}
    </div>
  );
}

function StatusPreview({ view, state, onChange }: { view: OfferMapView; state: DemoState; onChange: (state: DemoState) => void }) {
  return (
    <div className="demo-state-switcher">
      <span><Sparkles size={13} /> 演示状态</span>
      <select value={state} onChange={(event) => onChange(event.target.value as DemoState)} aria-label="切换页面状态">
        <option value="normal">正常</option><option value="empty">空状态</option><option value="loading">加载中</option><option value="error">失败</option>
      </select>
      <span className="demo-view-name">{view === "analysis" ? "岗位分析" : NAV_ITEMS.find((item) => item.key === view)?.label}</span>
    </div>
  );
}

function AlternateState({ view, state, onReset }: { view: OfferMapView; state: Exclude<DemoState, "normal">; onReset: () => void }) {
  const content = STATE_COPY[view][state];
  return (
    <section className="state-stage card">
      {state === "loading" ? <LoaderCircle className="state-spinner" size={44} /> : state === "error" ? <span className="state-icon error"><AlertCircle /></span> : <span className="state-icon"><WandSparkles /></span>}
      <h2>{content.title}</h2><p>{content.body}</p>
      {state === "loading" ? <div className="loading-track"><span /></div> : <button className={state === "error" ? "secondary-button" : "primary-button"} type="button" onClick={onReset}>{content.action}</button>}
    </section>
  );
}

function HomeView({ companies }: { companies: WorkspaceCompany[] }) {
  const positions = companies.flatMap((company) => company.groups.flatMap((group) => group.positions.map((position) => ({ ...position, company: company.name }))));
  const activeCount = positions.filter((position) => !["感兴趣", "未通过", "已放弃"].includes(position.stage)).length;
  const nextPositions = positions.filter((position) => position.next).slice(0, 2);
  const entries = [
    { title: "我的简历", body: "维护一份母版简历，查看解析后的经历和技能，按需更新版本。", meta: "母版简历已更新至 v3", icon: FileText, href: "/resume", tone: "blue" },
    { title: "目标岗位", body: "按公司、岗位类别和具体岗位，整理你想申请的每一份 JD。", meta: `${companies.length} 家公司 · ${positions.length} 个岗位`, icon: BriefcaseBusiness, href: "/positions", tone: "gold" },
    { title: "个人求职地图", body: "从全局查看目标分布、准备进度、优势证据和下一步行动。", meta: `${activeCount} 个岗位正在准备`, icon: Map, href: "/map", tone: "green" },
  ];
  return (
    <>
      <section className="home-intro"><p className="eyebrow">你的应届求职工作台</p><h1>今天，准备哪一部分？</h1><p>简历、岗位和求职地图彼此独立。你可以从任何一处开始，也可以随时回来继续。</p></section>
      <div className="entry-grid">
        {entries.map(({ title, body, meta, icon: Icon, href, tone }) => (
          <a href={href} className="entry-card card" key={title} aria-label={`进入${title}`}>
            <span className={`entry-icon ${tone}`}><Icon /></span><h2>{title}</h2><p>{body}</p>
            <span className="entry-meta"><CircleDot size={13} />{meta}</span>
            <span className="entry-cta">进入查看 <ArrowRight size={14} /></span>
            <span className="entry-arrow"><ArrowUpRight size={17} /></span>
          </a>
        ))}
      </div>
      {nextPositions.length > 0 && <section className="next-section"><div className="section-heading"><h2>接下来</h2><a href="/positions">管理全部进度 <ChevronRight size={15} /></a></div><div className="next-grid">{nextPositions.map((position, index) => <a href={position.href} className={`card next-card ${index === 0 ? "urgent" : ""}`} key={position.id}><span className={`date-block ${index === 1 ? "soft" : ""}`}>{index === 0 ? <><CalendarDays size={19} /><small>{position.stage}</small></> : <ClockBadge />}</span><div><span className="next-kicker">{position.next} · {position.stage}</span><h3>{position.company} · {position.title}</h3><p>{position.analysis}</p></div><span className="next-arrow"><ArrowRight size={16} /></span></a>)}</div></section>}
      <section className="recent-section"><div className="section-heading"><h2>最近准备</h2><a href="/positions">查看全部 <ChevronRight size={15} /></a></div><div className="recent-grid">
        {positions.slice(0, 3).map((position) => <a href={position.href} className="recent-item" key={position.id}><span className="company-mark">{position.company.slice(0,2)}</span><span><strong>{position.title}</strong><small>{position.stage} · {position.analysis}</small></span><i className={`live-dot ${stageTone(position.stage) === "interview" ? "warning" : stageTone(position.stage) === "planning" ? "muted" : ""}`} /></a>)}
      </div></section>
    </>
  );
}

function ClockBadge() {
  return <><CalendarDays size={19} /><small>待跟进</small></>;
}

function formatFileSize(bytes: number) {
  if (!bytes) return "大小未知";
  return bytes >= 1024 * 1024 ? `${(bytes / 1024 / 1024).toFixed(1)} MB` : `${Math.max(1, Math.round(bytes / 1024))} KB`;
}

const DISPLAY_TIME_ZONE = "Asia/Shanghai";

function formatDisplayDate(value: string | Date, includeTime = false) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "时间未知";
  return date.toLocaleString("zh-CN", includeTime
    ? { timeZone: DISPLAY_TIME_ZONE, month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" }
    : { timeZone: DISPLAY_TIME_ZONE, month: "short", day: "numeric" });
}

function ResumeView({ openUpload, versions, loading, error, preview, reparse, saveSections, activateVersion, deleteVersion }: { openUpload?: () => void; versions: ResumeVersion[]; loading: boolean; error: string; preview: (resume: ResumeVersion) => Promise<void>; reparse: (resumeId: string) => Promise<void>; saveSections: (resumeId: string, sections: ResumeSection[]) => Promise<void>; activateVersion: (resumeId: string) => Promise<void>; deleteVersion: (resumeId: string) => Promise<void> }) {
  const documents = useMemo(() => {
    const groups = new globalThis.Map<string, { id: string; name: string; direction: string; isDefault: boolean; versions: ResumeVersion[] }>();
    for (const version of versions) {
      const id = version.document_id || version.resume_document_id || "legacy";
      const existing = groups.get(id) ?? { id, name: version.document_name || "默认母版简历", direction: version.direction || "未设置方向", isDefault: Boolean(version.is_default_document), versions: [] };
      existing.versions.push(version);
      groups.set(id, existing);
    }
    return [...groups.values()].map((document) => ({ ...document, versions: document.versions.sort((a, b) => (b.document_version ?? b.version) - (a.document_version ?? a.version)) })).sort((a, b) => Number(b.isDefault) - Number(a.isDefault));
  }, [versions]);
  const [selectedDocumentId, setSelectedDocumentId] = useState("");
  const activeDocumentId = documents.some((document) => document.id === selectedDocumentId)
    ? selectedDocumentId
    : documents[0]?.id ?? "";
  const selectedDocument = documents.find((document) => document.id === activeDocumentId) ?? documents[0];
  const documentVersions = selectedDocument?.versions ?? [];
  const current = documentVersions.find((version) => version.is_current) ?? documentVersions[0];
  const sections = current?.structured_content?.sections ?? [];
  const quality = current?.structured_content?.quality;
  const [previewing, setPreviewing] = useState<string | null>(null);
  const [reparsing, setReparsing] = useState(false);
  const [actionError, setActionError] = useState("");
  const [actionMessage, setActionMessage] = useState("");
  const [editing, setEditing] = useState(false);
  const [activating, setActivating] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<ResumeVersion | null>(null);
  const openPreview = async (resume: ResumeVersion) => {
    setPreviewing(resume.id); setActionError(""); setActionMessage("");
    try { await preview(resume); }
    catch (previewError) { setActionError(previewError instanceof Error ? previewError.message : "PDF 预览失败"); }
    finally { setPreviewing(null); }
  };
  const runReparse = async () => {
    if (!current) return;
    setReparsing(true); setActionError(""); setActionMessage("");
    try { await reparse(current.id); }
    catch (reparseError) { setActionError(reparseError instanceof Error ? reparseError.message : "重新解析失败"); }
    finally { setReparsing(false); }
  };
  const activate = async (resume: ResumeVersion) => {
    setActivating(resume.id); setActionError(""); setActionMessage("");
    try { await activateVersion(resume.id); setActionMessage(`已将 v${resume.document_version ?? resume.version} 设为“${selectedDocument?.name}”的当前版本；岗位仍保留原来绑定的版本`); }
    catch (activateError) { setActionError(activateError instanceof Error ? activateError.message : "切换母版失败"); }
    finally { setActivating(null); }
  };
  return (
    <>
      <PageHeader eyebrow="多简历 · 不可变版本" title="简历库" description="按求职方向维护多份简历；每个岗位绑定具体版本，更新不会覆盖历史分析和已投递事实。" action={openUpload ? <button className="primary-button" type="button" onClick={openUpload}><Plus size={16} />新增或更新简历</button> : undefined} />
      {loading ? <section className="card resume-loading"><LoaderCircle className="state-spinner" size={25} /><div><strong>正在读取简历版本</strong><p>正在安全加载你的 PDF 和解析结果。</p></div></section>
        : error ? <section className="card resume-empty error"><AlertCircle size={24} /><h2>简历暂时无法读取</h2><p>{error}</p>{openUpload && <button className="primary-button" type="button" onClick={openUpload}>重新上传</button>}</section>
        : !current ? <section className="card resume-empty"><span className="empty-resume-icon"><FileText size={28} /></span><h2>上传第一份求职简历</h2><p>支持 10 MB 以内的文本型 PDF。你可以分别建立 AI 产品、技术、运营等方向，每份都保留独立版本。</p>{openUpload && <button className="primary-button" type="button" onClick={openUpload}><Upload size={16} />选择 PDF</button>}</section>
        : <div className="resume-library-layout">
          <aside className="card resume-document-card"><div className="card-heading"><h2>求职方向</h2><span className="version-count">{documents.length} 份简历</span></div><div className="resume-document-list">{documents.map((document) => <button type="button" className={document.id === selectedDocument?.id ? "active" : ""} onClick={() => { setSelectedDocumentId(document.id); setActionMessage(""); setActionError(""); }} key={document.id}><span><strong>{document.name}</strong><small>{document.direction || "未设置方向"} · {document.versions.length} 个版本</small></span>{document.isDefault && <em>默认</em>}<ChevronRight size={15} /></button>)}</div>{openUpload && <button className="resume-add-document" type="button" onClick={openUpload}><Plus size={14} />新增简历方向</button>}<div className="privacy-note"><ShieldCheck size={17} /><p><strong>岗位单独绑定</strong>新增版本不会让所有岗位一起过期，历史分析和投递版本持续保留。</p></div></aside>
          <section className="card content-card"><div className="card-heading"><div><h2>{selectedDocument?.name}</h2><p className="card-subtitle">{selectedDocument?.direction || "未设置求职方向"} · 当前 v{current.document_version ?? current.version}</p></div><div className="card-heading-actions"><span className={`parse-quality ${quality?.level ?? "medium"}`}><CheckCircle2 size={13} />{current.structured_content?.parser_version === 4 || quality?.manually_corrected ? "已人工校正" : quality?.level === "high" ? "结构识别良好" : quality?.level === "low" ? "建议检查结构" : "解析完成"}</span><button className="secondary-button compact" type="button" onClick={() => setEditing(true)} disabled={!sections.length}><PencilLine size={14} />校正解析稿</button></div></div><div className="file-card"><span className="pdf-file"><FileText /></span><div><strong>{current.name}</strong><small>v{current.document_version ?? current.version} · {formatFileSize(current.file_size)} · {current.page_count || "?"} 页 · 更新于 {formatDisplayDate(current.updated_at, true)}</small></div><button className="secondary-button compact" type="button" onClick={() => openPreview(current)} disabled={previewing === current.id}>{previewing === current.id ? <><LoaderCircle className="state-spinner inline" size={13} />读取中…</> : "预览 PDF"}</button></div>{quality?.warnings?.length ? <div className="parse-warning"><AlertCircle size={15} /><span>{quality.warnings[0]}</span><button type="button" onClick={runReparse} disabled={reparsing}>{reparsing ? "解析中…" : "用新版重新解析"}</button></div> : (current.structured_content?.parser_version ?? 0) < CURRENT_PDF_PARSER_VERSION && !quality?.manually_corrected ? <div className="parse-upgrade"><PencilLine size={15} /><span>这份简历使用旧版解析器；重新解析或校正会创建新版本，历史结果不会被覆盖。</span><button type="button" onClick={runReparse} disabled={reparsing}>{reparsing ? "解析中…" : "用新版重新解析"}</button></div> : null}{actionError && <p className="form-error resume-action-error"><AlertCircle size={14} />{actionError}</p>}{actionMessage && <p className="resume-action-success"><CheckCircle2 size={14} />{actionMessage}</p>}<div className="resume-outline">
            {sections.slice(0, 7).map((section) => <div className="outline-row" key={section.title}><span>{section.title}</span><strong>{section.items.slice(0, 2).join(" · ") || "已识别内容"}</strong><small>{section.items.length} 行</small><ChevronRight size={15} /></div>)}
            {!sections.length && <div className="outline-placeholder"><FileCheck2 size={18} /><span>PDF 已保存，结构化内容将在下次更新时重新解析。</span></div>}
          </div><div className="resume-version-strip"><div className="card-heading"><h2>版本记录</h2><span className="version-count">{documentVersions.length} 个版本</span></div><div className="version-list">{documentVersions.map((version) => { const isCurrent = version.id === current.id; const displayVersion = version.document_version ?? version.version; return <div className={`version-item ${isCurrent ? "current" : ""}`} key={version.id}><span>v{displayVersion}{isCurrent ? " · 当前版本" : ""}{version.is_bound ? " · 被岗位使用" : ""}</span><strong>{version.name}</strong><small>{formatDisplayDate(version.updated_at, isCurrent)} · {formatFileSize(version.file_size)} · {version.page_count || "?"} 页</small><div className="version-item-actions"><button type="button" onClick={() => openPreview(version)} disabled={previewing === version.id}>{previewing === version.id ? "读取中…" : <><span>查看 PDF</span><ArrowUpRight size={12} /></>}</button>{!isCurrent && <button type="button" onClick={() => void activate(version)} disabled={activating === version.id}>{activating === version.id ? "切换中…" : "设为当前"}</button>}<button className="delete-version" type="button" onClick={() => setDeleting(version)} aria-label={`删除 v${displayVersion}`}><Trash2 size={12} /></button></div></div>; })}</div></div></section>
        </div>}
      {editing && current && <ResumeEditorModal resume={current} close={() => setEditing(false)} save={async (nextSections) => { await saveSections(current.id, nextSections); setActionMessage("校正稿已保存为新版本，旧版本与已有分析保持不变"); setEditing(false); }} />}
      {deleting && <ResumeVersionDeleteModal resume={deleting} totalVersions={documentVersions.length} close={() => setDeleting(null)} remove={async () => { await deleteVersion(deleting.id); setActionMessage(`v${deleting.document_version ?? deleting.version} 已删除`); setDeleting(null); }} />}
    </>
  );
}

function PositionsView({ openNewPosition, companies, onStageUpdate, onCompanyRename, onCompanyDelete, onPositionUpdate, onPositionDelete }: { openNewPosition: () => void; companies: WorkspaceCompany[]; onStageUpdate?: (positionId: string, input: StageUpdateInput) => Promise<void>; onCompanyRename?: (companyId: string, name: string) => Promise<void>; onCompanyDelete?: (companyId: string) => Promise<void>; onPositionUpdate?: (positionId: string, input: UpdatePositionInput) => Promise<void>; onPositionDelete?: (positionId: string) => Promise<void> }) {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("全部类别");
  const [statusFilter, setStatusFilter] = useState("全部进度");
  const [stageOverrides, setStageOverrides] = useState<Record<string, ApplicationStage>>({});
  const [editing, setEditing] = useState<{ companyId: string; positionId: string } | null>(null);
  const [managingCompany, setManagingCompany] = useState<string | null>(null);
  const [managingPosition, setManagingPosition] = useState<string | null>(null);
  const positionData = useMemo(() => companies.map((company) => ({ ...company, groups: company.groups.map((group) => ({ ...group, positions: group.positions.map((position) => ({ ...position, stage: stageOverrides[position.id] ?? position.stage })) })) })), [companies, stageOverrides]);
  const filtered = useMemo(() => positionData.filter((company) => company.name.includes(query) || company.groups.some((group) => group.positions.some((position) => position.title.includes(query)))), [query, positionData]);
  const editingPosition = editing ? positionData.flatMap((company) => company.groups.flatMap((group) => group.positions)).find((position) => position.id === editing.positionId) : undefined;
  const updateStage = async (input: StageUpdateInput) => {
    if (!editing) return;
    const target = editing;
    const previousStage = editingPosition?.stage;
    setStageOverrides((items) => ({ ...items, [editing.positionId]: input.stage }));
    try {
      await onStageUpdate?.(target.positionId, input);
      setEditing(null);
    } catch (updateError) {
      setStageOverrides((items) => {
        const next = { ...items };
        if (previousStage) next[target.positionId] = previousStage;
        else delete next[target.positionId];
        return next;
      });
      throw updateError;
    }
  };
  return (
    <>
      <PageHeader eyebrow="公司 → 类别 → 具体岗位" title="目标岗位" description="岗位不依赖简历，可以先保存 JD，再决定何时生成分析。" action={<button className="primary-button" type="button" onClick={openNewPosition}><Plus size={17} />新建岗位</button>} />
      <div className="position-toolbar"><label className="search-field"><Search size={16} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="搜索公司或岗位" /></label><label className="select-button"><Filter size={15} /><select value={category} onChange={(event) => setCategory(event.target.value)}><option>全部类别</option><option>技术</option><option>产品</option><option>运营</option><option>市场</option></select><ChevronDown size={14} /></label><label className="select-button"><CircleDot size={14} /><select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}><option>全部进度</option><option>准备中</option><option>已投递</option><option>面试中</option><option>Offer 阶段</option></select><ChevronDown size={14} /></label></div>
      <div className="company-list">{filtered.length === 0 && <section className="card workspace-empty"><BriefcaseBusiness size={27} /><h2>还没有目标岗位</h2><p>创建第一个公司和岗位后，数据会安全保存在你的账号中。</p><button className="primary-button" type="button" onClick={openNewPosition}><Plus size={15} />新建岗位</button></section>}{filtered.map((company) => {
        const companyPositions = company.groups.flatMap((group) => group.positions);
        const interviewCount = companyPositions.filter((position) => ["一面中","二面中","终面中"].includes(position.stage)).length;
        const submittedCount = companyPositions.filter((position) => !["感兴趣","准备中"].includes(position.stage)).length;
        const offerCount = companyPositions.filter((position) => ["Offer 沟通","已录用"].includes(position.stage)).length;
        return <article className="card company-card" key={company.id}><div className="company-heading"><span className={`company-mark ${company.id}`}>{company.mark}</span><div><h2>{company.name}</h2><p>{companyPositions.length} 个岗位 · 已投递 {submittedCount} · 面试中 {interviewCount} · Offer {offerCount}</p></div><button className="icon-button" type="button" onClick={() => setManagingCompany(company.id)} aria-label={`${company.name}更多操作`}><MoreHorizontal size={18} /></button></div><div className="category-grid">{company.groups.map((group) => {
          const visibleByCategory = category === "全部类别" || category === group.category;
          const groupPositions = group.positions.filter((position) => statusFilter === "全部进度" || position.stage === statusFilter || (statusFilter === "面试中" && ["一面中","二面中","终面中"].includes(position.stage)) || (statusFilter === "Offer 阶段" && ["Offer 沟通","已录用"].includes(position.stage)));
          return <section className={`category-column ${!visibleByCategory ? "dimmed" : ""}`} key={group.category}><div className="category-title"><i className={`category-dot ${group.category}`} />{group.category}<span>{group.positions.length}</span></div>{groupPositions.length ? groupPositions.map((position) => <div className="position-record" key={position.id}><a href={position.href} className="position-row"><strong>{position.title}</strong><small>{position.location}</small><span className="analysis-hint">{position.analysis}</span><ChevronRight size={14} /></a><button className="position-manage-button" type="button" onClick={() => setManagingPosition(position.id)} aria-label={`编辑${position.title}`}><MoreHorizontal size={14} /></button><button className={`application-stage ${stageTone(position.stage)}`} type="button" onClick={() => setEditing({ companyId: company.id, positionId: position.id })}>{position.stage}<ChevronDown size={11} /></button>{position.next && <span className="position-next"><CalendarDays size={11} />{position.next}</span>}</div>) : group.positions.length ? <p className="filtered-empty">当前筛选下无岗位</p> : <button className="empty-category" type="button" onClick={openNewPosition}><Plus size={13} />添加岗位</button>}</section>;
        })}</div></article>;
      })}</div>
      {editing && editingPosition && <StageModal position={editingPosition} close={() => setEditing(null)} update={updateStage} />}
      {managingCompany && (() => { const company = positionData.find((item) => item.id === managingCompany); return company ? <CompanyManageModal company={company} close={() => setManagingCompany(null)} rename={async (name) => { await onCompanyRename?.(company.id, name); setManagingCompany(null); }} remove={async () => { await onCompanyDelete?.(company.id); setManagingCompany(null); }} /> : null; })()}
      {managingPosition && (() => { const position = positionData.flatMap((company) => company.groups.flatMap((group) => group.positions)).find((item) => item.id === managingPosition); return position ? <PositionManageModal position={position} close={() => setManagingPosition(null)} save={async (input) => { await onPositionUpdate?.(position.id, input); setManagingPosition(null); }} remove={async () => { await onPositionDelete?.(position.id); setManagingPosition(null); }} /> : null; })()}
    </>
  );
}

function MapView({ companies, accountAvatar }: { companies: WorkspaceCompany[]; accountAvatar: ReturnType<typeof createAccountAvatar> }) {
  const [filterOpen, setFilterOpen] = useState(false);
  const [quickView, setQuickView] = useState<"all" | "interview" | "attention" | "offer">("all");
  const [selectedCategories, setSelectedCategories] = useState<Category[]>([]);
  const toggleCategory = (category: Category) => setSelectedCategories((items) => items.includes(category) ? items.filter((item) => item !== category) : [...items, category]);
  const allPositions = companies.flatMap((company) => company.groups.flatMap((group) => group.positions));
  const visibleCompanies = companies.filter((company) => {
    const positions = company.groups.filter((group) => selectedCategories.length === 0 || selectedCategories.includes(group.category)).flatMap((group) => group.positions);
    if (positions.length === 0) return false;
    if (quickView === "interview") return positions.some((position) => ["一面中","二面中","终面中"].includes(position.stage));
    if (quickView === "offer") return positions.some((position) => ["Offer 沟通","已录用"].includes(position.stage));
    if (quickView === "attention") return positions.some((position) => position.analysis.includes("待") || position.analysis.includes("尚未") || position.analysis.includes("需要"));
    return true;
  }).slice(0, 3);
  return (
    <>
      <PageHeader eyebrow="全局视角" title="个人求职地图" description="所有岗位都会出现在这里。没有简历时仍可规划目标，上传后再补全证据。" action={<button className={`secondary-button ${filterOpen ? "filter-active" : ""}`} type="button" onClick={() => setFilterOpen(!filterOpen)}><SlidersHorizontal size={16} />筛选视图{(quickView !== "all" || selectedCategories.length > 0) && <span className="filter-count">{selectedCategories.length + (quickView !== "all" ? 1 : 0)}</span>}</button>} />
      {filterOpen && <section className="card map-filter-panel"><div><strong>快捷视图</strong><div className="filter-chips">{([['all','全部目标'],['interview','面试进行中'],['attention','需要优先准备'],['offer','Offer 阶段']] as const).map(([value,label]) => <button className={quickView === value ? "active" : ""} type="button" onClick={() => setQuickView(value)} key={value}>{label}</button>)}</div></div><div><strong>岗位类别</strong><div className="filter-chips">{(["技术","产品","运营","市场"] as Category[]).map((item) => <button className={selectedCategories.includes(item) ? "active" : ""} type="button" onClick={() => toggleCategory(item)} key={item}>{item}</button>)}</div></div><button className="text-button" type="button" onClick={() => { setQuickView("all"); setSelectedCategories([]); }}>清除全部</button></section>}
      {(quickView !== "all" || selectedCategories.length > 0) && <div className="active-filter-row"><span>当前视图</span>{quickView !== "all" && <button type="button" onClick={() => setQuickView("all")}>{quickView === "interview" ? "面试进行中" : quickView === "attention" ? "需要优先准备" : "Offer 阶段"}<X size={12} /></button>}{selectedCategories.map((item) => <button type="button" onClick={() => toggleCategory(item)} key={item}>{item}<X size={12} /></button>)}</div>}
      <div className="map-summary"><span><strong>{companies.length}</strong>目标公司</span><span><strong>{allPositions.length}</strong>具体岗位</span><span><strong>{allPositions.filter((position) => !["感兴趣","未通过","已放弃"].includes(position.stage)).length}</strong>正在准备</span><span><strong>{allPositions.filter((position) => position.analysis.includes("待") || position.analysis.includes("需要")).length}</strong>需要补强</span></div>
      <section className="card career-map"><div className="map-grid" />{visibleCompanies.map((_, index) => <div className={`map-connector ${["c-one","c-two","c-three"][index]}`} key={`line-${index}`} />)}<div className="map-root"><span className="avatar account-avatar large" style={{ background: accountAvatar.background }}>{accountAvatar.label}</span><strong>我的求职目标</strong><small>{visibleCompanies.length} 家公司显示中</small></div>
        {visibleCompanies.map((company, index) => {
          const positions = company.groups.filter((group) => selectedCategories.length === 0 || selectedCategories.includes(group.category)).flatMap((group) => group.positions);
          const featured = positions.find((position) => ["Offer 沟通","已录用"].includes(position.stage)) ?? positions.find((position) => ["一面中","二面中","终面中"].includes(position.stage)) ?? positions[0];
          const categories = company.groups.filter((group) => group.positions.length).map((group) => group.category).join("与");
          return <MapCompany key={company.id} className={["node-byte","node-meituan","node-tencent"][index]} mark={company.mark} name={company.name} subtitle={`${categories || "目标岗位"}方向`} tags={positions.slice(0,3).map((position) => position.title)} stage={featured?.stage ?? "准备中"} status={featured?.analysis ?? "尚未生成分析"} tone={featured?.analysis.includes("待") ? "warning" : "good"} />;
        })}
        {visibleCompanies.length === 0 && <div className="map-no-results"><Map size={28} /><strong>没有符合条件的岗位</strong><p>尝试减少筛选条件或恢复全部目标。</p><button className="text-button" type="button" onClick={() => { setQuickView("all"); setSelectedCategories([]); }}>恢复全部</button></div>}
      </section>
    </>
  );
}

function MapCompany({ className, mark, name, subtitle, tags, stage, status, tone }: { className: string; mark: string; name: string; subtitle: string; tags: string[]; stage: ApplicationStage; status: string; tone: string }) {
  return <a href="/positions" className={`map-company ${className}`}><span className="company-mark map-mark">{mark}</span><div><strong>{name}</strong><small>{subtitle}</small></div><em className={`application-stage ${stageTone(stage)}`}>{stage}</em><div className="map-tags">{tags.map((tag) => <span key={tag}>{tag}</span>)}</div><p><i className={`live-dot ${tone}`} />{status}</p></a>;
}

function AnalysisView({ tab, setTab, data, loading, runningKind, runningPhase, error, run, changeResume, toggleSuggestion, savePreparation, research, researchLoading, researchRunning, researchError, runResearch, live }: { tab: AnalysisTab; setTab: (tab: AnalysisTab) => void; data: PositionAnalysisData | null; loading: boolean; runningKind: AnalysisRunKind | null; runningPhase: AnalysisRunPhase; error: string; run: (kind: AnalysisRunKind, phase?: "core" | "expand") => Promise<void>; changeResume: (resumeVersionId: string) => Promise<void>; toggleSuggestion: (id: string, accepted: boolean) => Promise<void>; savePreparation: (id: string, preparation: QuestionPreparation) => Promise<void>; research: PositionResearchState | null; researchLoading: boolean; researchRunning: boolean; researchError: string; runResearch: (force?: boolean) => Promise<void>; live: boolean }) {
  const [jdOpen, setJdOpen] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [resumeOpen, setResumeOpen] = useState(false);
  const position = data?.position;
  const companyRelation = position?.companies;
  const companyName = Array.isArray(companyRelation) ? companyRelation[0]?.name : companyRelation?.name;
  const categoryName = position ? CATEGORY_FROM_DB[position.category] : "岗位";
  const application = position?.applications?.[0];
  const stage = application ? STAGE_FROM_DB[application.current_stage] ?? "准备中" : "准备中";
  const nextEvent = application?.next_event_at ? new Date(application.next_event_at) : null;
  const hasEvidence = Boolean(data?.evidence.length);
  const hasBenchmark = Boolean(data?.benchmark?.evidence.length);
  const hasUsableJd = Boolean(position?.jd_text && position.jd_text.trim().length >= 80);
  const resumeDocument = Array.isArray(data?.resume?.resume_documents) ? data?.resume?.resume_documents[0] : data?.resume?.resume_documents;
  const latestSubmission = data?.submissions?.[0];
  const latestSubmissionResume = Array.isArray(latestSubmission?.resumes) ? latestSubmission?.resumes[0] : latestSubmission?.resumes;
  const latestSubmissionDocument = Array.isArray(latestSubmissionResume?.resume_documents) ? latestSubmissionResume?.resume_documents[0] : latestSubmissionResume?.resume_documents;
  const activeRun = data?.meta?.activeRun;
  const persistedRunning = Boolean(activeRun && !activeRun.stalled);
  const effectiveKind = runningKind ?? (persistedRunning ? activeRun?.kind ?? null : null);
  const effectivePhase = runningPhase ?? (persistedRunning ? activeRun?.phase ?? null : null);
  const running = Boolean(runningKind) || persistedRunning;
  const modelLabel = data?.meta?.model?.startsWith("deepseek") ? "DeepSeek" : "AI";
  const actionLabel = running ? "正在分析" : activeRun?.stalled ? "重新开始" : hasEvidence ? "重新生成 JD 分析" : "分析当前 JD";
  const exportReport = () => {
    if (!data?.position) return;
    const evidenceStatus = { strong: "证据充分", partial: "部分支持", missing: "暂无证据" } as const;
    const lines = [
      `# ${companyName ?? "目标公司"} · ${data.position.title} 求职准备包`,
      "",
      `生成时间：${new Date().toLocaleString("zh-CN", { timeZone: DISPLAY_TIME_ZONE })}`,
      `岗位类别：${categoryName}`,
      `地点 / 部门：${[data.position.location, data.position.department].filter(Boolean).join(" / ") || "未填写"}`,
      `母版简历：${data.resume ? `${data.resume.name} · v${data.resume.version}` : "未关联"}`,
      "",
      "## 完整 JD",
      "",
      data.position.jd_text,
      "",
      "## 证据地图",
      "",
      ...data.evidence.flatMap((item, index) => {
        const relation = firstRelation(item);
        const quotes = resumeQuotesFrom(item);
        return [`### ${index + 1}. ${item.requirement}`, "", `- 状态：${evidenceStatus[relation?.status ?? "missing"]}`, `- JD 原文：${item.jd_quote}`, `- 简历证据：${quotes.length ? quotes.join("；") : "暂无"}`, `- 判断：${relation?.rationale ?? "暂无"}`, `- 补强动作：${relation?.action ?? "暂无"}`, ""];
      }),
      "## 定制简历建议",
      "",
      ...(data.suggestions.length ? data.suggestions.flatMap((item, index) => [`### ${index + 1}. ${item.action === "rewrite" ? "改写" : item.action === "keep" ? "保留" : item.action === "add" ? "补充" : "弱化"}`, "", `- 母版原文：${item.original_text}`, `- 建议版本：${item.edited_text || item.suggested_text}`, `- 修改理由：${item.reason}`, `- 面试风险：${item.risk}`, ""]) : ["尚未生成定制简历建议。", ""]),
      "## 面试追问地图",
      "",
      ...(data.questions.length ? data.questions.flatMap((item, index) => [`### ${index + 1}. ${item.main_question}`, "", `- 优先级：${item.priority === "high" ? "高" : item.priority === "medium" ? "中" : "低"} · ${item.priority_reason}`, `- 考察意图：${item.intent}`, `- 递进追问：${(item.question_followups ?? []).map((followup) => followup.question).join("；") || "暂无"}`, `- 回答结构：${item.answer_structure.join(" → ")}`, `- 需要补充：${item.missing_information || "暂无"}`, `- 回答风险：${item.risk}`, `- 准备状态：${item.preparation?.status === "ready" ? "已完成" : item.preparation?.status === "drafting" ? "准备中" : "未准备"}`, `- 回答草稿：${item.preparation?.answerDraft || "尚未填写"}`, `- 真实案例：${item.preparation?.realExample || "尚未填写"}`, `- 关键数据：${item.preparation?.keyMetrics || "尚未填写"}`, `- 补充笔记：${item.preparation?.notes || "尚未填写"}`, ""]) : ["尚未生成面试追问地图。", ""]),
    ];
    const blob = new Blob([lines.join("\n")], { type: "text/markdown;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${companyName ?? "OfferMap"}-${data.position.title}-求职准备包.md`.replace(/[\\/:*?"<>|]/g, "-");
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  };
  return (
    <>
      <div className="analysis-heading"><div><div className="breadcrumb"><a href="/positions">{companyName ?? (live ? "目标岗位" : "字节跳动")}</a><ChevronRight size={13} /><span>{live ? categoryName : "产品"}</span><ChevronRight size={13} /><span>{position?.title ?? (live ? "岗位分析" : "AI 产品经理实习生")}</span></div><h1>{position?.title ?? (live ? "岗位分析" : "AI 产品经理实习生")}</h1><p>{position ? [position.location, position.department, position.job_code].filter(Boolean).join(" · ") || "岗位信息已保存" : live ? "正在读取岗位与简历数据" : "北京 · Flow 产品团队 · JD-2026-0821"}</p></div>{(!live || position) && <div className="analysis-heading-actions"><button className="secondary-button icon-only-desktop" type="button" onClick={() => setHistoryOpen(true)} title="分析记录"><History size={15} /><span>分析记录</span></button><button className="secondary-button icon-only-desktop" type="button" onClick={exportReport} disabled={!hasEvidence && !hasBenchmark} title="导出准备包"><Download size={15} /><span>导出准备包</span></button><button className="secondary-button" type="button" onClick={() => setJdOpen(true)}><PanelRightOpen size={15} />岗位信息与 JD</button><button className="primary-button" type="button" onClick={() => void run(hasUsableJd ? "evidence" : "benchmark")} disabled={running || loading}>{running ? <LoaderCircle className="state-spinner inline" size={15} /> : <RefreshCw size={15} />}{hasUsableJd ? actionLabel : hasBenchmark ? "重新生成通用画像" : "生成通用能力画像"}</button></div>}</div>
      {position && <section className="card analysis-scope-bar"><div><span>当前分析简历</span><strong>{data?.resume ? `${resumeDocument?.name || data.resume.name} · v${data.resume.document_version ?? data.resume.version}` : "尚未选择"}</strong><small>{data?.resume ? resumeDocument?.direction || "未设置求职方向" : "先选择一份简历再开始分析"}</small></div><button className="secondary-button compact" type="button" onClick={() => setResumeOpen(true)}>{data?.resume ? "更换分析简历" : "选择分析简历"}</button><div><span>当前分析基准</span><strong>{hasUsableJd ? `当前 JD · 修订 ${position.position_revision ?? 1}` : "岗位通用能力画像"}</strong><small>{hasUsableJd ? "来自你保存的完整 JD" : "来自岗位族样本，不代表当前公司明确要求"}</small></div><div><span>最近实际投递</span><strong>{latestSubmissionResume ? `${latestSubmissionDocument?.name || latestSubmissionResume.name} · v${latestSubmissionResume.document_version ?? latestSubmissionResume.version}` : "尚未记录"}</strong><small>{latestSubmission ? formatDisplayDate(latestSubmission.submitted_at) : "进入已投递阶段时自动留档"}</small></div></section>}
      {loading && <section className="card analysis-state-card"><LoaderCircle className="state-spinner" size={28} /><div><strong>正在读取岗位分析</strong><p>正在同步 JD、简历版本和已保存的证据。</p></div></section>}
      {error && <section className="analysis-inline-error"><AlertCircle size={16} /><span>{error}</span>{position && !running && tab !== "research" && <button type="button" onClick={() => void run(tab === "preparation" ? "interview" : tab)}>重试分析</button>}</section>}
      {activeRun?.stalled && !runningKind && <section className="analysis-stalled-card"><AlertCircle size={17} /><div><strong>上次分析没有正常结束</strong><p>已保留现有结果，不会继续占用调用；可以从当前模块安全重新开始。</p></div><button className="secondary-button compact" type="button" onClick={() => void run(activeRun.kind)}>重新开始</button></section>}
      {position && <section className="card application-progress"><div className="progress-heading"><div><span>求职进度</span><strong>{nextEvent && !Number.isNaN(nextEvent.getTime()) ? `下一安排：${formatDisplayDate(nextEvent, true)}${application?.next_event_type ? ` · ${application.next_event_type}` : ""}` : "还没有设置下一安排"}</strong></div><span className={`application-stage ${stageTone(stage)}`}>{stage}</span></div><div className={`analysis-run-note ${position.analysis_status}`}><Sparkles size={14} /><span><strong>分析状态：</strong>{running || position.analysis_status === "processing" ? "AI 正在拆解能力要求、召回候选经历并进行深度判断。" : position.analysis_status === "ready" ? `${modelLabel} 证据地图已保存${position.analyzed_resume_version ? `，对应母版简历 v${position.analyzed_resume_version}` : ""}。` : position.analysis_status === "stale" ? "简历或 JD 已更新，需要重新生成证据地图。" : position.analysis_status === "failed" ? "上次分析没有通过校验，可以重新生成。" : "尚未生成证据地图。"}</span></div></section>}
      {live && position && !loading && !hasEvidence && !hasBenchmark && !running && <section className="card analysis-empty-card"><span><WandSparkles size={25} /></span><h2>{!data?.resume ? "先选择用于这个岗位的简历" : hasUsableJd ? "开始串联这份 JD 与当前简历" : "先从岗位通用能力开始"}</h2><p>{!data?.resume ? "岗位与简历是独立管理的。选择具体简历版本后，所有分析与实际投递都会冻结版本来源。" : hasUsableJd ? "AI 会按语义理解岗位能力与真实经历，允许跨措辞和多条证据组合；所有引用仍会在保存前校验。" : "这个岗位还没有完整 JD。系统会基于岗位族、行业和职级生成通用能力画像，并明确标注它不等于当前公司的真实要求。"}</p><button className="primary-button" type="button" onClick={() => data?.resume ? void run(hasUsableJd ? "evidence" : "benchmark") : setResumeOpen(true)}><Sparkles size={15} />{!data?.resume ? "选择分析简历" : hasUsableJd ? "开始深度分析" : "生成通用能力画像"}</button></section>}
      {running && <section className="card analysis-running-card"><div className="analysis-running-icon"><LoaderCircle className="state-spinner" size={24} /></div><div><strong>{effectiveKind === "resume" ? effectivePhase === "expand" ? "正在按需补充定制建议" : "正在生成岗位定制简历" : effectiveKind === "interview" ? effectivePhase === "expand" ? "正在按需补充面试问题" : "正在生成核心面试追问" : effectiveKind === "benchmark" ? "正在生成岗位通用能力画像" : "正在生成深度证据地图"}</strong><p>{persistedRunning && !runningKind ? "分析任务已经保存在账号中，你可以刷新或离开页面，回来后会自动恢复查看进度。" : effectiveKind === "resume" ? effectivePhase === "expand" ? "只补充尚未覆盖且确实值得改写的经历，不会重复套用已有建议。" : "快速完成语义判断、针对性改写和来源校验，优先返回最有价值的内容。" : effectiveKind === "interview" ? effectivePhase === "expand" ? "只补充新的考察角度，已有核心问题仍可正常查看。" : "优先生成最可能被问到的高价值问题，并一次完成来源校验。" : effectiveKind === "benchmark" ? "正在用岗位族、行业与职级画像评估当前简历，并区分通用基准与公司真实 JD。" : "正在拆解 JD、召回语义相近经历、组合多条证据并复核判断。"}</p><div className="loading-track"><span /></div></div></section>}
      {(!live || position) && <>
      <div className="analysis-tabs" role="tablist">{([['evidence','当前 JD'],['benchmark','岗位通用能力'],['research','岗位情报'],['resume','定制简历'],['interview','面试追问地图'],['preparation','回答准备']] as Array<[AnalysisTab,string]>).map(([key,label]) => <button type="button" role="tab" aria-selected={tab === key} className={tab === key ? "active" : ""} onClick={() => setTab(key)} key={key}>{label}{key === "preparation" && data?.questions?.length ? <small>{data.questions.filter((item) => item.preparation?.status === "ready").length}/{data.questions.length}</small> : null}</button>)}</div>
      {tab === "evidence" && (live ? hasEvidence ? <EvidencePanel items={data?.evidence} onNavigate={setTab} /> : <PendingAnalysisModule title={hasUsableJd ? "生成当前 JD 证据地图" : "当前岗位还没有完整 JD"} body={hasUsableJd ? "将这份岗位 JD 与当前绑定的简历版本做语义对应，并保留可定位的原文引用。" : "你可以先查看岗位通用能力，或前往岗位信息补充完整 JD 后再做公司级分析。"} action={hasUsableJd ? "分析当前 JD" : "查看岗位通用能力"} onAction={hasUsableJd ? () => run("evidence") : async () => setTab("benchmark")} running={effectiveKind === "evidence"} /> : <EvidencePanel />)}
      {tab === "benchmark" && (live ? <BenchmarkPanel benchmark={data?.benchmark} onGenerate={() => run("benchmark")} running={effectiveKind === "benchmark"} /> : <BenchmarkPanel />)}
      {tab === "research" && <ResearchPanel state={research} loading={researchLoading} running={researchRunning} error={researchError} onResearch={runResearch} />}
      {tab === "resume" && (live ? data?.suggestions?.length ? <ResumeSuggestionsPanel items={data.suggestions} resume={data.resume} onToggle={toggleSuggestion} onRegenerate={() => run("resume", "core")} onExpand={() => run("resume", "expand")} running={effectiveKind === "resume"} /> : data?.meta?.resumeCompleted ? <NoResumeChanges onRegenerate={() => run("resume", "core")} running={effectiveKind === "resume"} /> : <PendingAnalysisModule title="生成岗位定制版简历" body="保留当前简历的完整结构，只对与 JD 最相关的经历做有针对性的重新表达；同一条经历只改写一次。" action="生成定制简历" onAction={() => run("resume", "core")} running={effectiveKind === "resume"} /> : <ResumeSuggestionsPanel />)}{tab === "interview" && (live ? data?.questions?.length ? <InterviewPanel items={data.questions} evidence={data.evidence} onRegenerate={() => run("interview", "core")} onExpand={() => run("interview", "expand")} running={effectiveKind === "interview"} /> : <PendingAnalysisModule title="生成面试追问地图" body="从高优先级 JD、突出经历和能力缺口生成主问题、递进追问、回答结构与风险提示。" action="生成追问地图" onAction={() => run("interview", "core")} running={effectiveKind === "interview"} /> : <InterviewPanel />)}
      {tab === "preparation" && (live ? data?.questions?.length ? <AnswerPreparationPanel items={data.questions} evidence={data.evidence} save={savePreparation} /> : <PendingAnalysisModule title="先生成面试追问地图" body="回答准备会直接关联每一道面试问题。先生成追问地图，再补充你的真实案例、关键数据和回答草稿。" action="生成追问地图" onAction={() => run("interview")} running={effectiveKind === "interview"} /> : <AnswerPreparationPanel items={demoInterviewQuestionRecords()} evidence={[]} save={async () => {}} />)}
      </>}
      {jdOpen && <JobDetailDrawer position={position} companyName={companyName ?? "字节跳动"} categoryName={live ? categoryName : "产品"} close={() => setJdOpen(false)} />}
      {historyOpen && <AnalysisHistoryDrawer history={data?.meta?.history ?? []} close={() => setHistoryOpen(false)} />}
      {resumeOpen && <ResumeBindingDrawer options={data?.resumeOptions ?? []} currentId={data?.resume?.id ?? ""} close={() => setResumeOpen(false)} change={async (versionId) => { await changeResume(versionId); setResumeOpen(false); }} />}
    </>
  );
}

function ResearchPanel({ state, loading, running, error, onResearch }: { state: PositionResearchState | null; loading: boolean; running: boolean; error: string; onResearch: (force?: boolean) => Promise<void> }) {
  const research = state?.research;
  const sourceById = new globalThis.Map((research?.sources ?? []).map((source) => [source.id, source] as const));
  const categoryLabel = { company: "公司与业务", role: "岗位理解", interview: "公开面试信息", action: "准备动作" } as const;
  const sourceTypeLabel = { company: "公司信息", recruiting: "招聘信息", interview: "公开经验" } as const;
  const confidenceLabel = { high: "较可靠", medium: "需交叉确认", low: "仅作线索" } as const;
  if (loading) return <section className="card research-state-card"><LoaderCircle className="state-spinner" size={28} /><div><strong>正在读取岗位情报</strong><p>同步已保存的网页来源和研究结论。</p></div></section>;
  if (!research) return <section className="card analysis-empty-card module-pending research-empty"><span><Globe2 size={25} /></span><h2>联网研究这个岗位</h2><p>{state?.configured === false ? "联网搜索服务尚未配置，配置后即可从公开网页研究公司、岗位和面试信息。" : "搜索公司业务、公开招聘信息和面试经验，并为每条结论保留原网页来源。不会把你的简历发送给搜索服务。"}</p>{error && <div className="research-error"><AlertCircle size={14} />{error}</div>}<button className="primary-button" type="button" onClick={() => void onResearch(false)} disabled={running || state?.configured === false}>{running ? <LoaderCircle className="state-spinner inline" size={15} /> : <Globe2 size={15} />}{running ? "正在联网研究" : "生成岗位情报"}</button></section>;
  return <div className="research-layout"><div className="analysis-list"><section className="card research-overview"><div className="research-overview-head"><div><span>联网岗位研究</span><h2>公开信息摘要</h2></div><button className="secondary-button compact" type="button" onClick={() => void onResearch(true)} disabled={running}>{running ? <LoaderCircle className="state-spinner inline" size={13} /> : <RefreshCw size={13} />}更新情报</button></div><p>{research.overview}</p><div className="research-meta"><span>{research.sources.length} 个公开来源</span><span>更新于 {formatDisplayDate(research.generatedAt, true)}</span>{state?.stale && <em>岗位信息已更新，建议重新搜索</em>}</div><div className="research-trust-note"><ShieldCheck size={15} /><p>联网材料只用于岗位研究，不会替代 JD，也不会被当作你的简历证据。公开面经属于个人经验，请以实际通知为准。</p></div></section>{error && <section className="analysis-inline-error"><AlertCircle size={16} /><span>{error}</span><button type="button" onClick={() => void onResearch(true)}>重新搜索</button></section>}{research.insights.map((insight) => <article className="card research-insight" key={insight.id}><div className="research-insight-head"><span>{categoryLabel[insight.category]}</span><em className={`research-confidence ${insight.confidence}`}>{confidenceLabel[insight.confidence]}</em></div><h2>{insight.title}</h2><p>{insight.summary}</p>{insight.caveat && <div className="research-caveat"><AlertCircle size={13} /><span>{insight.caveat}</span></div>}<div className="research-citations">{insight.sourceIds.map((sourceId) => { const source = sourceById.get(sourceId); return source ? <a href={source.url} target="_blank" rel="noreferrer" key={sourceId}><ExternalLink size={11} />{source.id} · {source.domain}</a> : null; })}</div></article>)}</div><aside className="card source-panel research-sources"><div className="source-heading"><div><h2>公开来源</h2><p>所有结论都能回到原网页</p></div><Globe2 size={18} /></div><div className="research-source-list">{research.sources.map((source) => <a href={source.url} target="_blank" rel="noreferrer" key={source.id}><div><span>{source.id} · {sourceTypeLabel[source.sourceType]}</span><ExternalLink size={12} /></div><strong>{source.title}</strong><small>{source.domain}{source.publishedDate ? ` · ${source.publishedDate.slice(0, 10)}` : ""}</small><p>{source.excerpt}</p></a>)}</div></aside></div>;
}

function BenchmarkPanel({ benchmark, onGenerate, running = false }: { benchmark?: PositionAnalysisData["benchmark"]; onGenerate?: () => Promise<void>; running?: boolean }) {
  const [selectedId, setSelectedId] = useState(benchmark?.evidence?.[0]?.id ?? "");
  const profile = benchmark?.profile;
  const taxonomy = Array.isArray(profile?.role_taxonomies) ? profile?.role_taxonomies[0] : profile?.role_taxonomies;
  const items = benchmark?.evidence ?? [];
  const selected = items.find((item) => item.id === selectedId) ?? items[0];
  const selectedRequirement = Array.isArray(selected?.role_requirements) ? selected?.role_requirements[0] : selected?.role_requirements;
  const statusLabel = { strong: "证据充分", partial: "部分支持", missing: "暂无证据", uncertain: "待确认" } as const;
  const tone = { strong: "good", partial: "partial", missing: "missing", uncertain: "uncertain" } as const;
  const prevalenceLabel = { high: "高频出现", common: "常见要求", occasional: "部分岗位出现", low: "较少出现" } as const;
  if (!items.length) return <PendingAnalysisModule title="生成岗位通用能力画像" body="基于标准岗位族、行业与职级样本，判断当前简历对通用能力的支持情况。结果会与当前公司的真实 JD 严格区分。" action="生成通用能力画像" onAction={onGenerate ?? (async () => {})} running={running} />;
  const commonStrengths = items.filter((item) => item.status === "strong").slice(0, 3).map((item) => Array.isArray(item.role_requirements) ? item.role_requirements[0]?.label : item.role_requirements?.label).filter(Boolean);
  const commonGaps = items.filter((item) => item.status === "missing" || item.status === "partial").filter((item) => { const requirement = Array.isArray(item.role_requirements) ? item.role_requirements[0] : item.role_requirements; return requirement?.prevalence_level === "high" || requirement?.prevalence_level === "common"; }).slice(0, 3).map((item) => Array.isArray(item.role_requirements) ? item.role_requirements[0]?.label : item.role_requirements?.label).filter(Boolean);
  return <div className="analysis-layout benchmark-layout"><div className="analysis-list"><section className="card benchmark-profile-head"><div><span>岗位通用能力画像 · v{profile?.version ?? 1}</span><h2>{taxonomy?.canonical_title || "标准岗位画像"}</h2><p>{[profile?.industry, profile?.seniority === "intern" ? "实习" : profile?.seniority === "campus" ? "校招" : profile?.seniority, profile?.product_type].filter(Boolean).join(" · ")}</p></div><button className="secondary-button compact" type="button" onClick={() => void onGenerate?.()} disabled={running}><RefreshCw size={13} />重新生成</button><div className="benchmark-disclaimer"><ShieldCheck size={15} /><p><strong>这是市场通用基准</strong>用于没有完整 JD 时建立准备方向，不代表当前公司明确提出了这些要求。</p></div><small>{profile?.source_summary || "基于岗位族能力词典与匿名岗位样本归纳"} · 画像生成于 {profile?.generated_at ? formatDisplayDate(profile.generated_at) : "当前版本"}</small></section><section className="card benchmark-strategy"><div><small>长期可复用优势</small><strong>{commonStrengths.join("、") || "暂未识别出证据充分的通用能力"}</strong></div><div><small>跨公司高频缺口</small><strong>{commonGaps.join("、") || "暂无明显高频缺口"}</strong></div><p>通用能力用于规划长期准备；当前公司的投递判断仍以“当前 JD”页为准。</p></section>{items.map((item) => { const requirement = Array.isArray(item.role_requirements) ? item.role_requirements[0] : item.role_requirements; return <article className={`card evidence-card ${selected?.id === item.id ? "selected" : ""}`} key={item.id}><div className="evidence-top"><div><span>{requirement?.category || "通用能力"} · {requirement ? prevalenceLabel[requirement.prevalence_level] : "样本能力"}</span><h2>{requirement?.label || "岗位能力"}</h2></div><em className={`evidence-status ${tone[item.status]}`}>{statusLabel[item.status]}</em></div>{requirement?.description && <p className="benchmark-description">{requirement.description}</p>}<div className="evidence-quotes">{item.resume_quotes?.length ? item.resume_quotes.map((quote, index) => <blockquote key={`${item.id}-${index}`}><small>简历证据 {index + 1}</small>{quote}</blockquote>) : <blockquote>当前简历中还没有可以稳定引用的直接证据。</blockquote>}</div><p>{item.rationale}</p><div className="evidence-action"><strong>{item.status === "uncertain" ? "需要你确认" : "建议动作"}</strong><p>{item.missing_information || item.action}</p></div><button className="text-button" type="button" onClick={() => setSelectedId(item.id)}>查看画像依据 <ArrowRight size={14} /></button></article>; })}</div><aside className="card source-panel benchmark-source"><div className="source-title"><span>画像依据</span><FileCheck2 size={18} /></div><div className="source-block"><strong>通用能力</strong><p>{selectedRequirement?.label || "请选择一项能力"}</p></div><div className="source-block"><strong>依据类型</strong><p>{selectedRequirement ? selectedRequirement.source_count > 0 ? `${prevalenceLabel[selectedRequirement.prevalence_level]} · ${selectedRequirement.source_count} 个合规来源` : `${prevalenceLabel[selectedRequirement.prevalence_level]} · OfferMap 人工岗位族种子库` : "暂无"}</p></div><div className="source-block"><strong>当前简历证据</strong>{selected?.resume_quotes?.length ? selected.resume_quotes.map((quote, index) => <p className="highlight" key={index}>{quote}</p>) : <p>暂无可引用证据</p>}</div></aside></div>;
}

function ResumeBindingDrawer({ options, currentId, close, change }: { options: ResumeOption[]; currentId: string; close: () => void; change: (versionId: string) => Promise<void> }) {
  const [selectedId, setSelectedId] = useState(currentId || options[0]?.versionId || "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const grouped = useMemo(() => [...new globalThis.Map<string, { name: string; direction: string; options: ResumeOption[] }>(options.map((option) => [option.documentId, { name: option.documentName, direction: option.direction, options: options.filter((item) => item.documentId === option.documentId) }])).values()], [options]);
  const recommendedId = options.length > 1 ? [...options].sort((a, b) => (b.score ?? -999) - (a.score ?? -999))[0]?.versionId : options[0]?.versionId;
  const submit = async () => {
    if (!selectedId || selectedId === currentId) { close(); return; }
    setSaving(true); setError("");
    try { await change(selectedId); }
    catch (changeError) { setError(changeError instanceof Error ? changeError.message : "切换简历失败"); setSaving(false); }
  };
  return <div className="jd-drawer-backdrop" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && !saving && close()}><aside className="jd-drawer resume-binding-drawer" role="dialog" aria-modal="true" aria-labelledby="resume-binding-title"><header><div><span className="jd-drawer-icon"><FileText size={19} /></span><div><p>岗位分析范围</p><h2 id="resume-binding-title">选择分析简历</h2></div></div><button className="icon-button" type="button" onClick={close} disabled={saving} aria-label="关闭"><X size={19} /></button></header><div className="jd-drawer-body"><section className="resume-binding-notice"><History size={16} /><p>切换后会为新简历生成新的分析结果；旧简历的分析记录与实际投递快照不会被覆盖。</p></section>{grouped.length ? <div className="resume-binding-groups">{grouped.map((group) => <section key={`${group.name}-${group.direction}`}><div><h3>{group.name}</h3><p>{group.direction || "未设置求职方向"}</p></div>{group.options.map((option) => <button className={selectedId === option.versionId ? "selected" : ""} type="button" onClick={() => setSelectedId(option.versionId)} key={option.versionId}><span><strong>v{option.version}</strong><small>{formatDisplayDate(option.updatedAt)}</small></span><p>{option.reason || option.fileName}</p><div>{option.versionId === currentId && <em>当前分析</em>}{option.versionId === recommendedId && <em className="recommend">系统推荐</em>}{selectedId === option.versionId && <Check size={16} />}</div></button>)}</section>)}</div> : <section className="history-empty"><FileText size={27} /><strong>还没有可选简历</strong><p>先去简历库上传一份 PDF。</p></section>}{error && <p className="form-error"><AlertCircle size={14} />{error}</p>}</div><footer><button className="secondary-button" type="button" onClick={close} disabled={saving}>取消</button><button className="primary-button" type="button" onClick={() => void submit()} disabled={saving || !selectedId}>{saving ? <><LoaderCircle className="state-spinner inline" size={14} />切换中</> : "确认用于这个岗位"}</button></footer></aside></div>;
}

function AnalysisHistoryDrawer({ history, close }: { history: AnalysisRunRecord[]; close: () => void }) {
  const taskLabel = (task: string) => task === "evidence" ? "当前 JD 证据地图" : task === "benchmark" ? "岗位通用能力画像" : task === "resume-core" ? "定制简历 · 核心" : task === "resume-expand" ? "定制简历 · 补充" : task === "interview-core" ? "面试地图 · 核心" : task === "interview-expand" ? "面试地图 · 补充" : task;
  const statusLabel = { processing: "分析中", ready: "已完成", failed: "未完成" } as const;
  const completed = history.filter((item) => item.status === "ready").length;
  return <div className="jd-drawer-backdrop" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && close()}><aside className="jd-drawer analysis-history-drawer" role="dialog" aria-modal="true" aria-labelledby="analysis-history-title"><header><div><span className="jd-drawer-icon history-icon"><History size={19} /></span><div><p>岗位分析档案</p><h2 id="analysis-history-title">分析记录</h2></div></div><button className="icon-button" type="button" onClick={close} aria-label="关闭分析记录"><X size={19} /></button></header><div className="jd-drawer-body"><section className="history-summary"><div><strong>{history.length}</strong><span>最近运行</span></div><div><strong>{completed}</strong><span>成功完成</span></div><div><strong>{new Set(history.map((item) => item.model)).size}</strong><span>使用模型</span></div></section>{history.length ? <div className="history-list">{history.map((item) => { const tokens = (item.input_tokens ?? 0) + (item.output_tokens ?? 0); return <article key={item.id}><span className={`history-status ${item.status}`}><i />{statusLabel[item.status]}</span><div><h3>{taskLabel(item.task)}</h3><p>{item.model} · {formatDisplayDate(item.created_at, true)}</p><small>{[item.position_revision ? `JD 修订 ${item.position_revision}` : "", item.resume_version_id ? "已冻结简历版本" : "", item.role_profile_version ? `画像 v${item.role_profile_version}` : ""].filter(Boolean).join(" · ")}</small>{item.status === "failed" && item.error_code && !item.error_code.startsWith("running:") && <small>{item.error_code === "stalled:auto-released" ? "任务等待时间过长，已安全释放，可重新生成。" : item.error_code}</small>}</div><div className="history-metrics">{item.duration_ms ? <span>{Math.max(1, Math.round(item.duration_ms / 1000))} 秒</span> : null}{tokens > 0 ? <span>{tokens.toLocaleString()} tokens</span> : null}</div></article>; })}</div> : <section className="history-empty"><History size={27} /><strong>还没有分析记录</strong><p>生成证据地图、定制简历或面试追问后，会在这里留下运行档案。</p></section>}</div><footer><p>每次记录冻结当时的岗位修订、简历版本和岗位画像版本。</p><button className="primary-button" type="button" onClick={close}>完成</button></footer></aside></div>;
}

function JobDetailDrawer({ position, companyName, categoryName, close }: { position?: AnalysisPosition; companyName: string; categoryName: string; close: () => void }) {
  const [copied, setCopied] = useState(false);
  const title = position?.title ?? "AI 产品经理实习生";
  const jd = position?.jd_text ?? "岗位职责：负责 AI 产品需求分析、方案设计与跨团队推进；结合用户反馈和数据持续优化产品体验。\n\n岗位要求：具备良好的用户洞察、产品设计和项目协作能力，有 AI 产品或大模型应用项目经验优先。";
  const copyJd = async () => {
    await navigator.clipboard.writeText(jd);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1600);
  };
  return <div className="jd-drawer-backdrop" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && close()}><aside className="jd-drawer" role="dialog" aria-modal="true" aria-labelledby="jd-drawer-title"><header><div><span className="jd-drawer-icon"><BriefcaseBusiness size={19} /></span><div><p>{companyName} · {categoryName}</p><h2 id="jd-drawer-title">{title}</h2></div></div><button className="icon-button" type="button" onClick={close} aria-label="关闭岗位信息"><X size={19} /></button></header><div className="jd-drawer-body"><section className="jd-meta-grid"><div><span>公司</span><strong>{companyName}</strong></div><div><span>岗位类别</span><strong>{categoryName}</strong></div><div><span>工作地点</span><strong>{position?.location || "未填写"}</strong></div><div><span>部门</span><strong>{position?.department || "未填写"}</strong></div>{position?.job_code && <div><span>岗位编号</span><strong>{position.job_code}</strong></div>}</section><section className="jd-full-text"><div><h3>完整 JD 原文</h3><span>{jd.length} 字</span></div><pre>{jd}</pre></section></div><footer><a className="secondary-button" href="/positions"><PencilLine size={14} />前往岗位管理</a><button className="primary-button" type="button" onClick={() => void copyJd()}><Copy size={14} />{copied ? "已复制" : "复制完整 JD"}</button></footer></aside></div>;
}

function firstRelation(item: AnalysisEvidenceItem) {
  const relation = item.requirement_evidence;
  return Array.isArray(relation) ? relation[0] : relation ?? null;
}

function relationsFrom(item: AnalysisEvidenceItem) {
  const relation = item.requirement_evidence;
  return Array.isArray(relation) ? relation : relation ? [relation] : [];
}

function resumeQuotesFrom(item: AnalysisEvidenceItem) {
  return relationsFrom(item).flatMap((relation) => {
    const source = relation.evidence_items;
    return Array.isArray(source) ? source.map((entry) => entry.resume_quote) : source?.resume_quote ? [source.resume_quote] : [];
  }).filter((quote, index, all) => quote && all.indexOf(quote) === index);
}

function EvidencePanel({ items, onNavigate }: { items?: AnalysisEvidenceItem[]; onNavigate?: (tab: AnalysisTab) => void }) {
  const [selectedId, setSelectedId] = useState(items?.[0]?.id ?? "");
  if (!items) return <div className="analysis-layout"><div className="analysis-list"><div className="analysis-summary card"><div><span>高优先级要求</span><strong>3 / 4 已覆盖</strong></div><div><span>全部 JD 要求</span><strong>7 / 10 已覆盖</strong></div><p>不使用虚假的百分制匹配度，只展示可解释的证据状态。</p></div>{evidence.map((item) => <article className="card evidence-card" key={item.title}><div className="evidence-top"><div><span>{item.type}</span><h2>{item.title}</h2></div><em className={`evidence-status ${item.tone}`}>{item.status}</em></div><blockquote>{item.quote}</blockquote><p>{item.reason}</p><button className="text-button" type="button">查看补强动作 <ArrowRight size={14} /></button></article>)}</div><SourcePanel jdQuote="参与 AI 创作工具的产品设计，能够独立完成用户需求分析与产品方案设计" resumeQuote="负责校园内容社区从 0 到 1 的需求调研、原型设计和两轮迭代" /></div>;
  const selected = items.find((item) => item.id === selectedId) ?? items[0];
  const covered = items.filter((item) => firstRelation(item)?.status !== "missing").length;
  const highPriority = items.filter((item) => item.importance === "high");
  const coveredHigh = highPriority.filter((item) => firstRelation(item)?.status !== "missing").length;
  const strongItems = items.filter((item) => firstRelation(item)?.status === "strong");
  const criticalGaps = highPriority.filter((item) => firstRelation(item)?.status !== "strong");
  const verdict = criticalGaps.some((item) => firstRelation(item)?.status === "missing")
    ? { title: "可以投，但先处理关键缺口", body: "高优先级要求中仍有简历无法证明的部分。先补齐真实信息并准备缺口题，不要靠改写掩盖。" }
    : criticalGaps.length
      ? { title: "具备相关基础，重点补深度", body: "核心方向能够对应，但个人贡献、方法或结果仍可能被追问。优先把部分支持项准备完整。" }
      : { title: "可以进入重点面试准备", body: "高优先级要求已有较完整证据。下一步应验证细节、边界与方案权衡，而不是继续堆关键词。" };
  const kindLabel = { required: "必备要求", preferred: "加分要求", responsibility: "岗位职责" } as const;
  const statusLabel = { strong: "证据充分", partial: "部分支持", missing: "暂无证据" } as const;
  const tone = { strong: "good", partial: "partial", missing: "missing" } as const;
  return <div className="analysis-layout"><div className="analysis-list"><section className="card job-strategy-card"><div className="job-strategy-heading"><span>岗位准备结论</span><h2>{verdict.title}</h2><p>{verdict.body}</p></div><div className="job-strategy-grid"><div><small>最可用的真实优势</small><strong>{strongItems.slice(0, 2).map((item) => item.requirement).join("、") || "暂未识别出证据充分项"}</strong></div><div><small>最需要先处理</small><strong>{criticalGaps.slice(0, 2).map((item) => item.requirement).join("、") || "暂无高优先级缺口"}</strong></div></div><div className="job-strategy-actions"><button className="secondary-button compact" type="button" onClick={() => onNavigate?.("resume")}><PencilLine size={14} />优化定制简历</button><button className="primary-button compact" type="button" onClick={() => onNavigate?.("interview")}><Target size={14} />准备高风险问题</button></div></section><div className="analysis-summary card"><div><span>高优先级要求</span><strong>{coveredHigh} / {highPriority.length} 有相关证据</strong></div><div><span>全部 JD 要求</span><strong>{covered} / {items.length} 有相关证据</strong></div><p>覆盖不等于胜任；部分支持仍会明确显示缺失维度。</p></div>{items.map((item) => {
    const relation = firstRelation(item);
    const status = relation?.status ?? "missing";
    const resumeQuotes = resumeQuotesFrom(item);
    return <article className={`card evidence-card ${selected?.id === item.id ? "selected" : ""}`} key={item.id}><div className="evidence-top"><div><span>{kindLabel[item.kind]} · {item.importance === "high" ? "高优先级" : item.importance === "medium" ? "中优先级" : "低优先级"}</span><h2>{item.requirement}</h2></div><em className={`evidence-status ${tone[status]}`}>{statusLabel[status]}</em></div><div className="evidence-quotes">{resumeQuotes.length ? resumeQuotes.map((quote, index) => <blockquote key={`${item.id}-${index}`}><small>证据 {index + 1}</small>{quote}</blockquote>) : <blockquote>母版简历中未找到可以直接引用的事实性证据。</blockquote>}</div><p>{relation?.rationale ?? "暂无判断理由"}</p><div className="evidence-action"><strong>补强动作</strong><p>{relation?.action ?? "补充能够验证该要求的真实经历。"}</p></div><button className="text-button" type="button" onClick={() => setSelectedId(item.id)}>查看原文引用 <ArrowRight size={14} /></button></article>;
  })}</div><SourcePanel jdQuote={selected?.jd_quote ?? ""} resumeQuotes={selected ? resumeQuotesFrom(selected) : []} /></div>;
}

function PendingAnalysisModule({ title, body, action, onAction, running = false }: { title: string; body: string; action: string; onAction: () => Promise<void>; running?: boolean }) {
  return <section className="card analysis-empty-card module-pending"><span><Sparkles size={23} /></span><h2>{title}</h2><p>{body}</p><button className="primary-button" type="button" onClick={() => void onAction()} disabled={running}>{running ? <><LoaderCircle className="state-spinner inline" size={14} />生成中</> : <><Sparkles size={14} />{action}</>}</button></section>;
}

function NoResumeChanges({ onRegenerate, running = false }: { onRegenerate: () => Promise<void>; running?: boolean }) {
  return <section className="card analysis-empty-card module-pending"><span><ShieldCheck size={23} /></span><h2>没有值得硬改的内容</h2><p>当前证据没有支持可靠的针对性改写。系统已主动跳过可能夸大职责、添加新事实或重复套用 JD 的建议，保留母版原文更合适。</p><button className="secondary-button" type="button" onClick={() => void onRegenerate()} disabled={running}><RefreshCw size={14} />重新检查</button></section>;
}

function ResumeSuggestionsPanel({ items, resume, onToggle, onRegenerate, onExpand, running = false }: { items?: ResumeSuggestionRecord[]; resume?: AnalysisResume | null; onToggle?: (id: string, accepted: boolean) => Promise<void>; onRegenerate?: () => Promise<void>; onExpand?: () => Promise<void>; running?: boolean }) {
  const [accepted, setAccepted] = useState<string[]>(items?.filter((item) => item.accepted).map((item) => item.id) ?? []);
  const [copied, setCopied] = useState("");
  const [copiedFull, setCopiedFull] = useState(false);
  const liveItems: ResumeSuggestionRecord[] = items ?? suggestions.map((item, index) => ({ id: `demo-${index}`, action: item.action === "改写" ? "rewrite" as const : "add" as const, original_text: item.original, suggested_text: item.revised, reason: item.reason, risk: "面试时需能够解释改写后的每项事实。", accepted: false, edited_text: null, jd_quotes: [] }));
  const [selectedId, setSelectedId] = useState(liveItems[0]?.id ?? "");
  const selected = liveItems.find((item) => item.id === selectedId) ?? liveItems[0];
  const actionLabel = { keep: "保留", rewrite: "改写", add: "补充", deemphasize: "弱化" } as const;
  const sections = resume?.structured_content?.sections?.filter((section) => section.items?.length) ?? [];
  const comparable = (value: string) => value.toLowerCase().replace(/[\s\p{P}\p{S}]+/gu, "");
  const tailoredItem = (original: string) => {
    const source = comparable(original);
    const match = liveItems.find((item) => {
      const candidate = comparable(item.original_text);
      return source === candidate || source.includes(candidate) || candidate.includes(source);
    });
    return { text: match?.edited_text || match?.suggested_text || original, modified: Boolean(match) };
  };
  const copyFullResume = async () => {
    const content = sections.map((section) => `${section.title}\n${section.items.map((item) => `• ${tailoredItem(item).text}`).join("\n")}`).join("\n\n");
    await navigator.clipboard.writeText(content);
    setCopiedFull(true);
    window.setTimeout(() => setCopiedFull(false), 1600);
  };
  const copy = async (item: ResumeSuggestionRecord) => {
    await navigator.clipboard.writeText(item.edited_text || item.suggested_text);
    setCopied(item.id);
    window.setTimeout(() => setCopied(""), 1600);
  };
  const toggle = async (item: ResumeSuggestionRecord) => {
    const next = !accepted.includes(item.id);
    setAccepted((current) => next ? [...current, item.id] : current.filter((id) => id !== item.id));
    try { await onToggle?.(item.id, next); }
    catch { setAccepted((current) => next ? current.filter((id) => id !== item.id) : [...current, item.id]); }
  };
  return <div className="analysis-layout"><div className="analysis-list">{sections.length > 0 && <section className="card tailored-resume"><div className="tailored-resume-head"><div><span>岗位定制版 · 母版 v{resume?.version}</span><h2>{resume?.name?.replace(/\.pdf$/i, "") || "定制简历"}</h2><p>{liveItems.length} 处针对性调整，其余内容保持母版原文</p></div><button className="secondary-button compact" type="button" onClick={() => void copyFullResume()}><Copy size={14} />{copiedFull ? "已复制整版" : "复制定制版"}</button></div><div className="tailored-resume-body">{sections.map((section) => <section key={section.title}><h3>{section.title}</h3>{section.items.map((item, index) => { const tailored = tailoredItem(item); return <div className={`tailored-line ${tailored.modified ? "modified" : ""}`} key={`${section.title}-${index}`}><span>{tailored.modified ? <Sparkles size={13} /> : "•"}</span><p>{tailored.text}</p>{tailored.modified && <em>已针对 JD 调整</em>}</div>; })}</section>)}</div></section>}<div className="truth-banner"><ShieldCheck size={18} /><span><strong>核心结果已生成</strong>保留完整结构，只改写与岗位最相关的内容；如需覆盖更多能力，可按需继续补充。</span><div className="analysis-inline-actions">{onExpand && <button className="secondary-button compact" type="button" onClick={() => void onExpand()} disabled={running}><Plus size={13} />继续补充</button>}{onRegenerate && <button className="secondary-button compact" type="button" onClick={() => void onRegenerate()} disabled={running}><RefreshCw size={13} />重新生成</button>}</div></div><div className="module-section-title"><span>改写明细</span><p>查看每一处修改的原因、JD 来源和面试风险</p></div>{liveItems.map((item) => <article className={`card suggestion-card ${selected?.id === item.id ? "selected" : ""}`} key={item.id}><div className="suggestion-head"><span>{actionLabel[item.action]}</span><h2>{item.action === "add" ? "建议补充内容" : "针对性改写"}</h2></div><div className="rewrite-grid"><div><small>母版原文</small><p>{item.original_text}</p></div><ArrowRight size={17} /><div className="revised"><small>建议版本</small><p>{item.edited_text || item.suggested_text}</p></div></div><div className="suggestion-reason"><Sparkles size={15} /><p>{item.reason}</p></div><div className="suggestion-risk"><AlertCircle size={14} /><p><strong>面试风险</strong>{item.risk}</p></div><div className="suggestion-actions"><button className="text-button" type="button" onClick={() => setSelectedId(item.id)}>查看关联 JD <ArrowRight size={13} /></button><button className="secondary-button compact" type="button" onClick={() => void copy(item)}><Copy size={14} />{copied === item.id ? "已复制" : "复制"}</button><button className={`primary-button compact ${accepted.includes(item.id) ? "accepted" : ""}`} type="button" onClick={() => void toggle(item)}>{accepted.includes(item.id) ? <><Check size={14} />已采纳</> : "采纳建议"}</button></div></article>)}</div><SourcePanel jdQuote={selected?.jd_quotes?.[0] ?? ""} resumeQuote={selected?.original_text ?? ""} /></div>;
}

function InterviewPanel({ items, evidence: evidenceItems = [], onRegenerate, onExpand, running = false }: { items?: InterviewQuestionRecord[]; evidence?: AnalysisEvidenceItem[]; onRegenerate?: () => Promise<void>; onExpand?: () => Promise<void>; running?: boolean }) {
  const liveItems = items ?? demoInterviewQuestionRecords();
  const [selectedId, setSelectedId] = useState(liveItems[0]?.id ?? "");
  const selected = liveItems.find((item) => item.id === selectedId) ?? liveItems[0];
  const sourceRequirements = selected ? evidenceItems.filter((item) => selected.source_requirement_ids.includes(item.id)) : [];
  const sourceQuotes = sourceRequirements.flatMap((item) => resumeQuotesFrom(item));
  const priorityLabel = { high: "高", medium: "中", low: "低" } as const;
  return <div className="analysis-layout"><div className="analysis-list"><div className="question-legend"><span><i className="high" />高优先级：核心 JD 与突出经历直接交叉</span><span><i />中优先级：验证能力深度与缺口</span><div className="analysis-inline-actions">{onExpand && <button className="secondary-button compact" type="button" onClick={() => void onExpand()} disabled={running}><Plus size={13} />继续补充</button>}{onRegenerate && <button className="secondary-button compact" type="button" onClick={() => void onRegenerate()} disabled={running}><RefreshCw size={13} />重新生成</button>}</div></div>{liveItems.map((item,index) => <article className={`card question-card ${selected?.id === item.id ? "selected" : ""}`} key={item.id}><div className="question-top"><span className="question-number">{String(index + 1).padStart(2, "0")}</span><div><small>{priorityLabel[item.priority]}优先级 · {item.priority_reason}</small><h2>{item.main_question}</h2></div></div><div className="intent-box"><Target size={17} /><p><strong>考察意图</strong>{item.intent}</p></div><div className="followup-grid"><div><h3>递进追问</h3>{(item.question_followups ?? []).map((followup,followIndex) => <p key={followup.id}><span>{followIndex + 1}</span>{followup.question}</p>)}</div><div><h3>推荐回答结构</h3><p>{item.answer_structure.join(" → ")}</p><h3>需要补充回忆</h3><p>{item.missing_information || "当前证据足够，重点准备细节与边界。"}</p></div></div><div className="question-risk"><AlertCircle size={14} /><p><strong>回答风险</strong>{item.risk}</p></div><button className="text-button" type="button" onClick={() => setSelectedId(item.id)}>查看关联证据 <ArrowRight size={14} /></button></article>)}</div><SourcePanel jdQuote={sourceRequirements[0]?.jd_quote ?? ""} resumeQuotes={sourceQuotes} /></div>;
}

function demoInterviewQuestionRecords(): InterviewQuestionRecord[] {
  return questions.map((item, index) => ({ id: `demo-q-${index}`, priority: index < 2 ? "high" as const : "medium" as const, priority_reason: index < 2 ? "核心 JD 与突出经历直接交叉" : "验证能力深度与边界", main_question: item.title, intent: item.intent, answer_structure: ["背景与目标", "判断依据", "个人动作", "结果验证", "复盘边界"], missing_information: index === 0 ? "补充评测样本规模、失败案例和优化前后结果。" : "", risk: "避免只描述团队成果，需要明确个人贡献。", source_requirement_ids: [], source_evidence_ids: [], question_followups: item.followups.map((question, followIndex) => ({ id: `${index}-${followIndex}`, sort_order: followIndex + 1, question })) }));
}

const emptyPreparation: QuestionPreparation = { status: "not_started", answerDraft: "", realExample: "", keyMetrics: "", notes: "" };

function AnswerPreparationPanel({ items, evidence, save }: { items: InterviewQuestionRecord[]; evidence: AnalysisEvidenceItem[]; save: (id: string, preparation: QuestionPreparation) => Promise<void> }) {
  const [selectedId, setSelectedId] = useState(items[0]?.id ?? "");
  const selected = items.find((item) => item.id === selectedId) ?? items[0];
  const readyCount = items.filter((item) => item.preparation?.status === "ready").length;
  const draftingCount = items.filter((item) => item.preparation?.status === "drafting").length;
  const highItems = items.filter((item) => item.priority === "high");
  const highReady = highItems.filter((item) => item.preparation?.status === "ready").length;
  const statusLabel = { not_started: "未准备", drafting: "准备中", ready: "已完成" } as const;
  const sourceQuotes = selected ? evidence.flatMap((item) => relationsFrom(item).flatMap((relation) => {
    const sources = Array.isArray(relation.evidence_items) ? relation.evidence_items : relation.evidence_items ? [relation.evidence_items] : [];
    return sources.filter((source) => selected.source_evidence_ids.includes(source.id)).map((source) => source.resume_quote);
  })).filter((quote, index, all) => quote && all.indexOf(quote) === index) : [];
  if (!items.length) return <section className="card analysis-empty-card module-pending"><span><Target size={23} /></span><h2>暂无需要准备的问题</h2><p>生成面试追问地图后，可以在这里逐题编写回答并形成面试前复习清单。</p></section>;
  return <div className="preparation-workspace"><section className="preparation-overview"><div className="card"><span>整体进度</span><strong>{readyCount} / {items.length}</strong><small>{draftingCount ? `${draftingCount} 道正在准备` : "从高优先级问题开始"}</small></div><div className="card"><span>高优先级</span><strong>{highReady} / {highItems.length}</strong><small>{highReady === highItems.length && highItems.length ? "关键问题已准备完成" : "优先补齐核心问题"}</small></div><div className="card progress-card"><div><span>准备完成度</span><strong>{Math.round((readyCount / items.length) * 100)}%</strong></div><div className="preparation-progress"><i style={{ width: `${(readyCount / items.length) * 100}%` }} /></div><small>回答只保存在你的账号中</small></div></section><div className="preparation-layout"><aside className="card preparation-question-list"><header><div><h2>面试前清单</h2><p>按优先级逐题准备</p></div><span>{items.length} 题</span></header><div>{items.map((item, index) => { const status = item.preparation?.status ?? "not_started"; return <button className={selected?.id === item.id ? "active" : ""} type="button" onClick={() => setSelectedId(item.id)} key={item.id}><span className={`preparation-index ${item.priority}`}>{String(index + 1).padStart(2, "0")}</span><div><strong>{item.main_question}</strong><small>{item.priority === "high" ? "高优先级" : item.priority === "medium" ? "中优先级" : "低优先级"}</small></div><em className={`preparation-status ${status}`}>{statusLabel[status]}</em></button>; })}</div></aside>{selected && <AnswerPreparationEditor key={selected.id} question={selected} sourceQuotes={sourceQuotes} save={save} />}</div></div>;
}

function AnswerPreparationEditor({ question, sourceQuotes, save }: { question: InterviewQuestionRecord; sourceQuotes: string[]; save: (id: string, preparation: QuestionPreparation) => Promise<void> }) {
  const [form, setForm] = useState<QuestionPreparation>(question.preparation ?? emptyPreparation);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");
  const update = (key: keyof QuestionPreparation, value: string) => { setForm((current) => ({ ...current, [key]: value })); setSaved(false); };
  const fillSkeleton = () => {
    const answerSkeleton = question.answer_structure.map((step, index) => `${index + 1}. ${step}\n待补充：`).join("\n\n");
    const reminders = [question.missing_information ? `需要补忆：${question.missing_information}` : "", question.risk ? `回答边界：${question.risk}` : ""].filter(Boolean).join("\n");
    setForm((current) => ({
      ...current,
      status: current.status === "ready" ? "ready" : "drafting",
      answerDraft: current.answerDraft || answerSkeleton,
      realExample: current.realExample || sourceQuotes.map((quote, index) => `素材 ${index + 1}：${quote}`).join("\n\n"),
      notes: current.notes || reminders,
    }));
    setSaved(false);
  };
  const submit = async () => {
    setSaving(true); setError("");
    try { await save(question.id, form); setSaved(true); }
    catch (saveError) { setError(saveError instanceof Error ? saveError.message : "保存失败，请重试"); }
    finally { setSaving(false); }
  };
  return <section className="card preparation-editor"><header><div><span>{question.priority === "high" ? "高" : question.priority === "medium" ? "中" : "低"}优先级</span><h2>{question.main_question}</h2><p>{question.intent}</p></div><div className="preparation-status-picker">{([['not_started','未准备'],['drafting','准备中'],['ready','已完成']] as const).map(([value,label]) => <button className={form.status === value ? `active ${value}` : ""} type="button" onClick={() => { setForm((current) => ({ ...current, status: value })); setSaved(false); }} key={value}>{form.status === value && <Check size={12} />}{label}</button>)}</div></header><div className="preparation-guidance"><Sparkles size={15} /><p><strong>这道题的回答路径</strong>{question.answer_structure.join(" → ")}</p><button className="secondary-button compact skeleton-button" type="button" onClick={fillSkeleton}><WandSparkles size={13} />填入回答骨架</button></div>{sourceQuotes.length > 0 && <div className="preparation-source"><FileCheck2 size={15} /><div><strong>可用的真实简历素材</strong>{sourceQuotes.map((quote, index) => <p key={`${quote}-${index}`}>{quote}</p>)}</div></div>}<div className="preparation-fields"><label><span>回答草稿</span><textarea value={form.answerDraft} onChange={(event) => update("answerDraft", event.target.value)} rows={8} placeholder="用自己的语言写完整回答。重点说明背景、个人判断、具体动作、结果和复盘。" /></label><label><span>真实案例与个人贡献</span><textarea value={form.realExample} onChange={(event) => update("realExample", event.target.value)} rows={5} placeholder="记录可以使用的真实项目、你具体负责的部分，以及不能夸大的边界。" /></label><label><span>关键数据</span><textarea value={form.keyMetrics} onChange={(event) => update("keyMetrics", event.target.value)} rows={3} placeholder="例如用户规模、转化率变化、项目周期；没有准确数据时先写“待确认”。" /></label><label><span>补充笔记</span><textarea value={form.notes} onChange={(event) => update("notes", event.target.value)} rows={3} placeholder="记录容易忘记的细节、反问点或需要继续核实的信息。" /></label></div>{question.missing_information && <div className="preparation-reminder"><AlertCircle size={14} /><p><strong>AI 提醒补充</strong>{question.missing_information}</p></div>}{error && <p className="form-error preparation-save-error"><AlertCircle size={14} />{error}</p>}<footer><span>{saved ? <><CheckCircle2 size={14} />已保存到账号</> : question.preparation?.updatedAt ? `上次保存 ${formatDisplayDate(question.preparation.updatedAt, true)}` : "填写后记得保存"}</span><button className="primary-button" type="button" onClick={() => void submit()} disabled={saving}>{saving ? <><LoaderCircle className="state-spinner inline" size={14} />保存中</> : "保存回答准备"}</button></footer></section>;
}

function SourcePanel({ jdQuote = "", resumeQuote = "", resumeQuotes = [] }: { jdQuote?: string; resumeQuote?: string; resumeQuotes?: string[] }) {
  const quotes = resumeQuotes.length ? resumeQuotes : resumeQuote ? [resumeQuote] : [];
  return <aside className="card source-panel"><div className="source-heading"><div><h2>原文引用</h2><p>所有判断都能定位来源</p></div><FileCheck2 size={20} /></div><section><strong>JD 原文</strong><p>{jdQuote ? <mark>{jdQuote}</mark> : "暂无可定位的 JD 原文"}</p></section><section><strong>简历原文{quotes.length > 1 ? ` · ${quotes.length} 条` : ""}</strong>{quotes.length ? quotes.map((quote, index) => <p key={`${quote}-${index}`}><mark>{quote}</mark></p>) : <p>该要求目前没有可引用的简历证据</p>}</section><a className="text-button" href="/resume">查看母版简历 <ArrowUpRight size={14} /></a></aside>;
}

function ResumeVersionDeleteModal({ resume, totalVersions, close, remove }: { resume: ResumeVersion; totalVersions: number; close: () => void; remove: () => Promise<void> }) {
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState("");
  const submit = async () => {
    setDeleting(true); setError("");
    try { await remove(); }
    catch (deleteError) { setError(deleteError instanceof Error ? deleteError.message : "简历版本删除失败"); setDeleting(false); }
  };
  return <div className="modal-backdrop" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && !deleting && close()}><section className="modal-card manage-modal" role="dialog" aria-modal="true" aria-labelledby="resume-delete-title"><div className="modal-heading"><div><span className="modal-icon danger-icon"><Trash2 /></span><div><h2 id="resume-delete-title">删除简历 v{resume.version}</h2><p>{resume.name}</p></div></div><button className="icon-button" type="button" onClick={close} aria-label="关闭" disabled={deleting}><X size={18} /></button></div><div className="danger-confirm compact-confirm"><span><AlertCircle size={21} /></span><h3>{resume.is_current ? "这是当前使用的母版" : "确认删除这个历史版本？"}</h3><p>{resume.is_current ? totalVersions > 1 ? "删除后会自动使用剩余的最新版本，全部岗位分析将标记为需要重新生成。" : "删除后将暂时没有母版简历，岗位与 JD 会保留，但需要重新上传简历才能分析。" : "将删除该版本的 PDF、解析稿以及与它直接关联的证据；其他简历版本不会受到影响。"}</p>{error && <p className="form-error"><AlertCircle size={14} />{error}</p>}<div><button className="secondary-button" type="button" onClick={close} disabled={deleting}>取消</button><button className="danger-button" type="button" onClick={submit} disabled={deleting}>{deleting ? "删除中…" : "确认删除版本"}</button></div></div></section></div>;
}

function ResumeEditorModal({ resume, close, save }: { resume: ResumeVersion; close: () => void; save: (sections: ResumeSection[]) => Promise<void> }) {
  const [sections, setSections] = useState<ResumeSection[]>(() => (resume.structured_content?.sections ?? []).map((section) => ({ title: section.title, items: [...section.items] })));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const update = (index: number, changes: Partial<ResumeSection>) => setSections((items) => items.map((section, sectionIndex) => sectionIndex === index ? { ...section, ...changes } : section));
  const move = (index: number, direction: -1 | 1) => setSections((items) => {
    const target = index + direction;
    if (target < 0 || target >= items.length) return items;
    const next = [...items];
    [next[index], next[target]] = [next[target], next[index]];
    return next;
  });
  const remove = (index: number) => setSections((items) => items.filter((_, sectionIndex) => sectionIndex !== index));
  const submit = async () => {
    const normalized = sections.map((section) => ({
      title: section.title.trim(),
      items: section.items.map((item) => item.trim()).filter(Boolean),
    })).filter((section) => section.title && section.items.length);
    if (!normalized.length) { setError("请至少保留一个包含内容的栏目"); return; }
    if (normalized.some((section) => section.title.length > 40)) { setError("栏目名称不能超过 40 个字"); return; }
    setSaving(true); setError("");
    try { await save(normalized); }
    catch (saveError) { setError(saveError instanceof Error ? saveError.message : "解析稿保存失败"); }
    finally { setSaving(false); }
  };

  return <div className="modal-backdrop resume-editor-backdrop" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && !saving && close()}><section className="modal-card resume-editor-modal" role="dialog" aria-modal="true" aria-labelledby="resume-editor-title"><div className="modal-heading"><div><span className="modal-icon"><PencilLine /></span><div><h2 id="resume-editor-title">校正简历解析稿</h2><p>保存后，证据地图和面试分析都会以这里的内容为准</p></div></div><button className="icon-button" type="button" onClick={close} aria-label="关闭" disabled={saving}><X size={18} /></button></div><div className="resume-editor-notice"><ShieldCheck size={16} /><p><strong>只校正真实内容</strong>你可以调整栏目、顺序和换行，但不要为了匹配岗位添加不存在的经历或数据。原始 PDF 不会被修改。</p></div><div className="resume-editor-sections">{sections.map((section, index) => <section className="resume-editor-section" key={index}><header><input aria-label={`第 ${index + 1} 个栏目名称`} value={section.title} onChange={(event) => update(index, { title: event.target.value })} placeholder="栏目名称" /><div><button type="button" onClick={() => move(index, -1)} disabled={index === 0 || saving} aria-label="上移栏目"><MoveUp size={15} /></button><button type="button" onClick={() => move(index, 1)} disabled={index === sections.length - 1 || saving} aria-label="下移栏目"><MoveDown size={15} /></button><button className="danger" type="button" onClick={() => remove(index)} disabled={sections.length === 1 || saving} aria-label="删除栏目"><Trash2 size={15} /></button></div></header><textarea aria-label={`${section.title || `第 ${index + 1} 个栏目`}内容`} value={section.items.join("\n")} onChange={(event) => update(index, { items: event.target.value.split(/\r?\n/) })} rows={Math.min(10, Math.max(4, section.items.length + 1))} placeholder="每行填写一条真实经历或信息" /><small>{section.items.filter((item) => item.trim()).length} 行 · 每行会作为一条可引用的简历证据</small></section>)}</div><button className="resume-add-section" type="button" onClick={() => setSections((items) => [...items, { title: "其他信息", items: [""] }])} disabled={saving || sections.length >= 16}><Plus size={15} />添加栏目</button>{error && <p className="form-error resume-editor-error"><AlertCircle size={14} />{error}</p>}<div className="modal-actions"><button className="secondary-button" type="button" onClick={close} disabled={saving}>取消</button><button className="primary-button" type="button" onClick={submit} disabled={saving}>{saving ? <><LoaderCircle className="state-spinner inline" size={14} />保存中</> : <><Check size={14} />保存校正稿</>}</button></div></section></div>;
}

function UploadModal({ close, upload, versions, localOnly = false }: { close: () => void; upload: (file: File, target: { documentId?: string; documentName?: string; direction?: string }) => Promise<{ duplicate?: boolean }>; versions: ResumeVersion[]; localOnly?: boolean }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const documents = useMemo(() => [...new globalThis.Map<string, { id: string; name: string; direction: string }>(versions.map((version) => [version.document_id || version.resume_document_id || "legacy", { id: version.document_id || version.resume_document_id || "legacy", name: version.document_name || "默认母版简历", direction: version.direction || "" }])).values()], [versions]);
  const [file, setFile] = useState<File | null>(null);
  const [targetMode, setTargetMode] = useState<"existing" | "new">(documents.length ? "existing" : "new");
  const [documentId, setDocumentId] = useState(documents[0]?.id ?? "");
  const [documentName, setDocumentName] = useState("");
  const [direction, setDirection] = useState("");
  const [dragging, setDragging] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const choose = (nextFile?: File) => {
    setError("");
    if (!nextFile) return;
    if (nextFile.type !== "application/pdf" && !nextFile.name.toLowerCase().endsWith(".pdf")) { setError("仅支持 PDF 文件"); return; }
    if (nextFile.size > 10 * 1024 * 1024) { setError("文件不能超过 10 MB"); return; }
    setFile(nextFile);
  };

  const submit = async () => {
    if (!file) { setError("请先选择一份 PDF 简历"); return; }
    setSaving(true); setError("");
    if (targetMode === "new" && !documentName.trim()) { setError("请给这份简历起一个便于识别的名称"); setSaving(false); return; }
    try { await upload(file, targetMode === "existing" ? { documentId } : { documentName: documentName.trim(), direction: direction.trim() }); close(); }
    catch (uploadError) { setError(uploadError instanceof Error ? uploadError.message : "上传失败，请稍后重试"); }
    finally { setSaving(false); }
  };

  return <div className="modal-backdrop" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && !saving && close()}><section className="modal-card" role="dialog" aria-modal="true" aria-labelledby="upload-title"><div className="modal-heading"><div><span className="modal-icon"><Upload /></span><div><h2 id="upload-title">{file ? "确认简历版本" : "上传求职简历"}</h2><p>{saving ? localOnly ? "正在本机解析简历内容" : "正在保存 PDF 并解析简历内容" : "选择更新现有简历，或建立一个新的求职方向"}</p></div></div><button className="icon-button" type="button" onClick={close} aria-label="关闭" disabled={saving}><X size={18} /></button></div><input ref={inputRef} className="visually-hidden" type="file" accept="application/pdf,.pdf" onChange={(event) => choose(event.target.files?.[0])} />
    <div className="resume-upload-target"><div className="segmented-control"><button type="button" className={targetMode === "existing" ? "active" : ""} onClick={() => setTargetMode("existing")} disabled={!documents.length || saving}>更新现有简历</button><button type="button" className={targetMode === "new" ? "active" : ""} onClick={() => setTargetMode("new")} disabled={saving}>新增简历方向</button></div>{targetMode === "existing" ? <label><span>选择简历</span><select value={documentId} onChange={(event) => setDocumentId(event.target.value)}>{documents.map((document) => <option value={document.id} key={document.id}>{document.name}{document.direction ? ` · ${document.direction}` : ""}</option>)}</select></label> : <div className="form-two"><label><span>简历名称</span><input value={documentName} onChange={(event) => setDocumentName(event.target.value)} placeholder="例如：AI 产品方向简历" /></label><label><span>求职方向</span><input value={direction} onChange={(event) => setDirection(event.target.value)} placeholder="例如：AI 产品 / 数据分析" /></label></div>}</div>
    <button className={`upload-zone ${dragging ? "dragging" : ""} ${file ? "selected" : ""}`} type="button" onClick={() => !saving && inputRef.current?.click()} onDragEnter={(event) => { event.preventDefault(); setDragging(true); }} onDragOver={(event) => event.preventDefault()} onDragLeave={() => setDragging(false)} onDrop={(event) => { event.preventDefault(); setDragging(false); choose(event.dataTransfer.files?.[0]); }} disabled={saving}>{saving ? <><LoaderCircle className="state-spinner" size={28} /><strong>正在解析并保存…</strong><span>请不要关闭页面，通常需要数秒</span></> : file ? <><span className="selected-pdf"><FileText size={22} /></span><strong>{file.name}</strong><span>{formatFileSize(file.size)} · 点击可重新选择</span></> : <><Upload size={28} /><strong>拖入 PDF，或点击选择文件</strong><span>仅支持带可选择文字的 PDF，最大 10 MB；暂不支持扫描件</span></>}</button>
    {error && <p className="form-error upload-error"><AlertCircle size={14} />{error}</p>}<div className="modal-note"><ShieldCheck size={17} /><p>{localOnly ? "开发预览只在本机内存中保留结果；不会登录、持久化、上传 Storage，也不会发送给 AI 或外部服务。刷新页面后结果会消失。" : "PDF 会保存在你的私有空间，并生成解析文本与版本记录；预览链接仅短时间有效。"}</p></div><div className="modal-actions"><button className="secondary-button" type="button" onClick={close} disabled={saving}>取消</button><button className="primary-button" type="button" onClick={submit} disabled={saving || !file}>{saving ? <><LoaderCircle className="state-spinner inline" size={14} />解析中</> : localOnly ? "开始本地解析" : "开始解析并保存"}</button></div></section></div>;
}

function PdfPreviewModal({ preview, close }: { preview: { url: string; name: string }; close: () => void }) {
  return <div className="pdf-preview-backdrop" role="presentation"><section className="pdf-preview-card" role="dialog" aria-modal="true" aria-labelledby="pdf-preview-title"><header><div><span className="pdf-mini-icon"><FileText size={17} /></span><div><h2 id="pdf-preview-title">{preview.name}</h2><p>私有 PDF 预览</p></div></div><div><a className="secondary-button compact" href={preview.url} download={preview.name}>下载原文件</a><button className="icon-button" type="button" onClick={close} aria-label="关闭预览"><X size={19} /></button></div></header><iframe src={preview.url} title={`${preview.name} PDF 预览`} /></section></div>;
}

function CompanyManageModal({ company, close, rename, remove }: { company: WorkspaceCompany; close: () => void; rename: (name: string) => Promise<void>; remove: () => Promise<void> }) {
  const [name, setName] = useState(company.name);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const positionCount = company.groups.reduce((sum, group) => sum + group.positions.length, 0);
  const submit = async () => {
    if (!name.trim()) { setError("请输入公司名称"); return; }
    setSaving(true); setError("");
    try { await rename(name.trim()); }
    catch (submitError) { setError(submitError instanceof Error ? submitError.message : "公司信息保存失败"); setSaving(false); }
  };
  const confirmDelete = async () => {
    setSaving(true); setError("");
    try { await remove(); }
    catch (deleteError) { setError(deleteError instanceof Error ? deleteError.message : "公司删除失败"); setSaving(false); }
  };
  return <div className="modal-backdrop" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && !saving && close()}><section className="modal-card manage-modal" role="dialog" aria-modal="true" aria-labelledby="company-manage-title"><div className="modal-heading"><div><span className="modal-icon gold"><BriefcaseBusiness /></span><div><h2 id="company-manage-title">管理公司</h2><p>{positionCount} 个岗位归属于这家公司</p></div></div><button className="icon-button" type="button" onClick={close} aria-label="关闭" disabled={saving}><X size={18} /></button></div>{confirmingDelete ? <div className="danger-confirm"><span><AlertCircle size={21} /></span><h3>删除“{company.name}”？</h3><p>将同时删除其中 {positionCount} 个岗位、求职进度和全部分析结果。此操作无法撤销。</p>{error && <p className="form-error"><AlertCircle size={14} />{error}</p>}<div><button className="secondary-button" type="button" onClick={() => setConfirmingDelete(false)} disabled={saving}>返回</button><button className="danger-button" type="button" onClick={confirmDelete} disabled={saving}>{saving ? "删除中…" : `确认删除 ${positionCount} 个岗位`}</button></div></div> : <><div className="form-grid manage-form"><label><span>公司名称</span><input value={name} onChange={(event) => setName(event.target.value)} maxLength={80} /></label>{error && <p className="form-error"><AlertCircle size={14} />{error}</p>}<button className="destructive-link" type="button" onClick={() => setConfirmingDelete(true)}><Trash2 size={14} />删除公司及其岗位</button></div><div className="modal-actions"><button className="secondary-button" type="button" onClick={close} disabled={saving}>取消</button><button className="primary-button" type="button" onClick={submit} disabled={saving || name.trim() === company.name}>{saving ? "保存中…" : "保存名称"}</button></div></>}</section></div>;
}

function PositionManageModal({ position, close, save, remove }: { position: DemoPosition; close: () => void; save: (input: UpdatePositionInput) => Promise<void>; remove: () => Promise<void> }) {
  const [title, setTitle] = useState(position.title);
  const [category, setCategory] = useState<Category>(position.category ?? "产品");
  const [department, setDepartment] = useState(position.department ?? "");
  const [location, setLocation] = useState(position.locationRaw ?? "");
  const [jdText, setJdText] = useState(position.jdText ?? "");
  const [industry, setIndustry] = useState(position.industry ?? "互联网");
  const [seniority, setSeniority] = useState(position.seniority ?? "intern");
  const [productType, setProductType] = useState(position.productType ?? "");
  const [companyType, setCompanyType] = useState(position.companyType ?? "");
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const submit = async () => {
    if (!title.trim()) { setError("请填写岗位名称"); return; }
    setSaving(true); setError("");
    try { await save({ title: title.trim(), category, department: department.trim(), location: location.trim(), jdText: jdText.trim(), industry: industry.trim(), seniority, productType: productType.trim(), companyType: companyType.trim() }); }
    catch (submitError) { setError(submitError instanceof Error ? submitError.message : "岗位信息保存失败"); setSaving(false); }
  };
  const confirmDelete = async () => {
    setSaving(true); setError("");
    try { await remove(); }
    catch (deleteError) { setError(deleteError instanceof Error ? deleteError.message : "岗位删除失败"); setSaving(false); }
  };
  return <div className="modal-backdrop" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && !saving && close()}><section className="modal-card wide manage-modal" role="dialog" aria-modal="true" aria-labelledby="position-manage-title"><div className="modal-heading"><div><span className="modal-icon gold"><BriefcaseBusiness /></span><div><h2 id="position-manage-title">{confirmingDelete ? "确认删除岗位" : "编辑目标岗位"}</h2><p>{position.title}</p></div></div><button className="icon-button" type="button" onClick={close} aria-label="关闭" disabled={saving}><X size={18} /></button></div>{confirmingDelete ? <div className="danger-confirm"><span><AlertCircle size={21} /></span><h3>删除“{position.title}”？</h3><p>这份 JD、求职进度、证据地图、定制简历和面试追问都会被删除，无法撤销。</p>{error && <p className="form-error"><AlertCircle size={14} />{error}</p>}<div><button className="secondary-button" type="button" onClick={() => setConfirmingDelete(false)} disabled={saving}>返回编辑</button><button className="danger-button" type="button" onClick={confirmDelete} disabled={saving}>{saving ? "删除中…" : "确认删除岗位"}</button></div></div> : <><div className="form-grid"><label><span>岗位名称</span><input value={title} onChange={(event) => setTitle(event.target.value)} /></label><fieldset><legend>岗位类别</legend><div className="category-picker">{(["技术","产品","运营","市场"] as Category[]).map((item) => <button className={category === item ? "active" : ""} type="button" onClick={() => setCategory(item)} key={item}>{item}</button>)}</div></fieldset><div className="form-two"><label><span>部门（选填）</span><input value={department} onChange={(event) => setDepartment(event.target.value)} /></label><label><span>地点（选填）</span><input value={location} onChange={(event) => setLocation(event.target.value)} /></label></div><div className="form-two"><label><span>行业</span><input value={industry} onChange={(event) => setIndustry(event.target.value)} placeholder="互联网" /></label><label><span>职级</span><select value={seniority} onChange={(event) => setSeniority(event.target.value)}><option value="intern">实习</option><option value="campus">校招</option><option value="junior">初级</option></select></label></div><div className="form-two"><label><span>产品类型（选填）</span><input value={productType} onChange={(event) => setProductType(event.target.value)} placeholder="例如：AI 应用 / ToB SaaS" /></label><label><span>公司类型（选填）</span><input value={companyType} onChange={(event) => setCompanyType(event.target.value)} placeholder="例如：大厂 / 创业公司" /></label></div><label><span>岗位 JD（选填）</span><textarea value={jdText} onChange={(event) => setJdText(event.target.value)} rows={8} placeholder="有完整 JD 时粘贴；没有也可以先保存并查看岗位通用能力。" /></label>{error && <p className="form-error"><AlertCircle size={14} />{error}</p>}<button className="destructive-link" type="button" onClick={() => setConfirmingDelete(true)}><Trash2 size={14} />删除这个岗位</button></div><div className="modal-actions"><button className="secondary-button" type="button" onClick={close} disabled={saving}>取消</button><button className="primary-button" type="button" onClick={submit} disabled={saving}>{saving ? "保存中…" : "保存岗位"}</button></div></>}</section></div>;
}

function StageModal({ position, close, update }: { position: DemoPosition; close: () => void; update: (input: StageUpdateInput) => Promise<void> }) {
  const [selected, setSelected] = useState<ApplicationStage>(position.stage);
  const [occurredOn, setOccurredOn] = useState(() => new Date().toISOString().slice(0, 10));
  const [nextEventAt, setNextEventAt] = useState("");
  const [nextEventType, setNextEventType] = useState("");
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const submit = async () => {
    setSaving(true); setError("");
    try {
      await update({
        stage: selected,
        occurredAt: new Date(`${occurredOn}T12:00:00`).toISOString(),
        nextEventAt: nextEventAt ? new Date(nextEventAt).toISOString() : undefined,
        nextEventType: nextEventType.trim() || undefined,
        note: note.trim() || undefined,
      });
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "保存进度失败");
    } finally { setSaving(false); }
  };
  return <div className="modal-backdrop" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && close()}><section className="modal-card stage-modal" role="dialog" aria-modal="true" aria-labelledby="stage-title"><div className="modal-heading"><div><span className="modal-icon green"><CircleDot /></span><div><h2 id="stage-title">更新求职进度</h2><p>{position.title}</p></div></div><button className="icon-button" type="button" onClick={close} aria-label="关闭"><X size={18} /></button></div><div className="stage-picker">{ALL_STAGES.map((item) => <button className={selected === item ? "active" : ""} type="button" onClick={() => setSelected(item)} key={item}><i className={`stage-dot ${stageTone(item)}`} /><span>{item}</span>{selected === item && <Check size={15} />}</button>)}</div><div className="stage-extra-fields"><label><span>发生时间</span><input type="date" value={occurredOn} onChange={(event) => setOccurredOn(event.target.value)} /></label><label><span>下一安排时间（选填）</span><input type="datetime-local" value={nextEventAt} onChange={(event) => setNextEventAt(event.target.value)} /></label><label><span>下一安排内容（选填）</span><input value={nextEventType} onChange={(event) => setNextEventType(event.target.value)} placeholder="例如：产品二面 / HR 沟通" /></label><label><span>备注（选填）</span><textarea value={note} onChange={(event) => setNote(event.target.value)} rows={3} placeholder="记录面试形式、联系人、需要跟进的信息……" /></label>{error && <p className="form-error"><AlertCircle size={14} />{error}</p>}</div><div className="modal-actions"><button className="secondary-button" type="button" onClick={close} disabled={saving}>取消</button><button className="primary-button" type="button" onClick={submit} disabled={saving}>{saving ? <><LoaderCircle className="state-spinner inline" size={14} />保存中</> : "保存进度"}</button></div></section></div>;
}

function PositionModal({ close, save }: { close: () => void; save?: (input: NewPositionInput) => Promise<void> }) {
  const [category, setCategory] = useState<Category>("产品");
  const [company, setCompany] = useState("");
  const [title, setTitle] = useState("");
  const [department, setDepartment] = useState("");
  const [location, setLocation] = useState("");
  const [jdText, setJdText] = useState("");
  const [industry, setIndustry] = useState("互联网");
  const [seniority, setSeniority] = useState("intern");
  const [productType, setProductType] = useState("");
  const [companyType, setCompanyType] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const submit = async () => {
    if (!company.trim() || !title.trim()) { setError("请填写公司和岗位名称"); return; }
    setSaving(true); setError("");
    try { await save?.({ company: company.trim(), title: title.trim(), category, department: department.trim(), location: location.trim(), jdText: jdText.trim(), industry: industry.trim(), seniority, productType: productType.trim(), companyType: companyType.trim() }); close(); }
    catch (submitError) { setError(submitError instanceof Error ? submitError.message : "保存失败"); }
    finally { setSaving(false); }
  };
  return <div className="modal-backdrop" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && close()}><section className="modal-card wide" role="dialog" aria-modal="true" aria-labelledby="position-title"><div className="modal-heading"><div><span className="modal-icon gold"><BriefcaseBusiness /></span><div><h2 id="position-title">新建目标岗位</h2><p>可以只填岗位名称，JD 之后再补</p></div></div><button className="icon-button" type="button" onClick={close} aria-label="关闭"><X size={18} /></button></div><div className="form-grid"><label><span>公司</span><input value={company} onChange={(event) => setCompany(event.target.value)} placeholder="例如：字节跳动" /></label><label><span>岗位名称</span><input value={title} onChange={(event) => setTitle(event.target.value)} placeholder="例如：AI 产品经理实习生" /></label><fieldset><legend>岗位类别</legend><div className="category-picker">{(["技术","产品","运营","市场"] as Category[]).map((item) => <button className={category === item ? "active" : ""} type="button" onClick={() => setCategory(item)} key={item}>{item}</button>)}</div></fieldset><div className="form-two"><label><span>部门（选填）</span><input value={department} onChange={(event) => setDepartment(event.target.value)} placeholder="例如：Flow 产品" /></label><label><span>地点（选填）</span><input value={location} onChange={(event) => setLocation(event.target.value)} placeholder="例如：北京" /></label></div><div className="form-two"><label><span>行业</span><input value={industry} onChange={(event) => setIndustry(event.target.value)} placeholder="互联网" /></label><label><span>职级</span><select value={seniority} onChange={(event) => setSeniority(event.target.value)}><option value="intern">实习</option><option value="campus">校招</option><option value="junior">初级</option></select></label></div><div className="form-two"><label><span>产品类型（选填）</span><input value={productType} onChange={(event) => setProductType(event.target.value)} placeholder="例如：AI 应用 / ToB SaaS" /></label><label><span>公司类型（选填）</span><input value={companyType} onChange={(event) => setCompanyType(event.target.value)} placeholder="例如：大厂 / 创业公司" /></label></div><label><span>岗位 JD（选填）</span><textarea value={jdText} onChange={(event) => setJdText(event.target.value)} rows={8} placeholder="粘贴完整岗位职责与要求；没有 JD 也可以先用岗位通用能力画像分析。" /></label>{jdText.trim().length > 0 && jdText.trim().length < 80 && <p className="form-hint">当前 JD 信息较短，保存后会优先推荐“岗位通用能力”分析。</p>}{error && <p className="form-error"><AlertCircle size={14} />{error}</p>}</div><div className="modal-actions"><button className="secondary-button" type="button" onClick={close}>取消</button><button className="primary-button" type="button" onClick={submit} disabled={saving}>{saving ? <><LoaderCircle className="state-spinner inline" size={14} />保存中</> : "保存岗位"}</button></div></section></div>;
}

function authErrorMessage(message: string) {
  const normalized = message.toLowerCase();
  if (normalized.includes("invalid login credentials")) return "邮箱或密码不正确";
  if (normalized.includes("user already registered")) return "该邮箱已经注册，请直接登录";
  if (normalized.includes("email not confirmed")) return "该邮箱仍在等待验证，请先在 Supabase 关闭邮箱确认";
  if (normalized.includes("password") && (normalized.includes("short") || normalized.includes("least"))) return "密码长度不足，请设置至少 8 位密码";
  if (normalized.includes("rate limit")) return "尝试次数过多，请稍后再试";
  return message;
}

function LoginScreen({ supabaseConfig }: { supabaseConfig: SupabasePublicConfig }) {
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [passwordConfirmation, setPasswordConfirmation] = useState("");
  const [sending, setSending] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const switchMode = (nextMode: "login" | "signup") => {
    setMode(nextMode);
    setError("");
    setMessage("");
    setPassword("");
    setPasswordConfirmation("");
  };
  const submit = async () => {
    if (!email.includes("@")) { setError("请输入有效邮箱"); return; }
    if (password.length < 8) { setError("请设置至少 8 位密码"); return; }
    if (mode === "signup" && password !== passwordConfirmation) { setError("两次输入的密码不一致"); return; }
    const supabase = getBrowserSupabase(supabaseConfig);
    if (!supabase) return;
    setSending(true); setError(""); setMessage("");
    if (mode === "login") {
      const { error: authError } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
      if (authError) setError(authErrorMessage(authError.message));
    } else {
      const { data, error: authError } = await supabase.auth.signUp({ email: email.trim(), password });
      if (authError) setError(authErrorMessage(authError.message));
      else if (!data.session) setMessage("账号已创建，但目前仍要求邮箱确认。请先让管理员关闭 Supabase 的 Confirm email 后再登录。");
    }
    setSending(false);
  };
  return (
    <main className="login-screen">
      <section className="login-card card">
        <span className="login-brand"><span className="brand-symbol"><Route size={19} /></span>OfferMap</span>
        <p className="eyebrow">应届求职工作台</p>
        <h1>{mode === "login" ? "欢迎回来" : "创建你的求职工作区"}</h1>
        <p className="login-copy">{mode === "login" ? "登录后继续准备岗位、简历和面试。" : "简历、岗位和分析记录只会保存在你的个人账号中。"}</p>
        <div className="login-mode" role="tablist" aria-label="登录方式">
          <button type="button" role="tab" aria-selected={mode === "login"} className={mode === "login" ? "active" : ""} onClick={() => switchMode("login")}>登录</button>
          <button type="button" role="tab" aria-selected={mode === "signup"} className={mode === "signup" ? "active" : ""} onClick={() => switchMode("signup")}>注册</button>
        </div>
        <form className="login-form" onSubmit={(event) => { event.preventDefault(); void submit(); }}>
          <label className="login-field"><span>邮箱</span><input type="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="name@example.com" /></label>
          <label className="login-field"><span>密码</span><input type="password" autoComplete={mode === "login" ? "current-password" : "new-password"} value={password} onChange={(event) => setPassword(event.target.value)} placeholder="至少 8 位" /></label>
          {mode === "signup" && <label className="login-field"><span>确认密码</span><input type="password" autoComplete="new-password" value={passwordConfirmation} onChange={(event) => setPasswordConfirmation(event.target.value)} placeholder="再次输入密码" /></label>}
          {error && <p className="login-feedback error"><AlertCircle size={14} />{error}</p>}
          {message && <p className="login-feedback success"><CheckCircle2 size={14} />{message}</p>}
          <button className="primary-button login-submit" type="submit" disabled={sending}>{sending ? <><LoaderCircle className="state-spinner inline" size={15} />处理中</> : mode === "login" ? "登录" : "创建账号"}</button>
        </form>
        <div className="login-trust"><ShieldCheck size={15} />试用阶段无需邮件验证；请妥善保存密码，暂不提供邮件找回。</div>
      </section>
    </main>
  );
}

function PasswordModal({ close, save }: { close: () => void; save: (password: string) => Promise<void> }) {
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const submit = async () => {
    if (password.length < 8) { setError("请设置至少 8 位密码"); return; }
    if (password !== confirmation) { setError("两次输入的密码不一致"); return; }
    setSaving(true); setError("");
    try { await save(password); close(); }
    catch (saveError) { setError(authErrorMessage(saveError instanceof Error ? saveError.message : "密码保存失败")); }
    finally { setSaving(false); }
  };
  return <div className="modal-backdrop" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && close()}><section className="modal-card password-modal" role="dialog" aria-modal="true" aria-labelledby="password-title"><div className="modal-heading"><div><span className="modal-icon blue"><ShieldCheck /></span><div><h2 id="password-title">设置登录密码</h2><p>已有邮件链接账号设置后，也可以使用邮箱和密码登录。</p></div></div><button className="icon-button" type="button" onClick={close} aria-label="关闭"><X size={18} /></button></div><div className="stage-extra-fields"><label><span>新密码</span><input type="password" autoComplete="new-password" value={password} onChange={(event) => setPassword(event.target.value)} placeholder="至少 8 位" /></label><label><span>确认密码</span><input type="password" autoComplete="new-password" value={confirmation} onChange={(event) => setConfirmation(event.target.value)} placeholder="再次输入密码" /></label>{error && <p className="form-error"><AlertCircle size={14} />{error}</p>}</div><div className="modal-actions"><button className="secondary-button" type="button" onClick={close} disabled={saving}>取消</button><button className="primary-button" type="button" onClick={submit} disabled={saving}>{saving ? <><LoaderCircle className="state-spinner inline" size={14} />保存中</> : "保存密码"}</button></div></section></div>;
}

export function OfferMapApp({ initialView = "home", positionId, supabaseConfig = null, localPdfPreviewEnabled = false }: { initialView?: OfferMapView; positionId?: string; supabaseConfig?: SupabasePublicConfig | null; localPdfPreviewEnabled?: boolean }) {
  const [state, setState] = useState<DemoState>("normal");
  const [analysisTab, setAnalysisTab] = useState<AnalysisTab>("evidence");
  const [modal, setModal] = useState<"resume" | "position" | "password" | null>(null);
  const [pdfPreview, setPdfPreview] = useState<{ url: string; name: string } | null>(null);
  const configured = isSupabaseConfigured(supabaseConfig);
  const [session, setSession] = useState<Session | null>(null);
  const [authReady, setAuthReady] = useState(!configured);
  const [workspaceCompanies, setWorkspaceCompanies] = useState<WorkspaceCompany[]>(configured ? [] : demoCompanies);
  const [workspaceLoading, setWorkspaceLoading] = useState(false);
  const [workspaceError, setWorkspaceError] = useState("");
  const [resumeVersions, setResumeVersions] = useState<ResumeVersion[]>(configured ? [] : demoResumeVersions);
  const localPdfFiles = useRef(new globalThis.Map<string, File>());
  const [resumesLoading, setResumesLoading] = useState(false);
  const [resumesError, setResumesError] = useState("");
  const [analysisData, setAnalysisData] = useState<PositionAnalysisData | null>(null);
  const [analysisLoading, setAnalysisLoading] = useState(initialView === "analysis" && configured);
  const [analysisRunningKind, setAnalysisRunningKind] = useState<AnalysisRunKind | null>(null);
  const [analysisRunningPhase, setAnalysisRunningPhase] = useState<AnalysisRunPhase>(null);
  const [analysisError, setAnalysisError] = useState("");
  const [positionResearch, setPositionResearch] = useState<PositionResearchState | null>(null);
  const [researchRunning, setResearchRunning] = useState(false);
  const [researchError, setResearchError] = useState("");
  const activeAnalysisRunId = analysisData?.meta?.activeRun?.id;
  const activeAnalysisRunStalled = analysisData?.meta?.activeRun?.stalled;

  const authenticatedFetch = async (path: string, init?: RequestInit) => {
    if (!session?.access_token) throw new Error("登录状态已失效，请重新登录");
    return fetchWorkspaceJson(path, session.access_token, init);
  };

  const loadWorkspace = async (sessionOrEvent: Session | unknown = session) => {
    const activeSession = sessionOrEvent && typeof sessionOrEvent === "object" && "access_token" in sessionOrEvent ? sessionOrEvent as Session : session;
    if (!activeSession) return;
    setWorkspaceLoading(true); setWorkspaceError("");
    try { const payload = await fetchWorkspaceJson("/api/companies", activeSession.access_token); setWorkspaceCompanies(mapWorkspaceCompanies(payload.data)); }
    catch (loadError) { setWorkspaceError(loadError instanceof Error ? loadError.message : "数据加载失败"); }
    finally { setWorkspaceLoading(false); }
  };

  const loadResumes = async (activeSession = session) => {
    if (!activeSession) return;
    setResumesLoading(true); setResumesError("");
    try {
      const payload = await fetchWorkspaceJson("/api/resumes", activeSession.access_token);
      setResumeVersions(Array.isArray(payload.data) ? payload.data as ResumeVersion[] : []);
    } catch (loadError) {
      setResumesError(loadError instanceof Error ? loadError.message : "简历读取失败");
    } finally { setResumesLoading(false); }
  };

  useEffect(() => {
    if (!configured) return;
    const supabase = getBrowserSupabase(supabaseConfig);
    if (!supabase) return;
    const syncSession = (nextSession: Session | null) => {
      setSession(nextSession);
      setAuthReady(true);
      if (nextSession) {
        setWorkspaceLoading(true);
        setWorkspaceError("");
        void fetchWorkspaceJson("/api/companies", nextSession.access_token)
          .then((payload) => setWorkspaceCompanies(mapWorkspaceCompanies(payload.data)))
          .catch((loadError) => setWorkspaceError(loadError instanceof Error ? loadError.message : "数据加载失败"))
          .finally(() => setWorkspaceLoading(false));
        if (initialView === "resume") {
          setResumesLoading(true);
          void fetchWorkspaceJson("/api/resumes", nextSession.access_token)
            .then((payload) => setResumeVersions(Array.isArray(payload.data) ? payload.data as ResumeVersion[] : []))
            .catch((loadError) => setResumesError(loadError instanceof Error ? loadError.message : "简历读取失败"))
            .finally(() => setResumesLoading(false));
        }
        if (initialView === "analysis" && positionId) {
          setAnalysisLoading(true); setAnalysisError("");
          void fetchWorkspaceJson(`/api/positions/${positionId}/analysis`, nextSession.access_token)
            .then((payload) => setAnalysisData(payload.data as PositionAnalysisData))
            .catch((loadError) => setAnalysisError(loadError instanceof Error ? loadError.message : "岗位分析读取失败"))
            .finally(() => setAnalysisLoading(false));
        }
      } else { setWorkspaceCompanies([]); setResumeVersions([]); setAnalysisData(null); setPositionResearch(null); }
    };
    supabase.auth.getSession().then(({ data }) => syncSession(data.session));
    const { data: listener } = supabase.auth.onAuthStateChange((_event, nextSession) => syncSession(nextSession));
    return () => listener.subscription.unsubscribe();
  }, [configured, supabaseConfig, initialView, positionId]);

  useEffect(() => {
    if (initialView !== "analysis" || !positionId || !session?.access_token || !activeAnalysisRunId || activeAnalysisRunStalled) return;
    let cancelled = false;
    let polling = false;
    const accessToken = session.access_token;
    const poll = async () => {
      if (polling) return;
      polling = true;
      try {
        const payload = await fetchWorkspaceJson(`/api/positions/${positionId}/analysis`, accessToken);
        if (cancelled) return;
        const next = payload.data as PositionAnalysisData;
        setAnalysisData(next);
        if (!next.meta?.activeRun) {
          setAnalysisError(next.position.analysis_status === "failed" ? "上次分析没有正常完成，可以重新生成。" : "");
          void fetchWorkspaceJson("/api/companies", accessToken)
            .then((workspace) => { if (!cancelled) setWorkspaceCompanies(mapWorkspaceCompanies(workspace.data)); })
            .catch(() => undefined);
        }
      } catch {
        // A transient polling failure should not replace an analysis that may still be running.
      } finally { polling = false; }
    };
    void poll();
    const timer = window.setInterval(() => void poll(), 3000);
    return () => { cancelled = true; window.clearInterval(timer); };
  }, [activeAnalysisRunId, activeAnalysisRunStalled, initialView, positionId, session?.access_token]);

  useEffect(() => {
    if (initialView !== "analysis" || analysisTab !== "research" || !positionId || !session?.access_token) return;
    let cancelled = false;
    void fetchWorkspaceJson(`/api/positions/${positionId}/research`, session.access_token)
      .then((payload) => { if (!cancelled) { setPositionResearch(payload.data as PositionResearchState); setResearchError(""); } })
      .catch((loadError) => { if (!cancelled) setResearchError(loadError instanceof Error ? loadError.message : "岗位情报读取失败"); });
    return () => { cancelled = true; };
  }, [analysisTab, initialView, positionId, session?.access_token]);

  const createPosition = async (input: NewPositionInput) => {
    if (!configured) return;
    let company = workspaceCompanies.find((item) => item.name === input.company);
    if (!company) {
      const created = await authenticatedFetch("/api/companies", { method: "POST", body: JSON.stringify({ name: input.company }) });
      company = { id: String((created.data as { id: string }).id), name: input.company, mark: input.company.slice(0,2), groups: (["技术","产品","运营","市场"] as Category[]).map((category) => ({ category, positions: [] })) };
    }
    await authenticatedFetch(`/api/companies/${company.id}/positions`, { method: "POST", body: JSON.stringify({ title: input.title, category: CATEGORY_TO_DB[input.category], department: input.department, location: input.location, jd_text: input.jdText, industry: input.industry, seniority: input.seniority, product_type: input.productType, company_type: input.companyType }) });
    await loadWorkspace();
  };

  const updateStage = async (positionId: string, input: StageUpdateInput) => {
    if (!configured) return;
    await authenticatedFetch(`/api/positions/${positionId}/application`, { method: "PATCH", body: JSON.stringify({ ...input, stage: STAGE_TO_DB[input.stage], appliedAt: input.stage === "已投递" ? input.occurredAt : undefined }) });
    await loadWorkspace();
  };

  const renameCompany = async (companyId: string, name: string) => {
    await authenticatedFetch(`/api/companies/${companyId}`, { method: "PATCH", body: JSON.stringify({ name }) });
    await loadWorkspace();
  };

  const deleteCompany = async (companyId: string) => {
    await authenticatedFetch(`/api/companies/${companyId}`, { method: "DELETE" });
    await loadWorkspace();
  };

  const updatePosition = async (positionId: string, input: UpdatePositionInput) => {
    await authenticatedFetch(`/api/positions/${positionId}`, { method: "PATCH", body: JSON.stringify({ title: input.title, category: CATEGORY_TO_DB[input.category], department: input.department, location: input.location, jd_text: input.jdText, industry: input.industry, seniority: input.seniority, product_type: input.productType, company_type: input.companyType }) });
    await loadWorkspace();
  };

  const deletePosition = async (positionId: string) => {
    await authenticatedFetch(`/api/positions/${positionId}`, { method: "DELETE" });
    await loadWorkspace();
  };

  const uploadResume = async (file: File, target: { documentId?: string; documentName?: string; direction?: string }) => {
    if (!session?.access_token) throw new Error("登录状态已失效，请重新登录");
    const form = new FormData();
    form.append("file", file);
    if (target.documentId) form.append("documentId", target.documentId);
    if (target.documentName) form.append("documentName", target.documentName);
    if (target.direction) form.append("direction", target.direction);
    const payload = await fetchWorkspaceJson("/api/resumes/parse", session.access_token, { method: "POST", body: form });
    await Promise.all([loadResumes(session), loadWorkspace(session)]);
    return { duplicate: Boolean((payload as { duplicate?: boolean }).duplicate) };
  };

  const parseLocalPdf = async (file: File) => {
    if (!localPdfPreviewEnabled) throw new Error("本地 PDF 解析预览仅在开发环境可用");
    const form = new FormData();
    form.append("file", file);
    const response = await fetch("/api/dev/resumes/parse-preview", { method: "POST", body: form });
    const payload = await response.json().catch(() => ({})) as Partial<LocalPdfParsePayload> & { error?: string };
    if (!response.ok || !payload.data) throw new Error(payload.error ?? "本地 PDF 解析失败");
    return payload as LocalPdfParsePayload;
  };

  const addLocalResumeVersion = (file: File, parsed: LocalPdfParsePayload, target: { documentId?: string; documentName?: string; direction?: string }) => {
    const id = `local-resume-${crypto.randomUUID()}`;
    const documentId = target.documentId || `local-document-${crypto.randomUUID()}`;
    const matching = resumeVersions.filter((version) => (version.document_id || version.resume_document_id || "legacy") === documentId);
    const latest = matching[0];
    const now = new Date().toISOString();
    const version: ResumeVersion = {
      id,
      name: parsed.data.name,
      version: Math.max(0, ...resumeVersions.map((item) => item.version)) + 1,
      document_version: Math.max(0, ...matching.map((item) => item.document_version ?? item.version)) + 1,
      document_id: documentId,
      resume_document_id: documentId,
      document_name: target.documentName || latest?.document_name || (documentId === "legacy" ? "默认母版简历" : parsed.data.name.replace(/\.pdf$/i, "")),
      direction: target.direction ?? latest?.direction ?? "",
      is_default_document: latest?.is_default_document ?? false,
      is_current: true,
      file_size: parsed.data.file_size,
      page_count: parsed.data.page_count,
      structured_content: parsed.data.structured_content,
      created_at: now,
      updated_at: now,
    };
    localPdfFiles.current.set(id, file);
    setResumeVersions((current) => [version, ...current.map((item) => (item.document_id || item.resume_document_id || "legacy") === documentId ? { ...item, is_current: false } : item)]);
    return version;
  };

  const uploadLocalResume = async (file: File, target: { documentId?: string; documentName?: string; direction?: string }) => {
    const parsed = await parseLocalPdf(file);
    addLocalResumeVersion(file, parsed, target);
    return { duplicate: false };
  };

  const previewResume = async (resume: ResumeVersion) => {
    if (!session?.access_token) throw new Error("登录状态已失效，请重新登录");
    const response = await fetch(`/api/resumes/${resume.id}/pdf`, { headers: { Authorization: `Bearer ${session.access_token}` } });
    if (!response.ok) {
      const payload = await response.json().catch(() => ({})) as { error?: string };
      throw new Error(payload.error ?? "PDF 读取失败");
    }
    const bytes = await response.arrayBuffer();
    const signature = new TextDecoder().decode(bytes.slice(0, 5));
    if (signature !== "%PDF-") throw new Error("文件内容不是有效 PDF，请重新上传");
    if (pdfPreview) URL.revokeObjectURL(pdfPreview.url);
    setPdfPreview({ url: URL.createObjectURL(new Blob([bytes], { type: "application/pdf" })), name: resume.name });
  };

  const closePdfPreview = () => {
    if (pdfPreview) URL.revokeObjectURL(pdfPreview.url);
    setPdfPreview(null);
  };

  const previewLocalResume = async (resume: ResumeVersion) => {
    const file = localPdfFiles.current.get(resume.id);
    if (!file) throw new Error("这条演示数据没有原始 PDF；请先上传一份本地 PDF");
    if (pdfPreview) URL.revokeObjectURL(pdfPreview.url);
    setPdfPreview({ url: URL.createObjectURL(file), name: resume.name });
  };

  const reparseResume = async (resumeId: string) => {
    await authenticatedFetch(`/api/resumes/${resumeId}/reparse`, { method: "POST", body: JSON.stringify({}) });
    await Promise.all([loadResumes(session), loadWorkspace(session)]);
  };

  const reparseLocalResume = async (resumeId: string) => {
    const source = resumeVersions.find((version) => version.id === resumeId);
    const file = localPdfFiles.current.get(resumeId);
    if (!source || !file) throw new Error("这条演示数据没有原始 PDF，无法重新解析；请先上传一份本地 PDF");
    const parsed = await parseLocalPdf(file);
    addLocalResumeVersion(file, parsed, {
      documentId: source.document_id || source.resume_document_id || "legacy",
      documentName: source.document_name,
      direction: source.direction,
    });
  };

  const saveResumeSections = async (resumeId: string, sections: ResumeSection[]) => {
    await authenticatedFetch(`/api/resumes/${resumeId}`, { method: "PATCH", body: JSON.stringify({ sections }) });
    await Promise.all([loadResumes(session), loadWorkspace(session)]);
  };

  const activateResumeVersion = async (resumeId: string) => {
    await authenticatedFetch(`/api/resumes/${resumeId}`, { method: "PUT" });
    await Promise.all([loadResumes(session), loadWorkspace(session)]);
  };

  const deleteResumeVersion = async (resumeId: string) => {
    await authenticatedFetch(`/api/resumes/${resumeId}`, { method: "DELETE" });
    await Promise.all([loadResumes(session), loadWorkspace(session)]);
  };

  const runPositionAnalysis = async (kind: AnalysisRunKind, phase: "core" | "expand" = "core") => {
    if (!positionId) return;
    setAnalysisRunningKind(kind); setAnalysisRunningPhase(kind === "evidence" ? null : phase === "expand" ? "expand" : "deep"); setAnalysisTab(kind); setAnalysisError("");
    try {
      const endpoint = kind === "evidence" ? "analysis" : kind === "benchmark" ? "benchmark-analysis" : kind === "resume" ? "resume-suggestions" : "interview-map";
      const hasCurrent = kind === "evidence" ? Boolean(analysisData?.evidence.length) : kind === "benchmark" ? Boolean(analysisData?.benchmark?.evidence.length) : kind === "resume" ? Boolean(analysisData?.suggestions.length) : Boolean(analysisData?.questions.length);
      const payload = await authenticatedFetch(`/api/positions/${positionId}/${endpoint}`, { method: "POST", body: JSON.stringify(kind === "evidence" ? { force: hasCurrent } : { force: hasCurrent, phase }) });
      const applyPayload = (response: { data?: unknown }) => {
        if (kind === "benchmark") {
          const benchmark = response.data as { profile?: BenchmarkProfile | null; evidence?: BenchmarkEvidenceRecord[] };
          setAnalysisData((current) => current ? { ...current, benchmark: { profile: benchmark.profile ?? null, evidence: benchmark.evidence ?? [] } } : current);
          return {} as Partial<PositionAnalysisData>;
        }
        const next = response.data as Partial<PositionAnalysisData>;
        setAnalysisData((current) => current ? { ...current, ...next, meta: { ...(current.meta ?? {}), ...(next.meta ?? {}) } } : next as PositionAnalysisData);
        return next;
      };
      const result = applyPayload(payload);
      if (result.meta?.inProgress) return;
      if (session?.access_token) {
        const refreshed = await fetchWorkspaceJson(`/api/positions/${positionId}/analysis`, session.access_token);
        setAnalysisData(refreshed.data as PositionAnalysisData);
      }
      await loadWorkspace();
    } catch (runError) {
      let recoveredRunningTask = false;
      if (session?.access_token) {
        try {
          const payload = await fetchWorkspaceJson(`/api/positions/${positionId}/analysis`, session.access_token);
          const refreshed = payload.data as PositionAnalysisData;
          setAnalysisData(refreshed);
          recoveredRunningTask = Boolean(refreshed.meta?.activeRun && !refreshed.meta.activeRun.stalled);
        } catch { setAnalysisData(null); }
      }
      setAnalysisError(recoveredRunningTask ? "" : runError instanceof Error ? runError.message : "分析失败，请重试");
    } finally { setAnalysisRunningKind(null); setAnalysisRunningPhase(null); }
  };

  const runPositionResearch = async (force = false) => {
    if (!positionId) return;
    setResearchRunning(true);
    setResearchError("");
    try {
      const payload = await authenticatedFetch(`/api/positions/${positionId}/research`, { method: "POST", body: JSON.stringify({ force }) });
      const next = payload.data as PositionResearchState & { inProgress?: boolean };
      if (next.inProgress) {
        setResearchError("已有一次岗位研究正在进行，请稍后返回查看。");
        return;
      }
      setPositionResearch(next);
    } catch (runError) {
      setResearchError(runError instanceof Error ? runError.message : "岗位情报生成失败，请重试");
    } finally {
      setResearchRunning(false);
    }
  };

  const changeAnalysisResume = async (resumeVersionId: string) => {
    if (!positionId) return;
    await authenticatedFetch(`/api/positions/${positionId}/resume-binding`, { method: "PUT", body: JSON.stringify({ resumeVersionId }) });
    if (session?.access_token) {
      const refreshed = await fetchWorkspaceJson(`/api/positions/${positionId}/analysis`, session.access_token);
      setAnalysisData(refreshed.data as PositionAnalysisData);
    }
    setAnalysisTab("evidence");
    setAnalysisError("");
    await loadWorkspace();
  };

  const toggleResumeSuggestion = async (id: string, accepted: boolean) => {
    const payload = await authenticatedFetch(`/api/resume-suggestions/${id}`, { method: "PATCH", body: JSON.stringify({ accepted }) });
    const updated = payload.data as ResumeSuggestionRecord;
    setAnalysisData((current) => current ? { ...current, suggestions: current.suggestions.map((item) => item.id === id ? updated : item) } : current);
  };

  const saveQuestionPreparation = async (id: string, preparation: QuestionPreparation) => {
    const payload = await authenticatedFetch(`/api/interview-questions/${id}/preparation`, { method: "PATCH", body: JSON.stringify(preparation) });
    const saved = payload.data as QuestionPreparation;
    setAnalysisData((current) => current ? { ...current, questions: current.questions.map((item) => item.id === id ? { ...item, preparation: saved } : item) } : current);
  };

  const signOut = async () => { await getBrowserSupabase(supabaseConfig)?.auth.signOut(); setWorkspaceCompanies([]); setPositionResearch(null); };
  const saveLoginPassword = async (password: string) => {
    const supabase = getBrowserSupabase(supabaseConfig);
    if (!supabase) throw new Error("登录服务尚未配置");
    const { error } = await supabase.auth.updateUser({ password });
    if (error) throw error;
  };

  if (configured && !authReady) return <div className="auth-loading"><LoaderCircle className="state-spinner" size={34} /><p>正在恢复登录状态…</p></div>;
  if (configured && !session && supabaseConfig) return <LoginScreen supabaseConfig={supabaseConfig} />;
  const activeCompanies = configured ? workspaceCompanies : demoCompanies;
  const rawUserName = session?.user.user_metadata?.full_name ?? session?.user.user_metadata?.name;
  const userName = typeof rawUserName === "string" ? rawUserName : undefined;
  const accountAvatar = createAccountAvatar({ email: session?.user.email, name: userName, accountKey: session?.user.id });
  const canUploadResume = configured || localPdfPreviewEnabled;
  return <div className="offermap-app"><AppHeader view={initialView} companies={activeCompanies} userEmail={session?.user.email} userName={userName} accountKey={session?.user.id} signOut={session ? signOut : undefined} openPassword={session ? () => setModal("password") : undefined} /><main className={`page-container view-${initialView}`}><div className={`connection-banner ${configured ? "live" : "demo"}`}><span><i />{configured ? "实时数据已连接" : localPdfPreviewEnabled && initialView === "resume" ? "本地解析预览" : "演示模式"}</span><p>{configured ? initialView === "analysis" ? "岗位、分析简历、通用能力画像与 AI 结果会按版本保存" : "多份简历 PDF、岗位和求职进度会保存到你的账号" : localPdfPreviewEnabled && initialView === "resume" ? "PDF 仅在本机解析并暂存在当前页面，不会保存或发送给 AI" : "配置 Supabase 后即可启用邮箱登录与永久保存"}</p>{workspaceLoading && <LoaderCircle className="state-spinner inline" size={13} />}{workspaceError && <button type="button" onClick={loadWorkspace}>重新加载</button>}</div>{state === "normal" ? <>{initialView === "home" && <HomeView companies={activeCompanies} />}{initialView === "resume" && <ResumeView openUpload={canUploadResume ? () => setModal("resume") : undefined} versions={resumeVersions} loading={configured && resumesLoading} error={configured ? resumesError : ""} preview={configured ? previewResume : previewLocalResume} reparse={configured ? reparseResume : reparseLocalResume} saveSections={configured ? saveResumeSections : async () => { throw new Error("本地预览暂不支持保存人工校正稿"); }} activateVersion={configured ? activateResumeVersion : async () => { throw new Error("本地预览暂不支持切换演示版本"); }} deleteVersion={configured ? deleteResumeVersion : async () => { throw new Error("本地预览结果会在刷新页面后自动清除"); }} />}{initialView === "positions" && <PositionsView openNewPosition={() => setModal("position")} companies={activeCompanies} onStageUpdate={configured ? updateStage : undefined} onCompanyRename={configured ? renameCompany : undefined} onCompanyDelete={configured ? deleteCompany : undefined} onPositionUpdate={configured ? updatePosition : undefined} onPositionDelete={configured ? deletePosition : undefined} />}{initialView === "map" && <MapView companies={activeCompanies} accountAvatar={accountAvatar} />}{initialView === "analysis" && <AnalysisView tab={analysisTab} setTab={setAnalysisTab} data={configured ? analysisData : null} loading={configured && analysisLoading} runningKind={configured ? analysisRunningKind : null} runningPhase={configured ? analysisRunningPhase : null} error={configured ? analysisError : ""} run={configured ? runPositionAnalysis : async () => {}} changeResume={configured ? changeAnalysisResume : async () => {}} toggleSuggestion={configured ? toggleResumeSuggestion : async () => {}} savePreparation={configured ? saveQuestionPreparation : async () => {}} research={configured ? positionResearch : null} researchLoading={configured && analysisTab === "research" && positionResearch === null && !researchError} researchRunning={configured && researchRunning} researchError={configured ? researchError : ""} runResearch={configured ? runPositionResearch : async () => {}} live={configured} />}</> : <AlternateState view={initialView} state={state} onReset={() => setState("normal")} />}</main>{!configured && <StatusPreview view={initialView} state={state} onChange={setState} />}{modal === "resume" && canUploadResume && <UploadModal close={() => setModal(null)} upload={configured ? uploadResume : uploadLocalResume} versions={resumeVersions} localOnly={!configured} />}{modal === "position" && <PositionModal close={() => setModal(null)} save={configured ? createPosition : undefined} />}{modal === "password" && <PasswordModal close={() => setModal(null)} save={saveLoginPassword} />}{pdfPreview && <PdfPreviewModal preview={pdfPreview} close={closePdfPreview} />}</div>;
}
