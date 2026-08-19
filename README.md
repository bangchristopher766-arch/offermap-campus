# OfferMap 应届求职工作台

OfferMap 把一份母版简历和多个目标岗位连接起来，按「公司 → 岗位类别 → 具体岗位」组织求职准备。每个岗位包含证据地图、定制简历建议和面试追问地图。

## 核心设计

- 四类互联网岗位：技术、产品、运营、市场。
- 所有 AI 判断都必须引用 JD 或简历原文。
- 不输出不可解释的匹配分；使用「证据充分 / 部分支持 / 暂无证据」。
- 面试地图沿着「JD 要求 → 简历经历 → 面试官关注点 → 主问题 → 连环追问 → 回答准备」展开。
- 无外部凭据时，首页以完整演示数据运行；配置 Supabase 后启用邮箱 Magic Link 登录、账号数据隔离和永久保存。
- 母版简历使用私有 Storage 保存每一版 PDF，短期签名链接用于在线预览；数据库同步保存解析文本、页数和结构化内容。
- 公司、岗位与求职阶段使用真实数据库；每次阶段变化都会留下历史事件。

## 本地运行

```bash
npm install
cp .env.example .env.local
npm run dev
```

浏览 `http://localhost:3000`。不填写环境变量也可以使用演示工作台。

## 外部服务配置

1. 在 Supabase 创建项目，依次执行 `supabase/migrations/0001_offermap.sql`、`supabase/migrations/0002_application_tracking.sql` 和 `supabase/migrations/0003_resume_versions.sql`。第三个迁移会创建私有 `resume-pdfs` 存储桶及账号隔离规则。
2. 把项目 URL 与 anon key 写入 `.env.local`。
3. 在 Supabase Authentication 中启用 Email，并把本地地址与部署域名加入 Redirect URLs。
4. 在阿里云百炼创建 API Key，并填写 `DASHSCOPE_API_KEY`。
5. 服务端通过兼容 Chat Completions 接口调用千问，默认模型可用 `DASHSCOPE_MODEL` 调整。

部署环境需要配置：

```text
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
```

两项同时存在时页面会进入真实登录模式；任一缺失时继续使用演示数据，不会发起未授权的数据写入。

## 关键接口

- `GET /api/resumes`：读取当前账号的全部简历版本与结构化解析结果。
- `POST /api/resumes/parse`：使用带坐标的版面文本解析并保存不超过 10 MB 的文本型 PDF；上传后会回读校验字节数，重复文件会修复旧存储对象而不是只更新文本。
- `GET /api/resumes/:id/pdf`：在校验登录与文件归属后返回原始 PDF 字节，用于可靠的本地安全预览。
- `POST /api/resumes/:id/reparse`：使用最新版解析器重新处理已保存的 PDF，无需重复上传。

当配置 `DASHSCOPE_API_KEY` 时，复杂版式会额外使用千问进行“行号归类”：模型只能返回原文行 ID，无法改写或补充简历事实。未配置时自动使用本地版面解析器。
- `POST /api/analyze`：生成证据地图、定制简历或面试地图；Zod 校验并验证原文引用。
- `/api/companies`：读取与创建公司。
- `/api/companies/:id`：修改或级联删除公司。
- `/api/companies/:id/positions`：创建具体岗位。
- `/api/positions/:id`：修改、移动或删除岗位。
- `/api/positions/:id/application`：读取或更新岗位求职阶段，并记录阶段历史。

## 可靠性边界

- JD 与简历被当作不可信数据并放在明确的分隔标签内。
- 所有 quote 字段都必须能在输入中逐字定位，否则整次分析失败。
- 缺少 API Key 时真实分析接口返回明确的 `DEMO_MODE`，不会伪装成模型结果。
- 扫描件、加密 PDF、Word、岗位链接抓取和完整 PDF 导出不在首版范围。

## 验证

```bash
npm run build
npm run lint
```
