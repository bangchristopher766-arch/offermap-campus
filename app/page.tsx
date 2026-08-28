import {
  ArrowRight,
  BriefcaseBusiness,
  Check,
  FileText,
  Map,
  MessageSquareText,
  Route,
  ShieldCheck,
  Sparkles,
  Target,
} from "lucide-react";
import Link from "next/link";

const GUIDE_STEPS = [
  {
    number: "01",
    icon: FileText,
    title: "建立你的简历库",
    description: "上传 PDF，保留不同求职方向的简历版本。岗位分析会引用原文，不会覆盖你的母版。",
    tone: "blue",
  },
  {
    number: "02",
    icon: BriefcaseBusiness,
    title: "保存目标岗位",
    description: "按公司、岗位类别和具体岗位整理 JD，同时记录从感兴趣到 Offer 的每一步进展。",
    tone: "gold",
  },
  {
    number: "03",
    icon: Sparkles,
    title: "获得针对性准备",
    description: "把 JD 与你的真实经历串起来，生成证据地图、简历建议、面试追问和回答清单。",
    tone: "green",
  },
];

const ANALYSIS_ITEMS = [
  { icon: Target, title: "证据地图", body: "看清每条岗位要求，简历中有什么证据、哪里还需要补强。" },
  { icon: FileText, title: "定制简历", body: "只改真正值得优化的经历，让表达贴近岗位，同时避免虚构。" },
  { icon: MessageSquareText, title: "面试追问", body: "从 JD 和简历交叉处预测问题，提前准备递进追问与真实案例。" },
  { icon: Map, title: "求职地图", body: "集中查看公司、岗位、投递阶段、面试安排和下一步行动。" },
];

export default function WelcomePage() {
  return (
    <main className="guide-page">
      <header className="guide-nav">
        <Link className="guide-brand" href="/" aria-label="OfferMap 产品介绍">
          <span><Route size={19} /></span>
          <strong>OfferMap</strong>
        </Link>
        <Link className="guide-nav-link" href="/workspace">已有账号，进入工作台 <ArrowRight size={15} /></Link>
      </header>

      <section className="guide-hero" aria-labelledby="guide-title">
        <div className="guide-hero-copy">
          <p className="guide-eyebrow"><Sparkles size={15} /> 应届生专属求职准备工作台</p>
          <h1 id="guide-title">把每一个岗位，<br />准备成一张清晰的地图。</h1>
          <p className="guide-lead">OfferMap 将岗位 JD、你的真实经历和面试准备连在一起。你不再需要在文档、收藏夹和备忘录之间反复切换。</p>
          <div className="guide-actions">
            <Link className="guide-primary" href="/workspace">开始使用 <ArrowRight size={17} /></Link>
            <a className="guide-secondary" href="#how">看看如何使用</a>
          </div>
          <p className="guide-free-start"><Check size={14} /> 无固定顺序，你可以先上传简历，也可以先保存岗位。</p>
        </div>

        <div className="guide-product-preview" aria-label="OfferMap 工作台功能预览">
          <div className="preview-window-bar"><i /><i /><i /><span>AI 产品经理实习生</span></div>
          <div className="preview-context">
            <span className="preview-company">字节跳动</span>
            <span>产品</span>
            <span>北京</span>
          </div>
          <div className="preview-score-card">
            <div><span>岗位准备状态</span><strong>下一步很清楚</strong></div>
            <span className="preview-ready">分析完成</span>
          </div>
          <div className="preview-analysis-list">
            <div><span className="preview-status strong"><Check size={13} /></span><p><strong>用户需求与产品设计</strong><small>简历中有直接经历支持</small></p><em>证据充分</em></div>
            <div><span className="preview-status partial">2</span><p><strong>AI 产品落地与评测</strong><small>相关经历需要补充结果</small></p><em>部分支持</em></div>
            <div><span className="preview-status question">?</span><p><strong>面试高频追问</strong><small>已生成 8 道针对性问题</small></p><em>开始准备</em></div>
          </div>
          <div className="preview-next"><Sparkles size={15} /><span>建议先补充一次项目复盘中的核心指标</span><ArrowRight size={15} /></div>
        </div>
      </section>

      <section className="guide-section" id="how" aria-labelledby="how-title">
        <div className="guide-section-heading">
          <p>三步开始</p>
          <h2 id="how-title">第一次使用，照着这里做就够了。</h2>
          <span>每一块都可以独立使用，不必完成上一步才能继续。</span>
        </div>
        <div className="guide-step-grid">
          {GUIDE_STEPS.map(({ number, icon: Icon, title, description, tone }) => (
            <article className="guide-step-card" key={number}>
              <div className={`guide-step-icon ${tone}`}><Icon size={23} /></div>
              <span className="guide-step-number">{number}</span>
              <h3>{title}</h3>
              <p>{description}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="guide-section guide-capabilities" aria-labelledby="capability-title">
        <div className="guide-section-heading compact">
          <p>不只是一份分析报告</p>
          <h2 id="capability-title">从发现差距，到真正准备好。</h2>
        </div>
        <div className="guide-capability-grid">
          {ANALYSIS_ITEMS.map(({ icon: Icon, title, body }) => (
            <article key={title}>
              <span><Icon size={20} /></span>
              <h3>{title}</h3>
              <p>{body}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="guide-final-card">
        <div className="guide-final-icon"><ShieldCheck size={25} /></div>
        <div>
          <p>你的求职材料属于你</p>
          <h2>从一个真实岗位开始准备。</h2>
          <span>简历、岗位和准备记录保存在你的账号中；AI 不会替你虚构经历或指标。</span>
        </div>
        <Link className="guide-primary" href="/workspace">进入 OfferMap <ArrowRight size={17} /></Link>
      </section>

      <footer className="guide-footer"><span>OfferMap</span><p>为应届生设计的求职准备工作台</p></footer>
    </main>
  );
}
