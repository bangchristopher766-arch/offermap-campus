"use client";

import {
  AlertTriangle,
  ArrowRight,
  BarChart3,
  BookOpenCheck,
  BriefcaseBusiness,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  CircleDashed,
  ClipboardCheck,
  Copy,
  FileCheck2,
  FileText,
  Filter,
  FolderKanban,
  GraduationCap,
  Highlighter,
  LayoutPanelLeft,
  Lightbulb,
  LoaderCircle,
  Map,
  Menu,
  MessageSquareText,
  MoreHorizontal,
  Plus,
  RefreshCw,
  Search,
  Settings2,
  ShieldCheck,
  Sparkles,
  Target,
  Upload,
  UserRound,
  X,
} from "lucide-react";
import { useMemo, useState } from "react";

type Category = "technology" | "product" | "operations" | "marketing";
type Tab = "evidence" | "resume" | "interview";
type EvidenceStatus = "strong" | "partial" | "missing";

type Position = {
  id: string;
  title: string;
  category: Category;
  department: string;
  location: string;
  updated: string;
  progress: number;
};

type Company = {
  id: string;
  name: string;
  mark: string;
  markTone: string;
  positions: Position[];
};

const CATEGORY_META: Record<Category, { label: string; short: string; tone: string }> = {
  technology: { label: "技术", short: "技", tone: "blue" },
  product: { label: "产品", short: "产", tone: "violet" },
  operations: { label: "运营", short: "运", tone: "green" },
  marketing: { label: "市场", short: "市", tone: "orange" },
};

const companies: Company[] = [
  {
    id: "byte",
    name: "字节跳动",
    mark: "字",
    markTone: "coral",
    positions: [
      { id: "byte-pm", title: "AI 产品经理实习生", category: "product", department: "Flow 产品", location: "北京", updated: "刚刚分析", progress: 78 },
      { id: "byte-be", title: "后端开发实习生", category: "technology", department: "基础架构", location: "北京", updated: "昨天更新", progress: 62 },
      { id: "byte-da", title: "数据分析实习生", category: "technology", department: "商业产品", location: "上海", updated: "3 天前", progress: 46 },
      { id: "byte-mkt", title: "商业化市场实习生", category: "marketing", department: "品牌市场", location: "上海", updated: "待分析", progress: 18 },
    ],
  },
  {
    id: "meituan",
    name: "美团",
    mark: "美",
    markTone: "yellow",
    positions: [
      { id: "mt-pm", title: "到店产品实习生", category: "product", department: "到店事业群", location: "北京", updated: "2 天前", progress: 71 },
      { id: "mt-ops", title: "用户增长运营实习生", category: "operations", department: "用户运营", location: "上海", updated: "待补证据", progress: 39 },
    ],
  },
  {
    id: "xiaohongshu",
    name: "小红书",
    mark: "RED",
    markTone: "red",
    positions: [
      { id: "red-ops", title: "内容策略运营实习生", category: "operations", department: "社区生态", location: "上海", updated: "5 天前", progress: 53 },
      { id: "red-mkt", title: "品牌市场实习生", category: "marketing", department: "市场部", location: "上海", updated: "待分析", progress: 12 },
    ],
  },
];

