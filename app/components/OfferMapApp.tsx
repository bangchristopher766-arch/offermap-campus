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
  FileCheck2,
  FileText,
  Filter,
  LoaderCircle,
  LogOut,
  Map,
  MoreHorizontal,
  Plus,
  RefreshCw,
  Route,
  Search,
  ShieldCheck,
  SlidersHorizontal,
  Sparkles,
  Target,
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
type AnalysisTab = "evidence" | "resume" | "interview";
type AnalysisRunPhase = "deep" | "expand" | null;
type Category = "技术" | "产品" | "运营" | "市场";
type ApplicationStage = "感兴趣" | "准备中" | "已投递" | "笔试中" | "一面中" | "二面中" | "终面中" | "Offer 沟通" | "已录用" | "未通过" | "已放弃";
type DemoPosition = { id: string; title: string; location: string; stage: ApplicationStage; analysis: string; next?: string; href: string };
type WorkspaceCompany = { id: string; name: string; mark: string; groups: Array<{ category: Category; positions: DemoPosition[] }> };
type NewPositionInput = { company: string; title: string; category: Category; department: string; location: string; jdText: string };
type StageUpdateInput = { stage: ApplicationStage; occurredAt: string; nextEventAt?: string; nextEventType?: string; note?: string };
type ResumeSection = { title: string; items: string[] };
type ResumeParseQuality = { level: "high" | "medium" | "low"; detected_sections: number; total_lines: number; warnings: string[] };
type ResumeVersion = {
  id: string;
  name: string;
  version: number;
  file_size: number;
  page_count: number;
  structured_content: { parser_version?: number; sections?: ResumeSection[]; quality?: ResumeParseQuality } | null;
  created_at: string;
  updated_at: string;
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
};
type AnalysisPosition = {
  id: string;
  title: string;
  category: "technology" | "product" | "operations" | "marketing";
  department: string;
  location: string;
  job_code: string;
  analysis_status: "pending" | "processing" | "ready" | "stale" | "failed";
  analyzed_resume_version?: number | null;
  companies?: { name: string } | Array<{ name: string }> | null;
  applications?: Array<{ current_stage: string; next_event_at?: string | null; next_event_type?: string | null }>;
};
type AnalysisResume = {
  id: string;
  name: string;
  version: number;
  structured_content?: { sections?: ResumeSection[] } | null;
};
type PositionAnalysisData = {
  position: AnalysisPosition;
  resume?: AnalysisResume | null;
  evidence: AnalysisEvidenceItem[];
  suggestions: ResumeSuggestionRecord[];
  questions: InterviewQuestionRecord[];
  meta?: { model?: string; provider?: string; durationMs?: number; phase?: "core" | "expand"; resumeCompleted?: boolean; interviewCompleted?: boolean };
};

