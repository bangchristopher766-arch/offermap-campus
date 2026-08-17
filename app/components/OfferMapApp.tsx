"use client";

import {
  AlertCircle,
  ArrowRight,
  ArrowUpRight,
  Bell,
  BriefcaseBusiness,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  CircleDot,
  Copy,
  FileCheck2,
  FileText,
  Filter,
  LoaderCircle,
  Map,
  MoreHorizontal,
  Plus,
  RefreshCw,
  Route,
  Search,
  Settings2,
  ShieldCheck,
  Sparkles,
  Target,
  Upload,
  WandSparkles,
  X,
} from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";

export type OfferMapView = "home" | "resume" | "positions" | "map" | "analysis";
type DemoState = "normal" | "empty" | "loading" | "error";
type AnalysisTab = "evidence" | "resume" | "interview";
type Category = "技术" | "产品" | "运营" | "市场";

const NAV_ITEMS: Array<{ key: OfferMapView; label: string; href: string }> = [
  { key: "home", label: "首页", href: "/" },
  { key: "resume", label: "我的简历", href: "/resume" },
  { key: "positions", label: "目标岗位", href: "/positions" },
  { key: "map", label: "求职地图", href: "/map" },
];

const companies = [
  {
    id: "byte",
    name: "字节跳动",
    mark: "字节",
    meta: "4 个岗位 · 3 个已分析",
    groups: [
      { category: "技术" as Category, positions: ["数据分析实习生"] },
      { category: "产品" as Category, positions: ["AI 产品经理实习生", "策略产品实习生"] },
      { category: "运营" as Category, positions: [] },
      { category: "市场" as Category, positions: ["商业化市场实习生"] },
    ],
  },
  {
    id: "meituan",
    name: "美团",
    mark: "美团",
    meta: "2 个岗位 · 1 个已分析",
    groups: [
      { category: "技术" as Category, positions: [] },
      { category: "产品" as Category, positions: ["到店产品实习生"] },
      { category: "运营" as Category, positions: ["用户增长运营实习生"] },
      { category: "市场" as Category, positions: [] },
    ],
  },
  {
    id: "tencent",
    name: "腾讯",
    mark: "腾讯",
    meta: "1 个岗位 · 待分析",
    groups: [
      { category: "技术" as Category, positions: ["商业分析实习生"] },
      { category: "产品" as Category, positions: [] },
      { category: "运营" as Category, positions: [] },
      { category: "市场" as Category, positions: [] },
    ],
  },
];

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