const evidenceRows: Array<{
  id: string;
  type: "必备要求" | "加分要求" | "岗位职责";
  requirement: string;
  status: EvidenceStatus;
  evidence: string;
  rationale: string;
  action: string;
}> = [
  {
    id: "e1",
    type: "必备要求",
    requirement: "能独立完成用户需求分析，并将复杂需求转化为清晰的产品方案",
    status: "strong",
    evidence: "校园二手交易平台：访谈 18 名学生，提炼 4 类交易阻碍并完成核心流程重构。",
    rationale: "具备完整的用户调研、问题归纳和产品落地链路，且有明确的样本与产出。",
    action: "面试时补充说明如何从 18 份访谈中判断问题优先级。",
  },
  {
    id: "e2",
    type: "必备要求",
    requirement: "具备数据分析意识，能围绕产品目标建立指标并持续迭代",
    status: "partial",
    evidence: "通过漏斗分析调整发布流程，使有效商品发布率提升 21%。",
    rationale: "简历体现了漏斗分析和结果，但没有交代指标口径、实验周期及其他变量。",
    action: "补充发布率的计算方式、数据量与对照周期，避免被追问时回答含糊。",
  },
  {
    id: "e3",
    type: "岗位职责",
    requirement: "关注 AI 产品趋势，参与大模型能力在业务场景中的产品化探索",
    status: "strong",
    evidence: "独立设计并上线课程资料问答助手，完成知识库切分、召回策略和答案引用设计。",
    rationale: "与 AI 能力产品化直接相关，并体现了从能力边界到用户体验的思考。",
    action: "准备一次召回失败案例，解释你如何定位问题并选择调整策略。",
  },
  {
    id: "e4",
    type: "必备要求",
    requirement: "善于跨团队协作，能够推动设计、研发与运营共同完成项目",
    status: "partial",
    evidence: "协同 2 名前端同学完成小程序 MVP，上线后覆盖 300+ 校内用户。",
    rationale: "能证明协作发生过，但没有体现你的推动方式、分歧处理和决策责任。",
    action: "补充一次协作分歧及你推动达成一致的具体动作。",
  },
  {
    id: "e5",
    type: "加分要求",
    requirement: "有成熟 AI 产品或头部互联网产品实习经历",
    status: "missing",
    evidence: "母版简历中未找到直接证据。",
    rationale: "课程项目可以证明能力，但不能替代真实实习经历，不建议包装成商业项目。",
    action: "把课程项目的真实用户、迭代次数和限制写清楚，用项目深度弥补经历缺口。",
  },
];

const resumeSuggestions = [
  {
    id: "s1",
    action: "改写",
    tone: "violet",
    section: "项目经历 · 校园二手交易平台",
    original: "负责产品调研和功能设计，跟进开发上线。",
    suggested: "访谈 18 名校园用户并归纳 4 类交易阻碍，主导重构商品发布与沟通链路；协同 2 名前端完成 MVP，上线后覆盖 300+ 用户。",
    reason: "补齐了用户问题、个人动作、协作对象和结果，直接回应 JD 对需求分析与项目推动的要求。",
    risk: "准备解释 300+ 用户的统计口径，以及你在“主导”中实际拥有的决策权。",
  },
  {
    id: "s2",
    action: "补充",
    tone: "green",
    section: "项目经历 · 课程资料问答助手",
    original: "基于大模型搭建课程问答机器人，提升资料查找效率。",
    suggested: "围绕课程资料分散问题设计带来源引用的 AI 问答助手，迭代文档切分与召回策略，并通过 42 条测试问题验证答案可追溯性。",
    reason: "从“调用模型”升级为“定义问题—设计方案—验证质量”的 AI 产品闭环。",
    risk: "若 42 条测试问题并非真实数据，请先填写实际数量，系统不会替你编造。",
  },
  {
    id: "s3",
    action: "弱化",
    tone: "orange",
    section: "个人总结",
    original: "熟悉各种 AI 工具，对人工智能行业有深刻理解。",
    suggested: "持续关注 AI 产品体验，具备从用户问题、能力边界到效果验证的基础实践。",
    reason: "减少无法举证的主观表述，把注意力引向后文可验证的项目经历。",
    risk: "“深刻理解”很容易引发宏观行业追问，当前经历不足以支撑这个强结论。",
  },
];