const NAV_ITEMS: Array<{ key: OfferMapView; label: string; href: string }> = [
  { key: "home", label: "首页", href: "/" },
  { key: "resume", label: "我的简历", href: "/resume" },
  { key: "positions", label: "目标岗位", href: "/positions" },
  { key: "map", label: "求职地图", href: "/map" },
];

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
          location: [position.location, position.department].filter(Boolean).join(" · ") || "地点待补充",
          stage: STAGE_FROM_DB[String(application?.current_stage)] ?? "准备中",
          analysis: position.analysis_status === "ready" ? "分析已完成" : position.analysis_status === "stale" ? "分析需要更新" : "尚未生成分析",
          next: nextEvent && !Number.isNaN(nextEvent.getTime()) ? nextEvent.toLocaleString("zh-CN", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" }) : undefined,
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
    loading: { title: "正在解析简历", body: "正在识别教育、实习、项目和技能，预计还需 20 秒。" },
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

function AppHeader({ view, companies, userEmail, signOut }: { view: OfferMapView; companies: WorkspaceCompany[]; userEmail?: string; signOut?: () => void }) {
  const navView = view === "analysis" ? "positions" : view;
  const [searchOpen, setSearchOpen] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
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
          <a className="brand" href="/" aria-label="OfferMap 首页">
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
              <button className="avatar" type="button" onClick={() => { setProfileOpen(!profileOpen); setCreateOpen(false); }} aria-label="个人中心" aria-expanded={profileOpen}>林</button>
              {profileOpen && <div className="header-popover profile-menu"><div className="profile-summary"><span className="avatar">林</span><div><strong>{userEmail ? userEmail.split("@")[0] : "林同学"}</strong><small>{userEmail ?? "演示账号 · 产品方向"}</small></div></div><a href="/resume"><FileText size={15} />母版简历</a><a href="/map"><Map size={15} />我的求职地图</a>{signOut ? <button type="button" onClick={signOut}><LogOut size={15} />退出登录</button> : <div className="profile-plan"><Sparkles size={13} />演示账号 · 配置 Supabase 后启用登录</div>}</div>}
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

function formatResumeDate(value: string, includeTime = false) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "时间未知";
  return date.toLocaleString("zh-CN", includeTime
    ? { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" }
    : { month: "short", day: "numeric" });
}

function ResumeView({ openUpload, versions, loading, error, preview, reparse }: { openUpload: () => void; versions: ResumeVersion[]; loading: boolean; error: string; preview: (resume: ResumeVersion) => Promise<void>; reparse: (resumeId: string) => Promise<void> }) {
  const current = versions[0];
  const sections = current?.structured_content?.sections ?? [];
  const quality = current?.structured_content?.quality;
  const [previewing, setPreviewing] = useState<string | null>(null);
  const [reparsing, setReparsing] = useState(false);
  const [actionError, setActionError] = useState("");
  const openPreview = async (resume: ResumeVersion) => {
    setPreviewing(resume.id); setActionError("");
    try { await preview(resume); }
    catch (previewError) { setActionError(previewError instanceof Error ? previewError.message : "PDF 预览失败"); }
    finally { setPreviewing(null); }
  };
  const runReparse = async () => {
    if (!current) return;
    setReparsing(true); setActionError("");
    try { await reparse(current.id); }
    catch (reparseError) { setActionError(reparseError instanceof Error ? reparseError.message : "重新解析失败"); }
    finally { setReparsing(false); }
  };
  return (
    <>
      <PageHeader eyebrow="独立资料库" title="我的简历" description="每次上传都会保留一个私有 PDF 版本。岗位定制建议只生成副本，不会覆盖母版。" action={<button className="primary-button" type="button" onClick={openUpload}><Upload size={16} />{current ? "更新简历" : "上传简历"}</button>} />
      {loading ? <section className="card resume-loading"><LoaderCircle className="state-spinner" size={25} /><div><strong>正在读取简历版本</strong><p>正在安全加载你的 PDF 和解析结果。</p></div></section>
        : error ? <section className="card resume-empty error"><AlertCircle size={24} /><h2>简历暂时无法读取</h2><p>{error}</p><button className="primary-button" type="button" onClick={openUpload}>重新上传</button></section>
        : !current ? <section className="card resume-empty"><span className="empty-resume-icon"><FileText size={28} /></span><h2>上传第一份母版简历</h2><p>支持 10 MB 以内的文本型 PDF。上传后会保存私有原文件、解析内容和版本记录。</p><button className="primary-button" type="button" onClick={openUpload}><Upload size={16} />选择 PDF</button></section>
        : <div className="resume-layout">
          <section className="card content-card"><div className="card-heading"><h2>当前母版</h2><span className={`parse-quality ${quality?.level ?? "medium"}`}><CheckCircle2 size={13} />{quality?.level === "high" ? "结构识别良好" : quality?.level === "low" ? "建议检查结构" : "解析完成"}</span></div><div className="file-card"><span className="pdf-file"><FileText /></span><div><strong>{current.name}</strong><small>v{current.version} · {formatFileSize(current.file_size)} · {current.page_count || "?"} 页 · 更新于 {formatResumeDate(current.updated_at, true)}</small></div><button className="secondary-button compact" type="button" onClick={() => openPreview(current)} disabled={previewing === current.id}>{previewing === current.id ? <><LoaderCircle className="state-spinner inline" size={13} />读取中</> : "预览 PDF"}</button></div>{quality?.warnings?.length ? <div className="parse-warning"><AlertCircle size={15} /><span>{quality.warnings[0]}</span><button type="button" onClick={runReparse} disabled={reparsing}>{reparsing ? "解析中…" : "用新版重新解析"}</button></div> : current.structured_content?.parser_version !== 2 ? <div className="parse-upgrade"><Sparkles size={15} /><span>新版解析器可以更准确识别多栏简历与栏目边界。</span><button type="button" onClick={runReparse} disabled={reparsing}>{reparsing ? "解析中…" : "升级解析结果"}</button></div> : null}{actionError && <p className="form-error resume-action-error"><AlertCircle size={14} />{actionError}</p>}<div className="resume-outline">
            {sections.slice(0, 7).map((section) => <div className="outline-row" key={section.title}><span>{section.title}</span><strong>{section.items.slice(0, 2).join(" · ") || "已识别内容"}</strong><small>{section.items.length} 行</small><ChevronRight size={15} /></div>)}
            {!sections.length && <div className="outline-placeholder"><FileCheck2 size={18} /><span>PDF 已保存，结构化内容将在下次更新时重新解析。</span></div>}
          </div></section>
          <aside className="card side-card"><div className="card-heading"><h2>版本记录</h2><span className="version-count">{versions.length} 个版本</span></div><div className="version-list">{versions.map((version, index) => <div className={`version-item ${index === 0 ? "current" : ""}`} key={version.id}><span>v{version.version}{index === 0 ? " · 当前版本" : ""}</span><strong>{version.name}</strong><small>{formatResumeDate(version.updated_at, index === 0)} · {formatFileSize(version.file_size)} · {version.page_count || "?"} 页</small><button type="button" onClick={() => openPreview(version)} disabled={previewing === version.id}>{previewing === version.id ? "读取中…" : <><span>查看 PDF</span><ArrowUpRight size={12} /></>}</button></div>)}</div><div className="privacy-note"><ShieldCheck size={17} /><p><strong>私有版本保护</strong>PDF 仅在你点击预览时通过登录态读取，不再使用容易失效的外部链接。</p></div></aside>
        </div>}
    </>
  );
}

function PositionsView({ openNewPosition, companies, onStageUpdate }: { openNewPosition: () => void; companies: WorkspaceCompany[]; onStageUpdate?: (positionId: string, input: StageUpdateInput) => Promise<void> }) {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("全部类别");
  const [statusFilter, setStatusFilter] = useState("全部进度");
  const [stageOverrides, setStageOverrides] = useState<Record<string, ApplicationStage>>({});
  const [editing, setEditing] = useState<{ companyId: string; positionId: string } | null>(null);
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
        return <article className="card company-card" key={company.id}><div className="company-heading"><span className={`company-mark ${company.id}`}>{company.mark}</span><div><h2>{company.name}</h2><p>{companyPositions.length} 个岗位 · 已投递 {submittedCount} · 面试中 {interviewCount} · Offer {offerCount}</p></div><button className="icon-button" type="button" aria-label={`${company.name}更多操作`}><MoreHorizontal size={18} /></button></div><div className="category-grid">{company.groups.map((group) => {
          const visibleByCategory = category === "全部类别" || category === group.category;
          const groupPositions = group.positions.filter((position) => statusFilter === "全部进度" || position.stage === statusFilter || (statusFilter === "面试中" && ["一面中","二面中","终面中"].includes(position.stage)) || (statusFilter === "Offer 阶段" && ["Offer 沟通","已录用"].includes(position.stage)));
          return <section className={`category-column ${!visibleByCategory ? "dimmed" : ""}`} key={group.category}><div className="category-title"><i className={`category-dot ${group.category}`} />{group.category}<span>{group.positions.length}</span></div>{groupPositions.length ? groupPositions.map((position) => <div className="position-record" key={position.id}><a href={position.href} className="position-row"><strong>{position.title}</strong><small>{position.location}</small><span className="analysis-hint">{position.analysis}</span><ChevronRight size={14} /></a><button className={`application-stage ${stageTone(position.stage)}`} type="button" onClick={() => setEditing({ companyId: company.id, positionId: position.id })}>{position.stage}<ChevronDown size={11} /></button>{position.next && <span className="position-next"><CalendarDays size={11} />{position.next}</span>}</div>) : group.positions.length ? <p className="filtered-empty">当前筛选下无岗位</p> : <button className="empty-category" type="button" onClick={openNewPosition}><Plus size={13} />添加岗位</button>}</section>;
        })}</div></article>;
      })}</div>
      {editing && editingPosition && <StageModal position={editingPosition} close={() => setEditing(null)} update={updateStage} />}
    </>
  );
}

