"use client";

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
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";

export type OfferMapView = "home" | "resume" | "positions" | "map" | "analysis";
type DemoState = "normal" | "empty" | "loading" | "error";
type AnalysisTab = "evidence" | "resume" | "interview";
type Category = "技术" | "产品" | "运营" | "市场";
type ApplicationStage = "感兴趣" | "准备中" | "已投递" | "笔试中" | "一面中" | "二面中" | "终面中" | "Offer 沟通" | "已录用" | "未通过" | "已放弃";
type DemoPosition = { id: string; title: string; location: string; stage: ApplicationStage; analysis: string; next?: string; href: string };
type WorkspaceCompany = { id: string; name: string; mark: string; groups: Array<{ category: Category; positions: DemoPosition[] }> };
type NewPositionInput = { company: string; title: string; category: Category; department: string; location: string; jdText: string };
type StageUpdateInput = { stage: ApplicationStage; occurredAt: string; nextEventAt?: string; nextEventType?: string; note?: string };

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
  const response = await fetch(path, { ...init, headers: { "Content-Type": "application/json", Authorization: `Bearer ${accessToken}`, ...(init?.headers ?? {}) } });
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
          <Link className="brand" href="/" aria-label="OfferMap 首页">
            <span className="brand-symbol"><Route size={18} /></span><span>OfferMap</span>
          </Link>
          <nav className="main-nav" aria-label="主导航">
            {NAV_ITEMS.map((item) => <Link key={item.key} href={item.href} className={navView === item.key ? "active" : ""}>{item.label}</Link>)}
          </nav>
          <div className="header-tools">
            <button className="header-search-button" type="button" onClick={() => setSearchOpen(true)} aria-label="全局搜索"><Search size={16} /><span>搜索</span><kbd>⌘ K</kbd></button>
            <div className="header-menu-wrap">
              <button className="header-new-button" type="button" onClick={() => { setCreateOpen(!createOpen); setProfileOpen(false); }} aria-expanded={createOpen}><Plus size={15} />新建</button>
              {createOpen && <div className="header-popover create-menu"><Link href="/positions"><BriefcaseBusiness size={16} /><span><strong>新建岗位</strong><small>保存公司、类别与 JD</small></span></Link><Link href="/resume"><Upload size={16} /><span><strong>上传简历</strong><small>更新母版简历版本</small></span></Link></div>}
            </div>
            <div className="header-menu-wrap">
              <button className="avatar" type="button" onClick={() => { setProfileOpen(!profileOpen); setCreateOpen(false); }} aria-label="个人中心" aria-expanded={profileOpen}>林</button>
              {profileOpen && <div className="header-popover profile-menu"><div className="profile-summary"><span className="avatar">林</span><div><strong>{userEmail ? userEmail.split("@")[0] : "林同学"}</strong><small>{userEmail ?? "演示账号 · 产品方向"}</small></div></div><Link href="/resume"><FileText size={15} />母版简历</Link><Link href="/map"><Map size={15} />我的求职地图</Link>{signOut ? <button type="button" onClick={signOut}><LogOut size={15} />退出登录</button> : <div className="profile-plan"><Sparkles size={13} />演示账号 · 配置 Supabase 后启用登录</div>}</div>}
            </div>
          </div>
        </div>
      </header>
      {searchOpen && <div className="search-overlay" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && setSearchOpen(false)}><section className="global-search" role="dialog" aria-modal="true" aria-label="全局搜索"><div className="global-search-input"><Search size={19} /><input value={searchQuery} onChange={(event) => setSearchQuery(event.target.value)} placeholder="搜索公司、岗位或类别" /><button type="button" onClick={() => setSearchOpen(false)}>ESC</button></div><div className="search-result-label">{searchQuery ? `找到 ${searchResults.length} 个结果` : "最近访问"}</div><div className="search-results">{searchResults.slice(0, 6).map((position) => <Link href={position.href} key={position.id}><span className="search-result-icon"><BriefcaseBusiness size={16} /></span><span><strong>{position.title}</strong><small>{position.company} · {position.category} · {position.location}</small></span><em className={`application-stage ${stageTone(position.stage)}`}>{position.stage}</em></Link>)}</div><div className="search-help"><Command size={13} />输入关键词搜索，按 Enter 打开</div></section></div>}
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
          <Link href={href} className="entry-card card" key={title} aria-label={`进入${title}`}>
            <span className={`entry-icon ${tone}`}><Icon /></span><h2>{title}</h2><p>{body}</p>
            <span className="entry-meta"><CircleDot size={13} />{meta}</span>
            <span className="entry-cta">进入查看 <ArrowRight size={14} /></span>
            <span className="entry-arrow"><ArrowUpRight size={17} /></span>
          </Link>
        ))}
      </div>
      {nextPositions.length > 0 && <section className="next-section"><div className="section-heading"><h2>接下来</h2><Link href="/positions">管理全部进度 <ChevronRight size={15} /></Link></div><div className="next-grid">{nextPositions.map((position, index) => <Link href={position.href} className={`card next-card ${index === 0 ? "urgent" : ""}`} key={position.id}><span className={`date-block ${index === 1 ? "soft" : ""}`}>{index === 0 ? <><CalendarDays size={19} /><small>{position.stage}</small></> : <ClockBadge />}</span><div><span className="next-kicker">{position.next} · {position.stage}</span><h3>{position.company} · {position.title}</h3><p>{position.analysis}</p></div><span className="next-arrow"><ArrowRight size={16} /></span></Link>)}</div></section>}
      <section className="recent-section"><div className="section-heading"><h2>最近准备</h2><Link href="/positions">查看全部 <ChevronRight size={15} /></Link></div><div className="recent-grid">
        {positions.slice(0, 3).map((position) => <Link href={position.href} className="recent-item" key={position.id}><span className="company-mark">{position.company.slice(0,2)}</span><span><strong>{position.title}</strong><small>{position.stage} · {position.analysis}</small></span><i className={`live-dot ${stageTone(position.stage) === "interview" ? "warning" : stageTone(position.stage) === "planning" ? "muted" : ""}`} /></Link>)}
      </div></section>
    </>
  );
}