const interviewQuestions = [
  {
    id: "q1",
    priority: "高",
    number: "01",
    title: "你如何从 18 位用户的访谈中，判断应该优先重构发布流程？",
    source: "需求分析 × 校园二手交易平台",
    intent: "验证你是否真正掌握用户研究、问题归因和优先级判断，而不是只参与了访谈执行。",
    structure: ["先交代目标与样本选择", "用行为与频次归纳问题", "说明优先级判断标准", "用上线数据验证判断"],
    followups: [
      "18 位用户是怎么筛选的？样本是否有偏差？",
      "四类阻碍分别是什么，你用什么方法归类？",
      "为什么先改发布流程，而不是交易沟通？",
      "如果开发资源只有一半，你会保留哪部分？",
    ],
    gaps: "缺少访谈提纲、四类问题的具体占比和优先级框架。",
    risk: "避免只说“用户反馈很多”，要给出你做判断时使用的证据。",
  },
  {
    id: "q2",
    priority: "高",
    number: "02",
    title: "发布率提升 21% 是怎么计算的？如何证明来自你的方案？",
    source: "数据分析 × 发布流程重构",
    intent: "判断你的数据意识是否停留在结果包装，是否理解指标口径、归因和实验限制。",
    structure: ["定义指标口径", "说明改版前后样本", "排除同期干扰", "承认结论边界"],
    followups: [
      "分母是进入发布页，还是点击发布按钮的用户？",
      "观察了多长时间，有多少样本？",
      "同期是否有运营活动影响数据？",
      "除了发布率，你关注了哪些护栏指标？",
    ],
    gaps: "简历未说明数据周期、样本量和护栏指标。",
    risk: "不能把相关性说成严格因果；如果没有 A/B 实验，需要主动说明。",
  },
  {
    id: "q3",
    priority: "中",
    number: "03",
    title: "问答助手出现召回错误时，你如何判断是产品问题还是模型问题？",
    source: "AI 产品化 × 课程资料问答助手",
    intent: "考察你对 AI 能力边界、质量评估和异常处理的产品判断。",
    structure: ["还原失败样例", "拆解检索与生成链路", "定义判断指标", "说明取舍与复测"],
    followups: [
      "你见过最典型的一次错误是什么？",
      "为什么选择调整切分，而不是直接更换模型？",
      "42 条测试问题如何覆盖真实场景？",
    ],
    gaps: "需要准备一条完整的失败样例，以及修改前后的测试结果。",
    risk: "不要堆砌 RAG 术语；重点讲清楚你如何定位用户可感知的问题。",
  },
];

function StatusPill({ status }: { status: EvidenceStatus }) {
  const config = {
    strong: { label: "证据充分", icon: CheckCircle2 },
    partial: { label: "部分支持", icon: CircleDashed },
    missing: { label: "暂无证据", icon: AlertTriangle },
  }[status];
  const Icon = config.icon;
  return (
    <span className={`status-pill status-${status}`}>
      <Icon size={14} aria-hidden="true" /> {config.label}
    </span>
  );
}

function MiniProgress({ value }: { value: number }) {
  return (
    <span className="mini-progress" aria-label={`准备进度 ${value}%`}>
      <span style={{ width: `${value}%` }} />
    </span>
  );
}