function MapView({ companies }: { companies: WorkspaceCompany[] }) {
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
      <section className="card career-map"><div className="map-grid" />{visibleCompanies.map((_, index) => <div className={`map-connector ${["c-one","c-two","c-three"][index]}`} key={`line-${index}`} />)}<div className="map-root"><span className="avatar large">林</span><strong>我的求职目标</strong><small>{visibleCompanies.length} 家公司显示中</small></div>
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

function AnalysisView({ tab, setTab, data, loading, runningKind, runningPhase, error, run, toggleSuggestion, live }: { tab: AnalysisTab; setTab: (tab: AnalysisTab) => void; data: PositionAnalysisData | null; loading: boolean; runningKind: AnalysisTab | null; runningPhase: AnalysisRunPhase; error: string; run: (kind: AnalysisTab) => Promise<void>; toggleSuggestion: (id: string, accepted: boolean) => Promise<void>; live: boolean }) {
  const position = data?.position;
  const companyRelation = position?.companies;
  const companyName = Array.isArray(companyRelation) ? companyRelation[0]?.name : companyRelation?.name;
  const categoryName = position ? CATEGORY_FROM_DB[position.category] : "岗位";
  const application = position?.applications?.[0];
  const stage = application ? STAGE_FROM_DB[application.current_stage] ?? "准备中" : "准备中";
  const nextEvent = application?.next_event_at ? new Date(application.next_event_at) : null;
  const hasEvidence = Boolean(data?.evidence.length);
  const running = Boolean(runningKind);
  const modelLabel = data?.meta?.model?.startsWith("deepseek") ? "DeepSeek" : "AI";
  const actionLabel = running ? "正在分析" : hasEvidence ? "重新生成" : "开始分析";
  return (
    <>
      <div className="analysis-heading"><div><div className="breadcrumb"><a href="/positions">{companyName ?? (live ? "目标岗位" : "字节跳动")}</a><ChevronRight size={13} /><span>{live ? categoryName : "产品"}</span><ChevronRight size={13} /><span>{position?.title ?? (live ? "岗位分析" : "AI 产品经理实习生")}</span></div><h1>{position?.title ?? (live ? "岗位分析" : "AI 产品经理实习生")}</h1><p>{position ? [position.location, position.department, position.job_code].filter(Boolean).join(" · ") || "岗位信息已保存" : live ? "正在读取岗位与简历数据" : "北京 · Flow 产品团队 · JD-2026-0821"}</p></div>{(!live || position) && <button className="primary-button" type="button" onClick={() => void run("evidence")} disabled={running || loading}>{runningKind === "evidence" ? <LoaderCircle className="state-spinner inline" size={15} /> : <RefreshCw size={15} />}{actionLabel}</button>}</div>
      {loading && <section className="card analysis-state-card"><LoaderCircle className="state-spinner" size={28} /><div><strong>正在读取岗位分析</strong><p>正在同步 JD、简历版本和已保存的证据。</p></div></section>}
      {error && <section className="analysis-inline-error"><AlertCircle size={16} /><span>{error}</span>{position && !running && <button type="button" onClick={() => void run(tab)}>重试分析</button>}</section>}
      {position && <section className="card application-progress"><div className="progress-heading"><div><span>求职进度</span><strong>{nextEvent && !Number.isNaN(nextEvent.getTime()) ? `下一安排：${nextEvent.toLocaleString("zh-CN", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}${application?.next_event_type ? ` · ${application.next_event_type}` : ""}` : "还没有设置下一安排"}</strong></div><span className={`application-stage ${stageTone(stage)}`}>{stage}</span></div><div className={`analysis-run-note ${position.analysis_status}`}><Sparkles size={14} /><span><strong>分析状态：</strong>{running || position.analysis_status === "processing" ? "AI 正在拆解能力要求、召回候选经历并进行深度判断。" : position.analysis_status === "ready" ? `${modelLabel} 证据地图已保存${position.analyzed_resume_version ? `，对应母版简历 v${position.analyzed_resume_version}` : ""}。` : position.analysis_status === "stale" ? "简历或 JD 已更新，需要重新生成证据地图。" : position.analysis_status === "failed" ? "上次分析没有通过校验，可以重新生成。" : "尚未生成证据地图。"}</span></div></section>}
      {live && position && !loading && !hasEvidence && !running && <section className="card analysis-empty-card"><span><WandSparkles size={25} /></span><h2>开始串联这份 JD 与母版简历</h2><p>AI 会按语义理解岗位能力与真实经历，允许跨措辞和多条证据组合；所有引用仍会在保存前校验。</p><button className="primary-button" type="button" onClick={() => void run("evidence")}><Sparkles size={15} />开始深度分析</button></section>}
      {running && <section className="card analysis-running-card"><div className="analysis-running-icon"><LoaderCircle className="state-spinner" size={24} /></div><div><strong>{runningKind === "resume" ? runningPhase === "expand" ? "核心定制建议已保存，正在补充细节" : "正在深度分析岗位定制简历" : runningKind === "interview" ? runningPhase === "expand" ? "核心面试问题已保存，正在扩展追问" : "正在深度分析面试追问地图" : "正在生成深度证据地图"}</strong><p>{runningKind === "resume" ? runningPhase === "expand" ? "正在避开重复内容，补充中低优先级要求和能力缺口；你已经可以查看第一批结果。" : "先深度判断最关键的简历取舍，再单独整理和校验来源 ID。" : runningKind === "interview" ? runningPhase === "expand" ? "正在补充不同考察角度；第一批高优先级问题已经可以查看。" : "先推理核心考察意图和问题链路，再单独整理和校验来源 ID。" : "正在拆解 JD、召回语义相近经历、组合多条证据并复核判断。"}</p><div className="loading-track"><span /></div></div></section>}
      {(!live || hasEvidence) && <>
      <div className="analysis-tabs" role="tablist">{([['evidence','证据地图'],['resume','定制简历'],['interview','面试追问地图']] as Array<[AnalysisTab,string]>).map(([key,label]) => <button type="button" role="tab" aria-selected={tab === key} className={tab === key ? "active" : ""} onClick={() => setTab(key)} key={key}>{label}</button>)}</div>
      {tab === "evidence" && <EvidencePanel items={live ? data?.evidence : undefined} />}{tab === "resume" && (live ? data?.suggestions?.length ? <ResumeSuggestionsPanel items={data.suggestions} resume={data.resume} onToggle={toggleSuggestion} onRegenerate={() => run("resume")} running={runningKind === "resume"} /> : data?.meta?.resumeCompleted ? <NoResumeChanges onRegenerate={() => run("resume")} running={runningKind === "resume"} /> : <PendingAnalysisModule title="生成岗位定制版简历" body="保留母版简历的完整结构，只对与 JD 最相关的经历做有针对性的重新表达；同一条经历只改写一次。" action="生成定制简历" onAction={() => run("resume")} running={runningKind === "resume"} /> : <ResumeSuggestionsPanel />)}{tab === "interview" && (live ? data?.questions?.length ? <InterviewPanel items={data.questions} evidence={data.evidence} onRegenerate={() => run("interview")} running={runningKind === "interview"} /> : <PendingAnalysisModule title="生成面试追问地图" body="从高优先级 JD、突出经历和能力缺口生成主问题、递进追问、回答结构与风险提示。" action="生成追问地图" onAction={() => run("interview")} running={runningKind === "interview"} /> : <InterviewPanel />)}
      </>}
    </>
  );
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

function EvidencePanel({ items }: { items?: AnalysisEvidenceItem[] }) {
  const [selectedId, setSelectedId] = useState(items?.[0]?.id ?? "");
  if (!items) return <div className="analysis-layout"><div className="analysis-list"><div className="analysis-summary card"><div><span>高优先级要求</span><strong>3 / 4 已覆盖</strong></div><div><span>全部 JD 要求</span><strong>7 / 10 已覆盖</strong></div><p>不使用虚假的百分制匹配度，只展示可解释的证据状态。</p></div>{evidence.map((item) => <article className="card evidence-card" key={item.title}><div className="evidence-top"><div><span>{item.type}</span><h2>{item.title}</h2></div><em className={`evidence-status ${item.tone}`}>{item.status}</em></div><blockquote>{item.quote}</blockquote><p>{item.reason}</p><button className="text-button" type="button">查看补强动作 <ArrowRight size={14} /></button></article>)}</div><SourcePanel jdQuote="参与 AI 创作工具的产品设计，能够独立完成用户需求分析与产品方案设计" resumeQuote="负责校园内容社区从 0 到 1 的需求调研、原型设计和两轮迭代" /></div>;
  const selected = items.find((item) => item.id === selectedId) ?? items[0];
  const covered = items.filter((item) => firstRelation(item)?.status !== "missing").length;
  const highPriority = items.filter((item) => item.importance === "high");
  const coveredHigh = highPriority.filter((item) => firstRelation(item)?.status !== "missing").length;
  const kindLabel = { required: "必备要求", preferred: "加分要求", responsibility: "岗位职责" } as const;
  const statusLabel = { strong: "证据充分", partial: "部分支持", missing: "暂无证据" } as const;
  const tone = { strong: "good", partial: "partial", missing: "missing" } as const;
  return <div className="analysis-layout"><div className="analysis-list"><div className="analysis-summary card"><div><span>高优先级要求</span><strong>{coveredHigh} / {highPriority.length} 已覆盖</strong></div><div><span>全部 JD 要求</span><strong>{covered} / {items.length} 已覆盖</strong></div><p>不使用虚假的百分制匹配度，只展示可解释的证据状态。</p></div>{items.map((item) => {
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

function ResumeSuggestionsPanel({ items, resume, onToggle, onRegenerate, running = false }: { items?: ResumeSuggestionRecord[]; resume?: AnalysisResume | null; onToggle?: (id: string, accepted: boolean) => Promise<void>; onRegenerate?: () => Promise<void>; running?: boolean }) {
  const [accepted, setAccepted] = useState<string[]>(items?.filter((item) => item.accepted).map((item) => item.id) ?? []);
  const [copied, setCopied] = useState("");
  const [copiedFull, setCopiedFull] = useState(false);
  const liveItems = items ?? suggestions.map((item, index) => ({ id: `demo-${index}`, action: item.action === "改写" ? "rewrite" as const : "add" as const, original_text: item.original, suggested_text: item.revised, reason: item.reason, risk: "面试时需能够解释改写后的每项事实。", accepted: false }));
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
  return <div className="analysis-layout"><div className="analysis-list">{sections.length > 0 && <section className="card tailored-resume"><div className="tailored-resume-head"><div><span>岗位定制版 · 母版 v{resume?.version}</span><h2>{resume?.name?.replace(/\.pdf$/i, "") || "定制简历"}</h2><p>{liveItems.length} 处针对性调整，其余内容保持母版原文</p></div><button className="secondary-button compact" type="button" onClick={() => void copyFullResume()}><Copy size={14} />{copiedFull ? "已复制整版" : "复制定制版"}</button></div><div className="tailored-resume-body">{sections.map((section) => <section key={section.title}><h3>{section.title}</h3>{section.items.map((item, index) => { const tailored = tailoredItem(item); return <div className={`tailored-line ${tailored.modified ? "modified" : ""}`} key={`${section.title}-${index}`}><span>{tailored.modified ? <Sparkles size={13} /> : "•"}</span><p>{tailored.text}</p>{tailored.modified && <em>已针对 JD 调整</em>}</div>; })}</section>)}</div></section>}<div className="truth-banner"><ShieldCheck size={18} /><span><strong>一版完整定制简历</strong>保留完整结构，只改写与岗位最相关的内容；同一条母版原文不会出现多个版本。</span>{onRegenerate && <button className="secondary-button compact" type="button" onClick={() => void onRegenerate()} disabled={running}><RefreshCw size={13} />重新生成</button>}</div><div className="module-section-title"><span>改写明细</span><p>查看每一处修改的原因、JD 来源和面试风险</p></div>{liveItems.map((item) => <article className={`card suggestion-card ${selected?.id === item.id ? "selected" : ""}`} key={item.id}><div className="suggestion-head"><span>{actionLabel[item.action]}</span><h2>{item.action === "add" ? "建议补充内容" : "针对性改写"}</h2></div><div className="rewrite-grid"><div><small>母版原文</small><p>{item.original_text}</p></div><ArrowRight size={17} /><div className="revised"><small>建议版本</small><p>{item.edited_text || item.suggested_text}</p></div></div><div className="suggestion-reason"><Sparkles size={15} /><p>{item.reason}</p></div><div className="suggestion-risk"><AlertCircle size={14} /><p><strong>面试风险</strong>{item.risk}</p></div><div className="suggestion-actions"><button className="text-button" type="button" onClick={() => setSelectedId(item.id)}>查看关联 JD <ArrowRight size={13} /></button><button className="secondary-button compact" type="button" onClick={() => void copy(item)}><Copy size={14} />{copied === item.id ? "已复制" : "复制"}</button><button className={`primary-button compact ${accepted.includes(item.id) ? "accepted" : ""}`} type="button" onClick={() => void toggle(item)}>{accepted.includes(item.id) ? <><Check size={14} />已采纳</> : "采纳建议"}</button></div></article>)}</div><SourcePanel jdQuote={selected?.jd_quotes?.[0] ?? ""} resumeQuote={selected?.original_text ?? ""} /></div>;
}

function InterviewPanel({ items, evidence: evidenceItems = [], onRegenerate, running = false }: { items?: InterviewQuestionRecord[]; evidence?: AnalysisEvidenceItem[]; onRegenerate?: () => Promise<void>; running?: boolean }) {
  const liveItems = items ?? questions.map((item, index) => ({ id: `demo-q-${index}`, priority: "high" as const, priority_reason: "核心 JD 与突出经历直接交叉", main_question: item.title, intent: item.intent, answer_structure: ["背景与目标", "判断依据", "个人动作", "结果验证", "复盘边界"], missing_information: "", risk: "避免只描述团队成果，需要明确个人贡献。", source_requirement_ids: [], source_evidence_ids: [], question_followups: item.followups.map((question, followIndex) => ({ id: `${index}-${followIndex}`, sort_order: followIndex + 1, question })) }));
  const [selectedId, setSelectedId] = useState(liveItems[0]?.id ?? "");
  const selected = liveItems.find((item) => item.id === selectedId) ?? liveItems[0];
  const sourceRequirements = selected ? evidenceItems.filter((item) => selected.source_requirement_ids.includes(item.id)) : [];
  const sourceQuotes = sourceRequirements.flatMap((item) => resumeQuotesFrom(item));
  const priorityLabel = { high: "高", medium: "中", low: "低" } as const;
  return <div className="analysis-layout"><div className="analysis-list"><div className="question-legend"><span><i className="high" />高优先级：核心 JD 与突出经历直接交叉</span><span><i />中优先级：验证能力深度与缺口</span>{onRegenerate && <button className="secondary-button compact" type="button" onClick={() => void onRegenerate()} disabled={running}><RefreshCw size={13} />重新生成</button>}</div>{liveItems.map((item,index) => <article className={`card question-card ${selected?.id === item.id ? "selected" : ""}`} key={item.id}><div className="question-top"><span className="question-number">{String(index + 1).padStart(2, "0")}</span><div><small>{priorityLabel[item.priority]}优先级 · {item.priority_reason}</small><h2>{item.main_question}</h2></div></div><div className="intent-box"><Target size={17} /><p><strong>考察意图</strong>{item.intent}</p></div><div className="followup-grid"><div><h3>递进追问</h3>{(item.question_followups ?? []).map((followup,followIndex) => <p key={followup.id}><span>{followIndex + 1}</span>{followup.question}</p>)}</div><div><h3>推荐回答结构</h3><p>{item.answer_structure.join(" → ")}</p><h3>需要补充回忆</h3><p>{item.missing_information || "当前证据足够，重点准备细节与边界。"}</p></div></div><div className="question-risk"><AlertCircle size={14} /><p><strong>回答风险</strong>{item.risk}</p></div><button className="text-button" type="button" onClick={() => setSelectedId(item.id)}>查看关联证据 <ArrowRight size={14} /></button></article>)}</div><SourcePanel jdQuote={sourceRequirements[0]?.jd_quote ?? ""} resumeQuotes={sourceQuotes} /></div>;
}

function SourcePanel({ jdQuote = "", resumeQuote = "", resumeQuotes = [] }: { jdQuote?: string; resumeQuote?: string; resumeQuotes?: string[] }) {
  const quotes = resumeQuotes.length ? resumeQuotes : resumeQuote ? [resumeQuote] : [];
  return <aside className="card source-panel"><div className="source-heading"><div><h2>原文引用</h2><p>所有判断都能定位来源</p></div><FileCheck2 size={20} /></div><section><strong>JD 原文</strong><p>{jdQuote ? <mark>{jdQuote}</mark> : "暂无可定位的 JD 原文"}</p></section><section><strong>简历原文{quotes.length > 1 ? ` · ${quotes.length} 条` : ""}</strong>{quotes.length ? quotes.map((quote, index) => <p key={`${quote}-${index}`}><mark>{quote}</mark></p>) : <p>该要求目前没有可引用的简历证据</p>}</section><a className="text-button" href="/resume">查看母版简历 <ArrowUpRight size={14} /></a></aside>;
}

function UploadModal({ close, upload }: { close: () => void; upload: (file: File) => Promise<{ duplicate?: boolean }> }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
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
    try { await upload(file); close(); }
    catch (uploadError) { setError(uploadError instanceof Error ? uploadError.message : "上传失败，请稍后重试"); }
    finally { setSaving(false); }
  };

  return <div className="modal-backdrop" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && !saving && close()}><section className="modal-card" role="dialog" aria-modal="true" aria-labelledby="upload-title"><div className="modal-heading"><div><span className="modal-icon"><Upload /></span><div><h2 id="upload-title">{file ? "确认简历版本" : "更新母版简历"}</h2><p>{saving ? "正在保存 PDF 并解析简历内容" : "上传后会生成新的私有版本"}</p></div></div><button className="icon-button" type="button" onClick={close} aria-label="关闭" disabled={saving}><X size={18} /></button></div><input ref={inputRef} className="visually-hidden" type="file" accept="application/pdf,.pdf" onChange={(event) => choose(event.target.files?.[0])} />
    <button className={`upload-zone ${dragging ? "dragging" : ""} ${file ? "selected" : ""}`} type="button" onClick={() => !saving && inputRef.current?.click()} onDragEnter={(event) => { event.preventDefault(); setDragging(true); }} onDragOver={(event) => event.preventDefault()} onDragLeave={() => setDragging(false)} onDrop={(event) => { event.preventDefault(); setDragging(false); choose(event.dataTransfer.files?.[0]); }} disabled={saving}>{saving ? <><LoaderCircle className="state-spinner" size={28} /><strong>正在解析并保存…</strong><span>请不要关闭页面，通常需要数秒</span></> : file ? <><span className="selected-pdf"><FileText size={22} /></span><strong>{file.name}</strong><span>{formatFileSize(file.size)} · 点击可重新选择</span></> : <><Upload size={28} /><strong>拖入 PDF，或点击选择文件</strong><span>仅支持文本型 PDF，最大 10 MB</span></>}</button>
    {error && <p className="form-error upload-error"><AlertCircle size={14} />{error}</p>}<div className="modal-note"><ShieldCheck size={17} /><p>PDF 会保存在你的私有空间，并生成解析文本与版本记录；预览链接仅短时间有效。</p></div><div className="modal-actions"><button className="secondary-button" type="button" onClick={close} disabled={saving}>取消</button><button className="primary-button" type="button" onClick={submit} disabled={saving || !file}>{saving ? <><LoaderCircle className="state-spinner inline" size={14} />解析保存中</> : "开始解析并保存"}</button></div></section></div>;
}

function PdfPreviewModal({ preview, close }: { preview: { url: string; name: string }; close: () => void }) {
  return <div className="pdf-preview-backdrop" role="presentation"><section className="pdf-preview-card" role="dialog" aria-modal="true" aria-labelledby="pdf-preview-title"><header><div><span className="pdf-mini-icon"><FileText size={17} /></span><div><h2 id="pdf-preview-title">{preview.name}</h2><p>私有 PDF 预览</p></div></div><div><a className="secondary-button compact" href={preview.url} download={preview.name}>下载原文件</a><button className="icon-button" type="button" onClick={close} aria-label="关闭预览"><X size={19} /></button></div></header><iframe src={preview.url} title={`${preview.name} PDF 预览`} /></section></div>;
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
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const submit = async () => {
    if (!company.trim() || !title.trim() || jdText.trim().length < 80) { setError("请填写公司、岗位名称，并粘贴至少 80 字的完整 JD"); return; }
    setSaving(true); setError("");
    try { await save?.({ company: company.trim(), title: title.trim(), category, department: department.trim(), location: location.trim(), jdText: jdText.trim() }); close(); }
    catch (submitError) { setError(submitError instanceof Error ? submitError.message : "保存失败"); }
    finally { setSaving(false); }
  };
  return <div className="modal-backdrop" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && close()}><section className="modal-card wide" role="dialog" aria-modal="true" aria-labelledby="position-title"><div className="modal-heading"><div><span className="modal-icon gold"><BriefcaseBusiness /></span><div><h2 id="position-title">新建目标岗位</h2><p>公司 → 岗位类别 → 具体岗位</p></div></div><button className="icon-button" type="button" onClick={close} aria-label="关闭"><X size={18} /></button></div><div className="form-grid"><label><span>公司</span><input value={company} onChange={(event) => setCompany(event.target.value)} placeholder="例如：字节跳动" /></label><label><span>岗位名称</span><input value={title} onChange={(event) => setTitle(event.target.value)} placeholder="例如：AI 产品经理实习生" /></label><fieldset><legend>岗位类别</legend><div className="category-picker">{(["技术","产品","运营","市场"] as Category[]).map((item) => <button className={category === item ? "active" : ""} type="button" onClick={() => setCategory(item)} key={item}>{item}</button>)}</div></fieldset><div className="form-two"><label><span>部门（选填）</span><input value={department} onChange={(event) => setDepartment(event.target.value)} placeholder="例如：Flow 产品" /></label><label><span>地点（选填）</span><input value={location} onChange={(event) => setLocation(event.target.value)} placeholder="例如：北京" /></label></div><label><span>岗位 JD</span><textarea value={jdText} onChange={(event) => setJdText(event.target.value)} rows={8} placeholder="粘贴完整岗位职责与要求……" /></label>{error && <p className="form-error"><AlertCircle size={14} />{error}</p>}</div><div className="modal-actions"><button className="secondary-button" type="button" onClick={close}>取消</button><button className="primary-button" type="button" onClick={submit} disabled={saving}>{saving ? <><LoaderCircle className="state-spinner inline" size={14} />保存中</> : "保存岗位"}</button></div></section></div>;
}

function LoginScreen({ supabaseConfig }: { supabaseConfig: SupabasePublicConfig }) {
  const [email, setEmail] = useState("");
  const [sending, setSending] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const sendLink = async () => {
    if (!email.includes("@")) { setError("请输入有效邮箱"); return; }
    const supabase = getBrowserSupabase(supabaseConfig);
    if (!supabase) return;
    setSending(true); setError(""); setMessage("");
    const { error: authError } = await supabase.auth.signInWithOtp({ email: email.trim(), options: { emailRedirectTo: window.location.origin } });
    if (authError) setError(authError.message); else setMessage("登录链接已发送，请前往邮箱完成登录。");
    setSending(false);
  };
  return <main className="login-screen"><section className="login-card card"><span className="login-brand"><span className="brand-symbol"><Route size={19} /></span>OfferMap</span><p className="eyebrow">真实数据工作台</p><h1>登录后继续求职准备</h1><p className="login-copy">你的公司、岗位、投递阶段和后续分析都会安全保存在个人账号中。</p><label className="login-field"><span>邮箱</span><input type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="name@example.com" onKeyDown={(event) => event.key === "Enter" && sendLink()} /></label>{error && <p className="login-feedback error"><AlertCircle size={14} />{error}</p>}{message && <p className="login-feedback success"><CheckCircle2 size={14} />{message}</p>}<button className="primary-button login-submit" type="button" onClick={sendLink} disabled={sending}>{sending ? <><LoaderCircle className="state-spinner inline" size={15} />发送中</> : "发送登录链接"}</button><div className="login-trust"><ShieldCheck size={15} />无需设置密码，登录链接仅在短时间内有效。</div></section></main>;
}

export function OfferMapApp({ initialView = "home", positionId, supabaseConfig = null }: { initialView?: OfferMapView; positionId?: string; supabaseConfig?: SupabasePublicConfig | null }) {
  const [state, setState] = useState<DemoState>("normal");
  const [analysisTab, setAnalysisTab] = useState<AnalysisTab>("evidence");
  const [modal, setModal] = useState<"resume" | "position" | null>(null);
  const [pdfPreview, setPdfPreview] = useState<{ url: string; name: string } | null>(null);
  const configured = isSupabaseConfigured(supabaseConfig);
  const [session, setSession] = useState<Session | null>(null);
  const [authReady, setAuthReady] = useState(!configured);
  const [workspaceCompanies, setWorkspaceCompanies] = useState<WorkspaceCompany[]>(configured ? [] : demoCompanies);
  const [workspaceLoading, setWorkspaceLoading] = useState(false);
  const [workspaceError, setWorkspaceError] = useState("");
  const [resumeVersions, setResumeVersions] = useState<ResumeVersion[]>(configured ? [] : demoResumeVersions);
  const [resumesLoading, setResumesLoading] = useState(false);
  const [resumesError, setResumesError] = useState("");
  const [analysisData, setAnalysisData] = useState<PositionAnalysisData | null>(null);
  const [analysisLoading, setAnalysisLoading] = useState(initialView === "analysis" && configured);
  const [analysisRunningKind, setAnalysisRunningKind] = useState<AnalysisTab | null>(null);
  const [analysisRunningPhase, setAnalysisRunningPhase] = useState<AnalysisRunPhase>(null);
  const [analysisError, setAnalysisError] = useState("");

  const authenticatedFetch = async (path: string, init?: RequestInit) => {
    if (!session?.access_token) throw new Error("登录状态已失效，请重新登录");
    return fetchWorkspaceJson(path, session.access_token, init);
  };

  const loadWorkspace = async (activeSession = session) => {
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
      } else { setWorkspaceCompanies([]); setResumeVersions([]); setAnalysisData(null); }
    };
    supabase.auth.getSession().then(({ data }) => syncSession(data.session));
    const { data: listener } = supabase.auth.onAuthStateChange((_event, nextSession) => syncSession(nextSession));
    return () => listener.subscription.unsubscribe();
  }, [configured, supabaseConfig, initialView, positionId]);

  const createPosition = async (input: NewPositionInput) => {
    if (!configured) return;
    let company = workspaceCompanies.find((item) => item.name === input.company);
    if (!company) {
      const created = await authenticatedFetch("/api/companies", { method: "POST", body: JSON.stringify({ name: input.company }) });
      company = { id: String((created.data as { id: string }).id), name: input.company, mark: input.company.slice(0,2), groups: (["技术","产品","运营","市场"] as Category[]).map((category) => ({ category, positions: [] })) };
    }
    await authenticatedFetch(`/api/companies/${company.id}/positions`, { method: "POST", body: JSON.stringify({ title: input.title, category: CATEGORY_TO_DB[input.category], department: input.department, location: input.location, jd_text: input.jdText }) });
    await loadWorkspace();
  };

  const updateStage = async (positionId: string, input: StageUpdateInput) => {
    if (!configured) return;
    await authenticatedFetch(`/api/positions/${positionId}/application`, { method: "PATCH", body: JSON.stringify({ ...input, stage: STAGE_TO_DB[input.stage], appliedAt: input.stage === "已投递" ? input.occurredAt : undefined }) });
    await loadWorkspace();
  };

  const uploadResume = async (file: File) => {
    if (!session?.access_token) throw new Error("登录状态已失效，请重新登录");
    const form = new FormData();
    form.append("file", file);
    const payload = await fetchWorkspaceJson("/api/resumes/parse", session.access_token, { method: "POST", body: form });
    await Promise.all([loadResumes(session), loadWorkspace(session)]);
    return { duplicate: Boolean((payload as { duplicate?: boolean }).duplicate) };
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

  const reparseResume = async (resumeId: string) => {
    await authenticatedFetch(`/api/resumes/${resumeId}/reparse`, { method: "POST", body: JSON.stringify({}) });
    await Promise.all([loadResumes(session), loadWorkspace(session)]);
  };

  const runPositionAnalysis = async (kind: AnalysisTab) => {
    if (!positionId) return;
    setAnalysisRunningKind(kind); setAnalysisRunningPhase(kind === "evidence" ? null : "deep"); setAnalysisTab(kind); setAnalysisError("");
    try {
      const endpoint = kind === "evidence" ? "analysis" : kind === "resume" ? "resume-suggestions" : "interview-map";
      const hasCurrent = kind === "evidence" ? Boolean(analysisData?.evidence.length) : kind === "resume" ? Boolean(analysisData?.suggestions.length) : Boolean(analysisData?.questions.length);
      const payload = await authenticatedFetch(`/api/positions/${positionId}/${endpoint}`, { method: "POST", body: JSON.stringify(kind === "evidence" ? { force: hasCurrent } : { force: hasCurrent, phase: "core" }) });
      const applyPayload = (response: { data?: unknown }) => {
        const next = response.data as Partial<PositionAnalysisData>;
        setAnalysisData((current) => current ? { ...current, ...next, meta: next.meta ?? current.meta } : next as PositionAnalysisData);
        return next;
      };
      const coreResult = applyPayload(payload);
      const shouldExpand = kind === "interview" || (kind === "resume" && Boolean(coreResult.suggestions?.length));
      if (kind !== "evidence" && shouldExpand) {
        setAnalysisRunningPhase("expand");
        try {
          const expanded = await authenticatedFetch(`/api/positions/${positionId}/${endpoint}`, { method: "POST", body: JSON.stringify({ force: hasCurrent, phase: "expand" }) });
          applyPayload(expanded);
        } catch (expandError) {
          setAnalysisError(`核心结果已生成，补充批次暂未完成：${expandError instanceof Error ? expandError.message : "可以稍后重新生成"}`);
        }
      }
      await loadWorkspace();
    } catch (runError) {
      setAnalysisError(runError instanceof Error ? runError.message : "分析失败，请重试");
      if (session?.access_token) {
        try {
          const payload = await fetchWorkspaceJson(`/api/positions/${positionId}/analysis`, session.access_token);
          setAnalysisData(payload.data as PositionAnalysisData);
        } catch { setAnalysisData(null); }
      }
    } finally { setAnalysisRunningKind(null); setAnalysisRunningPhase(null); }
  };

  const toggleResumeSuggestion = async (id: string, accepted: boolean) => {
    const payload = await authenticatedFetch(`/api/resume-suggestions/${id}`, { method: "PATCH", body: JSON.stringify({ accepted }) });
    const updated = payload.data as ResumeSuggestionRecord;
    setAnalysisData((current) => current ? { ...current, suggestions: current.suggestions.map((item) => item.id === id ? updated : item) } : current);
  };

  const signOut = async () => { await getBrowserSupabase(supabaseConfig)?.auth.signOut(); setWorkspaceCompanies([]); };

  if (configured && !authReady) return <div className="auth-loading"><LoaderCircle className="state-spinner" size={34} /><p>正在恢复登录状态…</p></div>;
  if (configured && !session && supabaseConfig) return <LoginScreen supabaseConfig={supabaseConfig} />;
  const activeCompanies = configured ? workspaceCompanies : demoCompanies;
  return <div className="offermap-app"><AppHeader view={initialView} companies={activeCompanies} userEmail={session?.user.email} signOut={session ? signOut : undefined} /><main className={`page-container view-${initialView}`}><div className={`connection-banner ${configured ? "live" : "demo"}`}><span><i />{configured ? "实时数据已连接" : "演示模式"}</span><p>{configured ? initialView === "analysis" ? "岗位、母版简历与 AI 深度分析结果会保存到你的账号" : "简历 PDF、岗位和求职进度会保存到你的账号" : "配置 Supabase 后即可启用邮箱登录与永久保存"}</p>{workspaceLoading && <LoaderCircle className="state-spinner inline" size={13} />}{workspaceError && <button type="button" onClick={loadWorkspace}>重新加载</button>}</div>{state === "normal" ? <>{initialView === "home" && <HomeView companies={activeCompanies} />}{initialView === "resume" && <ResumeView openUpload={() => setModal("resume")} versions={configured ? resumeVersions : demoResumeVersions} loading={configured && resumesLoading} error={configured ? resumesError : ""} preview={configured ? previewResume : async () => { throw new Error("演示模式暂无 PDF 文件"); }} reparse={configured ? reparseResume : async () => {}} />}{initialView === "positions" && <PositionsView openNewPosition={() => setModal("position")} companies={activeCompanies} onStageUpdate={configured ? updateStage : undefined} />}{initialView === "map" && <MapView companies={activeCompanies} />}{initialView === "analysis" && <AnalysisView tab={analysisTab} setTab={setAnalysisTab} data={configured ? analysisData : null} loading={configured && analysisLoading} runningKind={configured ? analysisRunningKind : null} runningPhase={configured ? analysisRunningPhase : null} error={configured ? analysisError : ""} run={configured ? runPositionAnalysis : async () => {}} toggleSuggestion={configured ? toggleResumeSuggestion : async () => {}} live={configured} />}</> : <AlternateState view={initialView} state={state} onReset={() => setState("normal")} />}</main>{!configured && <StatusPreview view={initialView} state={state} onChange={setState} />}{modal === "resume" && <UploadModal close={() => setModal(null)} upload={configured ? uploadResume : async () => ({})} />}{modal === "position" && <PositionModal close={() => setModal(null)} save={configured ? createPosition : undefined} />}{pdfPreview && <PdfPreviewModal preview={pdfPreview} close={closePdfPreview} />}</div>;
}