function ClockBadge() {
  return <><CalendarDays size={19} /><small>待跟进</small></>;
}

function ResumeView({ openUpload }: { openUpload: () => void }) {
  return (
    <>
      <PageHeader eyebrow="独立资料库" title="我的简历" description="这里保存唯一的母版简历。岗位定制建议只生成副本，不会覆盖原文。" action={<button className="primary-button" type="button" onClick={openUpload}><Upload size={16} />更新简历</button>} />
      <div className="resume-layout">
        <section className="card content-card"><div className="card-heading"><h2>当前母版</h2><span className="success-badge"><CheckCircle2 size={13} />解析完成</span></div><div className="file-card"><span className="pdf-file"><FileText /></span><div><strong>林同学-互联网求职简历.pdf</strong><small>v3 · 1.8 MB · 更新于 8 月 16 日 22:40</small></div><button className="secondary-button compact" type="button">预览</button></div><div className="resume-outline">
          {[['教育经历','华东师范大学 · 新闻传播学','1 项'],['实习经历','用户增长、产品运营','2 项'],['项目经历','校园内容社区、AI 求职助手','3 项'],['技能','SQL、Figma、数据分析、英语','8 项']].map((row) => <div className="outline-row" key={row[0]}><span>{row[0]}</span><strong>{row[1]}</strong><small>{row[2]}</small><ChevronRight size={15} /></div>)}
        </div></section>
        <aside className="card side-card"><div className="card-heading"><h2>版本记录</h2><button className="text-button" type="button">管理</button></div><div className="version-list"><div className="version-item current"><span>v3 · 当前版本</span><strong>强化项目个人贡献</strong><small>8 月 16 日 22:40</small></div><div className="version-item"><span>v2</span><strong>补充 AI 产品项目</strong><small>8 月 9 日</small></div><div className="version-item"><span>v1</span><strong>首次上传</strong><small>8 月 2 日</small></div></div><div className="privacy-note"><ShieldCheck size={17} /><p><strong>隐私保护</strong>原始 PDF 解析后删除，仅保存用于求职分析的结构化文本。</p></div></aside>
      </div>
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
          return <section className={`category-column ${!visibleByCategory ? "dimmed" : ""}`} key={group.category}><div className="category-title"><i className={`category-dot ${group.category}`} />{group.category}<span>{group.positions.length}</span></div>{groupPositions.length ? groupPositions.map((position) => <div className="position-record" key={position.id}><Link href={position.href} className="position-row"><strong>{position.title}</strong><small>{position.location}</small><span className="analysis-hint">{position.analysis}</span><ChevronRight size={14} /></Link><button className={`application-stage ${stageTone(position.stage)}`} type="button" onClick={() => setEditing({ companyId: company.id, positionId: position.id })}>{position.stage}<ChevronDown size={11} /></button>{position.next && <span className="position-next"><CalendarDays size={11} />{position.next}</span>}</div>) : group.positions.length ? <p className="filtered-empty">当前筛选下无岗位</p> : <button className="empty-category" type="button" onClick={openNewPosition}><Plus size={13} />添加岗位</button>}</section>;
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
  return <Link href="/positions" className={`map-company ${className}`}><span className="company-mark map-mark">{mark}</span><div><strong>{name}</strong><small>{subtitle}</small></div><em className={`application-stage ${stageTone(stage)}`}>{stage}</em><div className="map-tags">{tags.map((tag) => <span key={tag}>{tag}</span>)}</div><p><i className={`live-dot ${tone}`} />{status}</p></Link>;
}

function AnalysisView({ tab, setTab }: { tab: AnalysisTab; setTab: (tab: AnalysisTab) => void }) {
  const [stage, setStage] = useState<ApplicationStage>("二面中");
  const [stageOpen, setStageOpen] = useState(false);
  return (
    <>
      <div className="analysis-heading"><div><div className="breadcrumb"><Link href="/positions">字节跳动</Link><ChevronRight size={13} /><span>产品</span><ChevronRight size={13} /><span>AI 产品经理实习生</span></div><h1>AI 产品经理实习生</h1><p>北京 · Flow 产品团队 · JD-2026-0821</p></div><button className="primary-button" type="button"><RefreshCw size={15} />重新生成</button></div>
      <section className="card application-progress"><div className="progress-heading"><div><span>求职进度</span><strong>下一安排：8 月 21 日 15:00 二面</strong></div><div className="stage-edit-wrap"><button className={`application-stage ${stageTone(stage)}`} type="button" onClick={() => setStageOpen(!stageOpen)}>{stage}<ChevronDown size={12} /></button>{stageOpen && <div className="stage-mini-menu">{ALL_STAGES.slice(1, 9).map((item) => <button type="button" onClick={() => { setStage(item); setStageOpen(false); }} key={item}><i className={`stage-dot ${stageTone(item)}`} />{item}{stage === item && <Check size={13} />}</button>)}</div>}</div></div><div className="stage-timeline">{["已投递","一面通过","二面中","终面","Offer"].map((item,index) => <div className={index < 2 ? "done" : index === 2 ? "current" : ""} key={item}><span>{index < 2 ? <Check size={13} /> : index + 1}</span><small>{item}</small></div>)}</div><div className="progress-prep-note"><Sparkles size={14} /><span><strong>准备状态：</strong>还有 2 个高优先级问题未完成，建议二面前重点准备方案取舍与个人贡献。</span></div></section>
      <div className="analysis-tabs" role="tablist">{([['evidence','证据地图'],['resume','定制简历'],['interview','面试追问地图']] as Array<[AnalysisTab,string]>).map(([key,label]) => <button type="button" role="tab" aria-selected={tab === key} className={tab === key ? "active" : ""} onClick={() => setTab(key)} key={key}>{label}</button>)}</div>
      {tab === "evidence" && <EvidencePanel />}{tab === "resume" && <ResumeSuggestionsPanel />}{tab === "interview" && <InterviewPanel />}
    </>
  );
}

function EvidencePanel() {
  return <div className="analysis-layout"><div className="analysis-list"><div className="analysis-summary card"><div><span>高优先级要求</span><strong>3 / 4 已覆盖</strong></div><div><span>全部 JD 要求</span><strong>7 / 10 已覆盖</strong></div><p>不使用虚假的百分制匹配度，只展示可解释的证据状态。</p></div>{evidence.map((item) => <article className="card evidence-card" key={item.title}><div className="evidence-top"><div><span>{item.type}</span><h2>{item.title}</h2></div><em className={`evidence-status ${item.tone}`}>{item.status}</em></div><blockquote>{item.quote}</blockquote><p>{item.reason}</p><button className="text-button" type="button">查看补强动作 <ArrowRight size={14} /></button></article>)}</div><SourcePanel /></div>;
}

function ResumeSuggestionsPanel() {
  const [accepted, setAccepted] = useState<string[]>([]);
  return <div className="analysis-layout"><div className="analysis-list"><div className="truth-banner"><ShieldCheck size={18} /><span><strong>事实优先</strong>缺少指标时会向你提问，不会自动补写不存在的数据。</span></div>{suggestions.map((item) => <article className="card suggestion-card" key={item.section}><div className="suggestion-head"><span>{item.action}</span><h2>{item.section}</h2></div><div className="rewrite-grid"><div><small>母版原文</small><p>{item.original}</p></div><ArrowRight size={17} /><div className="revised"><small>建议版本</small><p>{item.revised}</p></div></div><div className="suggestion-reason"><Sparkles size={15} /><p>{item.reason}</p></div><div className="suggestion-actions"><button className="secondary-button compact" type="button"><Copy size={14} />复制</button><button className={`primary-button compact ${accepted.includes(item.section) ? "accepted" : ""}`} type="button" onClick={() => setAccepted((items) => items.includes(item.section) ? items.filter((value) => value !== item.section) : [...items,item.section])}>{accepted.includes(item.section) ? <><Check size={14} />已采纳</> : "采纳建议"}</button></div></article>)}</div><SourcePanel /></div>;
}

function InterviewPanel() {
  return <div className="analysis-layout"><div className="analysis-list"><div className="question-legend"><span><i className="high" />高优先级：核心 JD 与突出经历直接交叉</span><span><i />中优先级：补充验证能力深度</span></div>{questions.map((item,index) => <article className="card question-card" key={item.title}><div className="question-top"><span className="question-number">0{index + 1}</span><div><small>{item.priority}优先级 · 产品判断</small><h2>{item.title}</h2></div></div><div className="intent-box"><Target size={17} /><p><strong>考察意图</strong>{item.intent}</p></div><div className="followup-grid"><div><h3>递进追问</h3>{item.followups.map((question,followIndex) => <p key={question}><span>{followIndex + 1}</span>{question}</p>)}</div><div><h3>推荐回答结构</h3><p>背景与目标 → 判断依据 → 个人动作 → 结果验证 → 复盘边界</p><button className="secondary-button compact" type="button">开始准备回答</button></div></div></article>)}</div><SourcePanel /></div>;
}

function SourcePanel() {
  return <aside className="card source-panel"><div className="source-heading"><div><h2>原文引用</h2><p>所有判断都能定位来源</p></div><FileCheck2 size={20} /></div><section><strong>JD 原文</strong><p>参与 AI 创作工具的产品设计，能够独立完成<mark>用户需求分析与产品方案设计</mark>，结合数据和反馈持续优化体验。</p></section><section><strong>简历原文</strong><p>负责校园内容社区从 0 到 1 的<mark>需求调研、原型设计和两轮迭代</mark>，通过问卷与访谈收集 126 份反馈。</p></section><button className="text-button" type="button">在母版简历中定位 <ArrowUpRight size={14} /></button></aside>;
}

function UploadModal({ close }: { close: () => void }) {
  return <div className="modal-backdrop" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && close()}><section className="modal-card" role="dialog" aria-modal="true" aria-labelledby="upload-title"><div className="modal-heading"><div><span className="modal-icon"><Upload /></span><div><h2 id="upload-title">更新母版简历</h2><p>更新后，相关岗位会标记为需要重新生成</p></div></div><button className="icon-button" type="button" onClick={close} aria-label="关闭"><X size={18} /></button></div><button className="upload-zone" type="button"><Upload size={28} /><strong>拖入 PDF，或点击选择文件</strong><span>仅支持文本型 PDF，最大 10 MB</span></button><div className="modal-note"><ShieldCheck size={17} /><p>原始 PDF 完成解析后删除，仅保存结构化文本。岗位定制不会反向覆盖母版简历。</p></div><div className="modal-actions"><button className="secondary-button" type="button" onClick={close}>取消</button><button className="primary-button" type="button" onClick={close}>开始解析</button></div></section></div>;
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

function LoginScreen() {
  const [email, setEmail] = useState("");
  const [sending, setSending] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const sendLink = async () => {
    if (!email.includes("@")) { setError("请输入有效邮箱"); return; }
    const supabase = getBrowserSupabase();
    if (!supabase) return;
    setSending(true); setError(""); setMessage("");
    const { error: authError } = await supabase.auth.signInWithOtp({ email: email.trim(), options: { emailRedirectTo: window.location.origin } });
    if (authError) setError(authError.message); else setMessage("登录链接已发送，请前往邮箱完成登录。");
    setSending(false);
  };
  return <main className="login-screen"><section className="login-card card"><span className="login-brand"><span className="brand-symbol"><Route size={19} /></span>OfferMap</span><p className="eyebrow">真实数据工作台</p><h1>登录后继续求职准备</h1><p className="login-copy">你的公司、岗位、投递阶段和后续分析都会安全保存在个人账号中。</p><label className="login-field"><span>邮箱</span><input type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="name@example.com" onKeyDown={(event) => event.key === "Enter" && sendLink()} /></label>{error && <p className="login-feedback error"><AlertCircle size={14} />{error}</p>}{message && <p className="login-feedback success"><CheckCircle2 size={14} />{message}</p>}<button className="primary-button login-submit" type="button" onClick={sendLink} disabled={sending}>{sending ? <><LoaderCircle className="state-spinner inline" size={15} />发送中</> : "发送登录链接"}</button><div className="login-trust"><ShieldCheck size={15} />无需设置密码，登录链接仅在短时间内有效。</div></section></main>;
}

export function OfferMapApp({ initialView = "home" }: { initialView?: OfferMapView }) {
  const [state, setState] = useState<DemoState>("normal");
  const [analysisTab, setAnalysisTab] = useState<AnalysisTab>("evidence");
  const [modal, setModal] = useState<"resume" | "position" | null>(null);
  const configured = isSupabaseConfigured();
  const [session, setSession] = useState<Session | null>(null);
  const [authReady, setAuthReady] = useState(!configured);
  const [workspaceCompanies, setWorkspaceCompanies] = useState<WorkspaceCompany[]>(configured ? [] : demoCompanies);
  const [workspaceLoading, setWorkspaceLoading] = useState(false);
  const [workspaceError, setWorkspaceError] = useState("");

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

  useEffect(() => {
    if (!configured) return;
    const supabase = getBrowserSupabase();
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
      } else setWorkspaceCompanies([]);
    };
    supabase.auth.getSession().then(({ data }) => syncSession(data.session));
    const { data: listener } = supabase.auth.onAuthStateChange((_event, nextSession) => syncSession(nextSession));
    return () => listener.subscription.unsubscribe();
  }, [configured]);

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

  const signOut = async () => { await getBrowserSupabase()?.auth.signOut(); setWorkspaceCompanies([]); };

  if (configured && !authReady) return <div className="auth-loading"><LoaderCircle className="state-spinner" size={34} /><p>正在恢复登录状态…</p></div>;
  if (configured && !session) return <LoginScreen />;
  const activeCompanies = configured ? workspaceCompanies : demoCompanies;
  return <div className="offermap-app"><AppHeader view={initialView} companies={activeCompanies} userEmail={session?.user.email} signOut={session ? signOut : undefined} /><main className={`page-container view-${initialView}`}><div className={`connection-banner ${configured ? "live" : "demo"}`}><span><i />{configured ? "实时数据已连接" : "演示模式"}</span><p>{configured ? "公司、岗位和求职进度会保存到你的账号" : "配置 Supabase 后即可启用邮箱登录与永久保存"}</p>{workspaceLoading && <LoaderCircle className="state-spinner inline" size={13} />}{workspaceError && <button type="button" onClick={loadWorkspace}>重新加载</button>}</div>{state === "normal" ? <>{initialView === "home" && <HomeView companies={activeCompanies} />}{initialView === "resume" && <ResumeView openUpload={() => setModal("resume")} />}{initialView === "positions" && <PositionsView openNewPosition={() => setModal("position")} companies={activeCompanies} onStageUpdate={configured ? updateStage : undefined} />}{initialView === "map" && <MapView companies={activeCompanies} />}{initialView === "analysis" && <AnalysisView tab={analysisTab} setTab={setAnalysisTab} />}</> : <AlternateState view={initialView} state={state} onReset={() => setState("normal")} />}</main><StatusPreview view={initialView} state={state} onChange={setState} />{modal === "resume" && <UploadModal close={() => setModal(null)} />}{modal === "position" && <PositionModal close={() => setModal(null)} save={configured ? createPosition : undefined} />}</div>;
}