export function OfferMapApp() {
  const [activeTab, setActiveTab] = useState<Tab>("evidence");
  const [activePositionId, setActivePositionId] = useState("byte-pm");
  const [sourceTab, setSourceTab] = useState<"jd" | "resume">("jd");
  const [expandedCompanies, setExpandedCompanies] = useState<string[]>(["byte", "meituan"]);
  const [expandedCategories, setExpandedCategories] = useState<string[]>(["byte-product", "byte-technology", "meituan-product"]);
  const [openEvidence, setOpenEvidence] = useState<string[]>(["e1", "e2"]);
  const [openQuestions, setOpenQuestions] = useState<string[]>(["q1"]);
  const [acceptedSuggestions, setAcceptedSuggestions] = useState<string[]>([]);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [sourceCollapsed, setSourceCollapsed] = useState(false);
  const [search, setSearch] = useState("");
  const [showNewPosition, setShowNewPosition] = useState(false);
  const [showResume, setShowResume] = useState(false);
  const [isRegenerating, setIsRegenerating] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  const activeCompany = companies.find((company) => company.positions.some((position) => position.id === activePositionId)) ?? companies[0];
  const activePosition = activeCompany.positions.find((position) => position.id === activePositionId) ?? activeCompany.positions[0];
  const activeCategory = CATEGORY_META[activePosition.category];

  const filteredCompanies = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return companies;
    return companies
      .map((company) => ({
        ...company,
        positions: company.positions.filter((position) => `${company.name}${position.title}${CATEGORY_META[position.category].label}`.toLowerCase().includes(query)),
      }))
      .filter((company) => company.name.toLowerCase().includes(query) || company.positions.length > 0);
  }, [search]);

  const notify = (message: string) => {
    setToast(message);
    window.setTimeout(() => setToast(null), 2400);
  };

  const regenerate = () => {
    setIsRegenerating(true);
    window.setTimeout(() => {
      setIsRegenerating(false);
      notify("分析已更新：发现 2 处新的可追问证据");
    }, 1400);
  };

  const toggleCompany = (id: string) => setExpandedCompanies((current) => current.includes(id) ? current.filter((item) => item !== id) : [...current, id]);
  const toggleCategory = (id: string) => setExpandedCategories((current) => current.includes(id) ? current.filter((item) => item !== id) : [...current, id]);

  return (
    <main className={`app-shell ${sidebarCollapsed ? "sidebar-is-collapsed" : ""} ${sourceCollapsed ? "source-is-collapsed" : ""}`}>
      <aside className="sidebar" aria-label="求职工作区导航">
        <div className="brand-row">
          <div className="brand-mark"><Map size={20} strokeWidth={2.4} /></div>
          {!sidebarCollapsed && <div><strong>OfferMap</strong><span>应届求职工作台</span></div>}
          <button className="icon-button collapse-button" onClick={() => setSidebarCollapsed((value) => !value)} aria-label={sidebarCollapsed ? "展开导航" : "收起导航"}>
            <LayoutPanelLeft size={18} />
          </button>
        </div>

        {!sidebarCollapsed && (
          <>
            <button className="resume-card" onClick={() => setShowResume(true)}>
              <span className="resume-icon"><FileCheck2 size={18} /></span>
              <span className="resume-copy"><strong>我的母版简历</strong><small>2026 校招版 · 刚刚更新</small></span>
              <span className="resume-score">86</span>
            </button>

            <div className="sidebar-heading">
              <span>目标岗位</span>
              <button className="icon-button" onClick={() => setShowNewPosition(true)} aria-label="添加目标岗位"><Plus size={17} /></button>
            </div>
            <label className="sidebar-search">
              <Search size={15} aria-hidden="true" />
              <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="搜索公司或岗位" aria-label="搜索公司或岗位" />
            </label>

            <nav className="company-tree">
              {filteredCompanies.map((company) => {
                const isCompanyOpen = expandedCompanies.includes(company.id) || Boolean(search);
                const grouped = (Object.keys(CATEGORY_META) as Category[]).map((category) => ({
                  category,
                  positions: company.positions.filter((position) => position.category === category),
                })).filter((group) => group.positions.length > 0);
                return (
                  <div className="company-node" key={company.id}>
                    <button className="company-button" onClick={() => toggleCompany(company.id)}>
                      {isCompanyOpen ? <ChevronDown size={15} /> : <ChevronRight size={15} />}
                      <span className={`company-mark ${company.markTone}`}>{company.mark}</span>
                      <strong>{company.name}</strong>
                      <span className="tree-count">{company.positions.length}</span>
                    </button>
                    {isCompanyOpen && (
                      <div className="category-list">
                        {grouped.map(({ category, positions }) => {
                          const key = `${company.id}-${category}`;
                          const isCategoryOpen = expandedCategories.includes(key) || Boolean(search);
                          return (
                            <div key={key}>
                              <button className="category-button" onClick={() => toggleCategory(key)}>
                                {isCategoryOpen ? <ChevronDown size={13} /> : <ChevronRight size={13} />}
                                <span className={`category-dot ${CATEGORY_META[category].tone}`} />
                                <span>{CATEGORY_META[category].label}</span>
                                <small>{positions.length}</small>
                              </button>
                              {isCategoryOpen && (
                                <div className="position-list">
                                  {positions.map((position) => (
                                    <button
                                      key={position.id}
                                      className={`position-button ${position.id === activePositionId ? "active" : ""}`}
                                      onClick={() => setActivePositionId(position.id)}
                                    >
                                      <span>{position.title}</span>
                                      <MiniProgress value={position.progress} />
                                    </button>
                                  ))}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
            </nav>
          </>
        )}

        <div className="sidebar-footer">
          <button className="avatar-button"><span>林</span>{!sidebarCollapsed && <><strong>林同学</strong><ChevronRight size={14} /></>}</button>
          {!sidebarCollapsed && <button className="icon-button" aria-label="设置"><Settings2 size={17} /></button>}
        </div>
      </aside>

      <section className="workspace">
        <header className="workspace-header">
          <div className="mobile-brand"><button className="icon-button" onClick={() => setSidebarCollapsed(false)}><Menu size={19} /></button><strong>OfferMap</strong></div>
          <div className="breadcrumb">
            <span>{activeCompany.name}</span><ChevronRight size={14} /><span>{activeCategory.label}</span><ChevronRight size={14} /><strong>{activePosition.title}</strong>
          </div>
          <div className="header-actions">
            <span className="analysis-status"><span /> 分析已同步</span>
            <button className="secondary-button"><MoreHorizontal size={17} /> 更多</button>
            <button className="primary-button" onClick={regenerate} disabled={isRegenerating}>
              {isRegenerating ? <LoaderCircle className="spin" size={16} /> : <RefreshCw size={16} />}
              {isRegenerating ? "分析中" : "重新分析"}
            </button>
          </div>
        </header>

        <div className="position-summary">
          <div className="position-title-block">
            <span className={`category-badge ${activeCategory.tone}`}>{activeCategory.label}</span>
            <div><h1>{activePosition.title}</h1><p>{activePosition.department} · {activePosition.location} · {activePosition.updated}</p></div>
          </div>
          <div className="summary-metrics">
            <div><strong>6</strong><span>充分证据</span></div>
            <div><strong>2</strong><span>部分支持</span></div>
            <div><strong>1</strong><span>关键缺口</span></div>
            <div className="readiness"><span>准备度</span><strong>{activePosition.progress}%</strong><MiniProgress value={activePosition.progress} /></div>
          </div>
        </div>

        <div className="tab-row" role="tablist" aria-label="岗位分析模块">
          <button className={activeTab === "evidence" ? "active" : ""} onClick={() => setActiveTab("evidence")} role="tab"><ClipboardCheck size={17} />证据地图<span>9</span></button>
          <button className={activeTab === "resume" ? "active" : ""} onClick={() => setActiveTab("resume")} role="tab"><FileText size={17} />定制简历<span>3</span></button>
          <button className={activeTab === "interview" ? "active" : ""} onClick={() => setActiveTab("interview")} role="tab"><MessageSquareText size={17} />面试追问地图<span>8</span></button>
        </div>

        <div className="content-grid">
          <section className="analysis-panel">
            {activeTab === "evidence" && (
              <div className="panel-view evidence-view">
                <div className="view-intro">
                  <div><span className="eyebrow">EVIDENCE MAP</span><h2>岗位要求，是否真的有证据？</h2><p>我们只引用简历里真实存在的内容，不用模糊的“匹配度”掩盖缺口。</p></div>
                  <button className="filter-button"><Filter size={15} />全部要求<ChevronDown size={14} /></button>
                </div>
                <div className="focus-strip">
                  <span><Target size={16} />本岗位核心关注</span>
                  <button>AI 产品化</button><button>用户洞察</button><button>数据验证</button><button>跨团队推动</button>
                </div>
                <div className="evidence-list">
                  {evidenceRows.map((row) => {
                    const isOpen = openEvidence.includes(row.id);
                    return (
                      <article className={`evidence-card evidence-${row.status}`} key={row.id}>
                        <button className="evidence-card-head" onClick={() => setOpenEvidence((current) => current.includes(row.id) ? current.filter((id) => id !== row.id) : [...current, row.id])} aria-expanded={isOpen}>
                          <span className="requirement-type">{row.type}</span>
                          <strong>{row.requirement}</strong>
                          <StatusPill status={row.status} />
                          {isOpen ? <ChevronDown size={17} /> : <ChevronRight size={17} />}
                        </button>
                        {isOpen && (
                          <div className="evidence-card-body">
                            <div className="evidence-quote"><Highlighter size={16} /><div><span>简历证据</span><p>{row.evidence}</p></div></div>
                            <div className="evidence-explain"><div><span>为什么这样判断</span><p>{row.rationale}</p></div><div><span>下一步补强</span><p>{row.action}</p></div></div>
                          </div>
                        )}
                      </article>
                    );
                  })}
                </div>
              </div>
            )}

            {activeTab === "resume" && (
              <div className="panel-view resume-view">
                <div className="view-intro">
                  <div><span className="eyebrow">TAILORED RESUME</span><h2>让每一条经历，都回应这个岗位</h2><p>建议只优化表达，不替你编造指标、职责或项目结果。</p></div>
                  <div className="accepted-count"><Check size={15} />已采纳 {acceptedSuggestions.length}/{resumeSuggestions.length}</div>
                </div>
                <div className="truth-banner"><ShieldCheck size={18} /><div><strong>真实性护栏已开启</strong><span>所有改写都关联原始简历证据；缺失的数据会标记为待补充。</span></div></div>
                <div className="suggestion-list">
                  {resumeSuggestions.map((suggestion) => {
                    const accepted = acceptedSuggestions.includes(suggestion.id);
                    return (
                      <article className="suggestion-card" key={suggestion.id}>
                        <div className="suggestion-heading"><span className={`action-tag ${suggestion.tone}`}>{suggestion.action}</span><strong>{suggestion.section}</strong><button className="icon-button"><MoreHorizontal size={17} /></button></div>
                        <div className="rewrite-comparison">
                          <div className="original-copy"><span>原文</span><p>{suggestion.original}</p></div>
                          <ArrowRight size={18} />
                          <div className="suggested-copy"><span><Sparkles size={14} /> 针对该岗位的建议</span><p>{suggestion.suggested}</p></div>
                        </div>
                        <div className="suggestion-notes"><p><Lightbulb size={15} /><span><strong>修改理由</strong>{suggestion.reason}</span></p><p className="risk-note"><AlertTriangle size={15} /><span><strong>面试提醒</strong>{suggestion.risk}</span></p></div>
                        <div className="suggestion-actions">
                          <button onClick={() => notify("建议文本已复制到剪贴板")}><Copy size={15} />复制建议</button>
                          <button className={accepted ? "accepted" : "accept-button"} onClick={() => setAcceptedSuggestions((current) => current.includes(suggestion.id) ? current.filter((id) => id !== suggestion.id) : [...current, suggestion.id])}>{accepted ? <CheckCircle2 size={15} /> : <Check size={15} />}{accepted ? "已采纳" : "采纳建议"}</button>
                        </div>
                      </article>
                    );
                  })}
                </div>
              </div>
            )}

            {activeTab === "interview" && (
              <div className="panel-view interview-view">
                <div className="view-intro">
                  <div><span className="eyebrow">INTERVIEW MAP</span><h2>面试官会从哪里开始追问？</h2><p>沿着 JD 与简历的连接点，提前看见主问题、追问链和回答缺口。</p></div>
                  <button className="filter-button"><BarChart3 size={15} />按优先级<ChevronDown size={14} /></button>
                </div>
                <div className="map-legend">
                  <span><i className="legend-jd" />JD 要求</span><ArrowRight size={13} /><span><i className="legend-cv" />简历证据</span><ArrowRight size={13} /><span><i className="legend-q" />高概率追问</span><ArrowRight size={13} /><span><i className="legend-plan" />回答准备</span>
                </div>
                <div className="question-list">
                  {interviewQuestions.map((question) => {
                    const isOpen = openQuestions.includes(question.id);
                    return (
                      <article className={`question-card priority-${question.priority === "高" ? "high" : "medium"}`} key={question.id}>
                        <button className="question-head" onClick={() => setOpenQuestions((current) => current.includes(question.id) ? current.filter((id) => id !== question.id) : [...current, question.id])} aria-expanded={isOpen}>
                          <span className="question-number">{question.number}</span>
                          <span className="question-title"><small>{question.source}</small><strong>{question.title}</strong></span>
                          <span className={`priority-badge ${question.priority === "高" ? "high" : "medium"}`}>{question.priority}优先级</span>
                          {isOpen ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
                        </button>
                        {isOpen && (
                          <div className="question-body">
                            <div className="intent-box"><Target size={17} /><div><span>面试官在验证什么</span><p>{question.intent}</p></div></div>
                            <div className="answer-grid">
                              <div className="answer-structure"><h3><BookOpenCheck size={16} />回答结构</h3><ol>{question.structure.map((step, index) => <li key={step}><span>{index + 1}</span>{step}</li>)}</ol></div>
                              <div className="followup-chain"><h3><MessageSquareText size={16} />可能的连环追问</h3><div>{question.followups.map((followup, index) => <p key={followup}><span>{index + 1}</span>{followup}</p>)}</div></div>
                            </div>
                            <div className="prep-notes"><p><CircleDashed size={16} /><span><strong>还需回忆</strong>{question.gaps}</span></p><p><AlertTriangle size={16} /><span><strong>回答风险</strong>{question.risk}</span></p></div>
                          </div>
                        )}
                      </article>
                    );
                  })}
                </div>
              </div>
            )}
          </section>

          <aside className="source-panel" aria-label="原始材料">
            {sourceCollapsed ? (
              <button className="source-expand" onClick={() => setSourceCollapsed(false)}><FileText size={18} /><span>查看原文</span></button>
            ) : (
              <>
                <div className="source-header"><div><strong>原始材料</strong><span>点击分析中的引用可定位</span></div><button className="icon-button" onClick={() => setSourceCollapsed(true)} aria-label="收起原始材料"><X size={17} /></button></div>
                <div className="source-tabs"><button className={sourceTab === "jd" ? "active" : ""} onClick={() => setSourceTab("jd")}>岗位 JD</button><button className={sourceTab === "resume" ? "active" : ""} onClick={() => setSourceTab("resume")}>母版简历</button></div>
                {sourceTab === "jd" ? (
                  <div className="source-document jd-document">
                    <div className="document-title"><span className="document-icon"><BriefcaseBusiness size={20} /></span><div><strong>AI 产品经理实习生</strong><small>字节跳动 · Flow 产品</small></div></div>
                    <h4>职位描述</h4>
                    <p>1. 参与 AI 产品的需求分析、产品设计与持续迭代，关注大模型能力在业务场景中的产品化探索；</p>
                    <p className="highlighted jd-highlight">2. 深入理解用户需求，将复杂问题转化为清晰、可执行的产品方案；</p>
                    <p>3. 协同研发、设计与运营团队推进项目落地，并根据用户反馈持续优化。</p>
                    <h4>职位要求</h4>
                    <p className="highlighted jd-highlight">1. 具备较强的用户洞察与逻辑分析能力，能独立完成需求分析；</p>
                    <p className="highlighted jd-highlight secondary">2. 具备数据分析意识，能围绕产品目标建立指标并持续迭代；</p>
                    <p>3. 对 AI 产品有强烈兴趣，有相关项目经验优先；</p>
                    <p>4. 良好的沟通与跨团队推动能力。</p>
                    <div className="source-tip"><Highlighter size={15} />当前高亮 3 条关联要求</div>
                  </div>
                ) : (
                  <div className="source-document resume-document">
                    <div className="document-title"><span className="document-icon"><UserRound size={20} /></span><div><strong>林同学 · 产品方向</strong><small>2026 届 · 母版简历 v3</small></div></div>
                    <h4>项目经历</h4>
                    <h5>校园二手交易平台 <span>产品负责人</span></h5>
                    <p className="highlighted cv-highlight">访谈 18 名学生，提炼 4 类交易阻碍并完成核心流程重构。</p>
                    <p className="highlighted cv-highlight secondary">通过漏斗分析调整发布流程，使有效商品发布率提升 21%。</p>
                    <p>协同 2 名前端同学完成小程序 MVP，上线后覆盖 300+ 校内用户。</p>
                    <h5>课程资料问答助手 <span>独立项目</span></h5>
                    <p className="highlighted cv-highlight">完成知识库切分、召回策略和答案引用设计，通过 42 条问题验证可追溯性。</p>
                    <h4>技能</h4><p>Figma · SQL · Axure · Python 基础 · 数据分析</p>
                    <div className="source-tip"><Highlighter size={15} />当前高亮 3 条简历证据</div>
                  </div>
                )}
              </>
            )}
          </aside>
        </div>
      </section>

      {showNewPosition && (
        <div className="modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setShowNewPosition(false); }}>
          <div className="modal-card new-position-modal" role="dialog" aria-modal="true" aria-labelledby="new-position-title">
            <div className="modal-head"><div><span className="modal-icon"><FolderKanban size={20} /></span><div><h2 id="new-position-title">添加目标岗位</h2><p>按公司、类别和具体岗位建立新的准备空间。</p></div></div><button className="icon-button" onClick={() => setShowNewPosition(false)}><X size={18} /></button></div>
            <div className="form-grid">
              <label><span>目标公司</span><select defaultValue="byte"><option value="byte">字节跳动</option><option value="meituan">美团</option><option value="new">＋ 创建新公司</option></select></label>
              <label><span>岗位类别</span><select defaultValue="product"><option value="technology">技术</option><option value="product">产品</option><option value="operations">运营</option><option value="marketing">市场</option></select></label>
              <label className="full"><span>具体岗位名称</span><input placeholder="例如：AI 产品经理实习生" /></label>
              <label><span>部门（选填）</span><input placeholder="例如：Flow 产品" /></label>
              <label><span>地点（选填）</span><input placeholder="例如：北京" /></label>
              <label className="full"><span>岗位 JD</span><textarea rows={7} placeholder="粘贴完整岗位描述与职位要求…" /></label>
            </div>
            <div className="modal-actions"><button className="secondary-button" onClick={() => setShowNewPosition(false)}>取消</button><button className="primary-button" onClick={() => { setShowNewPosition(false); notify("岗位已创建，正在等待分析"); }}><Sparkles size={16} />创建并分析</button></div>
          </div>
        </div>
      )}

      {showResume && (
        <div className="modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setShowResume(false); }}>
          <div className="modal-card resume-modal" role="dialog" aria-modal="true" aria-labelledby="resume-modal-title">
            <div className="modal-head"><div><span className="modal-icon"><GraduationCap size={20} /></span><div><h2 id="resume-modal-title">我的母版简历</h2><p>所有岗位分析都基于这一份真实经历底稿。</p></div></div><button className="icon-button" onClick={() => setShowResume(false)}><X size={18} /></button></div>
            <div className="upload-zone"><Upload size={27} /><strong>拖入新的 PDF 简历</strong><span>仅支持文本型 PDF，最大 5 MB；原文件解析后即删除</span><button>选择文件</button></div>
            <div className="current-resume"><span className="pdf-icon">PDF</span><div><strong>林同学_产品方向_2026校招.pdf</strong><small>2 页 · 284 KB · 解析于今天 14:32</small></div><span className="version-tag">当前 v3</span></div>
            <div className="privacy-note"><ShieldCheck size={17} /><p><strong>你的经历不会被公开。</strong>分析只保存解析后的文本，删除母版简历会同步删除所有关联结果。</p></div>
          </div>
        </div>
      )}

      {toast && <div className="toast"><CheckCircle2 size={17} />{toast}</div>}
    </main>
  );
}