function AppHeader({ view }: { view: OfferMapView }) {
  const navView = view === "analysis" ? "positions" : view;
  return (
    <header className="app-header">
      <div className="header-inner">
        <Link className="brand" href="/" aria-label="OfferMap 首页">
          <span className="brand-symbol"><Route size={18} /></span>
          <span>OfferMap</span>
        </Link>
        <nav className="main-nav" aria-label="主导航">
          {NAV_ITEMS.map((item) => (
            <Link key={item.key} href={item.href} className={navView === item.key ? "active" : ""}>{item.label}</Link>
          ))}
        </nav>
        <div className="header-tools">
          <button className="icon-button" type="button" aria-label="搜索"><Search size={18} /></button>
          <button className="icon-button" type="button" aria-label="通知"><Bell size={18} /></button>
          <button className="avatar" type="button" aria-label="个人中心">林</button>
        </div>
      </div>
    </header>
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

function HomeView() {
  const entries = [
    { title: "我的简历", body: "维护一份母版简历，查看解析后的经历和技能，按需更新版本。", meta: "母版简历已更新至 v3", icon: FileText, href: "/resume", tone: "blue" },
    { title: "目标岗位", body: "按公司、岗位类别和具体岗位，整理你想申请的每一份 JD。", meta: "3 家公司 · 7 个岗位", icon: BriefcaseBusiness, href: "/positions", tone: "gold" },
    { title: "个人求职地图", body: "从全局查看目标分布、准备进度、优势证据和下一步行动。", meta: "5 个岗位正在准备", icon: Map, href: "/map", tone: "green" },
  ];
  return (
    <>
      <section className="home-intro"><p className="eyebrow">你的应届求职工作台</p><h1>今天，准备哪一部分？</h1><p>简历、岗位和求职地图彼此独立。你可以从任何一处开始，也可以随时回来继续。</p></section>
      <div className="entry-grid">
        {entries.map(({ title, body, meta, icon: Icon, href, tone }) => <Link href={href} className="entry-card card" key={title}><span className={`entry-icon ${tone}`}><Icon /></span><h2>{title}</h2><p>{body}</p><span className="entry-meta"><CircleDot size={13} />{meta}</span><span className="entry-arrow"><ArrowUpRight size={17} /></span></Link>)}
      </div>
      <section className="recent-section"><div className="section-heading"><h2>最近准备</h2><Link href="/positions">查看全部 <ChevronRight size={15} /></Link></div><div className="recent-grid">
        <Link href="/positions/byte-pm" className="recent-item"><span className="company-mark byte">字节</span><span><strong>AI 产品经理实习生</strong><small>证据地图 · 2 小时前</small></span><i className="live-dot" /></Link>
        <Link href="/positions/mt-ops" className="recent-item"><span className="company-mark meituan">美团</span><span><strong>用户增长运营实习生</strong><small>面试追问 · 昨天</small></span><i className="live-dot warning" /></Link>
        <Link href="/positions/tencent-ba" className="recent-item"><span className="company-mark tencent">腾讯</span><span><strong>商业分析实习生</strong><small>尚未生成分析</small></span><i className="live-dot muted" /></Link>
      </div></section>
    </>
  );
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

function PositionsView({ openNewPosition }: { openNewPosition: () => void }) {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("全部类别");
  const filtered = useMemo(() => companies.filter((company) => company.name.includes(query) || company.groups.some((group) => group.positions.some((position) => position.includes(query)))), [query]);
  return (
    <>
      <PageHeader eyebrow="公司 → 类别 → 具体岗位" title="目标岗位" description="岗位不依赖简历，可以先保存 JD，再决定何时生成分析。" action={<button className="primary-button" type="button" onClick={openNewPosition}><Plus size={17} />新建岗位</button>} />
      <div className="position-toolbar"><label className="search-field"><Search size={16} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="搜索公司或岗位" /></label><label className="select-button"><Filter size={15} /><select value={category} onChange={(event) => setCategory(event.target.value)}><option>全部类别</option><option>技术</option><option>产品</option><option>运营</option><option>市场</option></select><ChevronDown size={14} /></label><button className="secondary-button" type="button">全部状态 <ChevronDown size={14} /></button></div>
      <div className="company-list">{filtered.map((company) => <article className="card company-card" key={company.id}><div className="company-heading"><span className={`company-mark ${company.id}`}>{company.mark}</span><div><h2>{company.name}</h2><p>{company.meta}</p></div><button className="icon-button" type="button" aria-label={`${company.name}更多操作`}><MoreHorizontal size={18} /></button></div><div className="category-grid">{company.groups.map((group) => <section className={`category-column ${category !== "全部类别" && category !== group.category ? "dimmed" : ""}`} key={group.category}><div className="category-title"><i className={`category-dot ${group.category}`} />{group.category}<span>{group.positions.length}</span></div>{group.positions.length ? group.positions.map((position) => <Link href={position.includes("AI") ? "/positions/byte-pm" : "/positions/sample"} className="position-row" key={position}><strong>{position}</strong><small>{position.includes("AI") ? "北京 · Flow 产品" : "查看岗位详情"}</small><ChevronRight size={14} /></Link>) : <button className="empty-category" type="button" onClick={openNewPosition}><Plus size={13} />添加岗位</button>}</section>)}</div></article>)}</div>
    </>
  );
}

function MapView() {
  return (
    <>
      <PageHeader eyebrow="全局视角" title="个人求职地图" description="所有岗位都会出现在这里。没有简历时仍可规划目标，上传后再补全证据。" action={<button className="secondary-button" type="button"><Settings2 size={16} />筛选视图</button>} />
      <div className="map-summary"><span><strong>3</strong>目标公司</span><span><strong>7</strong>具体岗位</span><span><strong>5</strong>正在准备</span><span><strong>2</strong>需要补强</span></div>
      <section className="card career-map"><div className="map-grid" /><div className="map-connector c-one" /><div className="map-connector c-two" /><div className="map-connector c-three" /><div className="map-root"><span className="avatar large">林</span><strong>我的求职目标</strong><small>2026 届校招</small></div>
        <MapCompany className="node-byte" mark="字节" name="字节跳动" subtitle="产品与市场方向" tags={["AI 产品经理", "策略产品", "商业化市场"]} status="证据覆盖较完整" tone="good" />
        <MapCompany className="node-meituan" mark="美团" name="美团" subtitle="产品与运营方向" tags={["到店产品", "用户增长"]} status="1 个岗位待补强" tone="warning" />
        <MapCompany className="node-tencent" mark="腾讯" name="腾讯" subtitle="技术与分析方向" tags={["商业分析"]} status="尚未开始分析" tone="muted" />
      </section>
    </>
  );
}

function MapCompany({ className, mark, name, subtitle, tags, status, tone }: { className: string; mark: string; name: string; subtitle: string; tags: string[]; status: string; tone: string }) {
  return <Link href="/positions" className={`map-company ${className}`}><span className="company-mark map-mark">{mark}</span><div><strong>{name}</strong><small>{subtitle}</small></div><div className="map-tags">{tags.map((tag) => <span key={tag}>{tag}</span>)}</div><p><i className={`live-dot ${tone}`} />{status}</p></Link>;
}

function AnalysisView({ tab, setTab }: { tab: AnalysisTab; setTab: (tab: AnalysisTab) => void }) {
  return (
    <>
      <div className="analysis-heading"><div><div className="breadcrumb"><Link href="/positions">字节跳动</Link><ChevronRight size={13} /><span>产品</span><ChevronRight size={13} /><span>AI 产品经理实习生</span></div><h1>AI 产品经理实习生</h1><p>北京 · Flow 产品团队 · JD-2026-0821</p></div><button className="primary-button" type="button"><RefreshCw size={15} />重新生成</button></div>
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

function PositionModal({ close }: { close: () => void }) {
  const [category, setCategory] = useState<Category>("产品");
  return <div className="modal-backdrop" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && close()}><section className="modal-card wide" role="dialog" aria-modal="true" aria-labelledby="position-title"><div className="modal-heading"><div><span className="modal-icon gold"><BriefcaseBusiness /></span><div><h2 id="position-title">新建目标岗位</h2><p>公司 → 岗位类别 → 具体岗位</p></div></div><button className="icon-button" type="button" onClick={close} aria-label="关闭"><X size={18} /></button></div><div className="form-grid"><label><span>公司</span><input defaultValue="字节跳动" /></label><label><span>岗位名称</span><input placeholder="例如：AI 产品经理实习生" /></label><fieldset><legend>岗位类别</legend><div className="category-picker">{(["技术","产品","运营","市场"] as Category[]).map((item) => <button className={category === item ? "active" : ""} type="button" onClick={() => setCategory(item)} key={item}>{item}</button>)}</div></fieldset><div className="form-two"><label><span>部门（选填）</span><input placeholder="例如：Flow 产品" /></label><label><span>地点（选填）</span><input placeholder="例如：北京" /></label></div><label><span>岗位 JD</span><textarea rows={8} placeholder="粘贴完整岗位职责与要求……" /></label></div><div className="modal-actions"><button className="secondary-button" type="button" onClick={close}>取消</button><button className="primary-button" type="button" onClick={close}>保存岗位</button></div></section></div>;
}

export function OfferMapApp({ initialView = "home" }: { initialView?: OfferMapView }) {
  const [state, setState] = useState<DemoState>("normal");
  const [analysisTab, setAnalysisTab] = useState<AnalysisTab>("evidence");
  const [modal, setModal] = useState<"resume" | "position" | null>(null);
  return <div className="offermap-app"><AppHeader view={initialView} /><main className={`page-container view-${initialView}`}>{state === "normal" ? <>{initialView === "home" && <HomeView />}{initialView === "resume" && <ResumeView openUpload={() => setModal("resume")} />}{initialView === "positions" && <PositionsView openNewPosition={() => setModal("position")} />}{initialView === "map" && <MapView />}{initialView === "analysis" && <AnalysisView tab={analysisTab} setTab={setAnalysisTab} />}</> : <AlternateState view={initialView} state={state} onReset={() => setState("normal")} />}</main><StatusPreview view={initialView} state={state} onChange={setState} />{modal === "resume" && <UploadModal close={() => setModal(null)} />}{modal === "position" && <PositionModal close={() => setModal(null)} />}</div>;
}
