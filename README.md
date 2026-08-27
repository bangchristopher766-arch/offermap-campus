# OfferMap 应届求职工作台

OfferMap 把多份求职简历和多个目标岗位连接起来，按「公司 → 岗位类别 → 具体岗位」组织求职准备。每个岗位可以绑定具体简历版本，并拥有当前 JD 证据地图、岗位通用能力画像、带来源的联网岗位情报、定制简历建议和面试追问地图。

## 核心设计

- 四类互联网岗位：技术、产品、运营、市场。
- 所有 AI 判断都必须引用 JD 或简历原文。
- 不输出不可解释的匹配分；使用「证据充分 / 部分支持 / 暂无证据」。
- 没有完整 JD 时，可以先按岗位族、行业和职级查看岗位通用能力；页面会明确说明它不等于某家公司的真实要求。
- 简历按求职方向组成资料库；上传、重新解析和人工校正都会创建不可变版本。
- 岗位分析、岗位画像和实际投递都冻结对应简历版本，更新简历不会覆盖历史事实。
- 面试地图沿着「JD 要求 → 简历经历 → 面试官关注点 → 主问题 → 连环追问 → 回答准备」展开。
- 无外部凭据时，首页以完整演示数据运行；配置 Supabase 后启用邮箱密码登录、账号数据隔离和永久保存。
- 简历使用私有 Storage 保存每一版 PDF，短期签名链接用于在线预览；数据库同步保存解析文本、页数和结构化内容。
- 公司、岗位与求职阶段使用真实数据库；每次阶段变化都会留下历史事件。
- 每道面试问题都可以保存回答草稿、真实案例、关键数据、补充笔记和准备状态。
- 岗位分析页支持运行记录、完整准备包导出和面试前回答清单。
- 岗位情报使用联网搜索研究公司业务、公开招聘信息和面试经验；每条结论都保留来源链接，且不会把简历发送给搜索服务。

## 本地运行

```bash
npm install
cp .env.example .env.local
npm run dev
```

浏览 `http://localhost:3000`。不填写环境变量也可以使用演示工作台。

## 外部服务配置

1. 在 Supabase 创建项目，按编号依次执行 `supabase/migrations/0001_offermap.sql` 至 `supabase/migrations/0004_role_profiles_and_resume_library.sql`。`0003` 创建私有 PDF 存储，`0004` 增加多简历、岗位绑定、投递快照、分析快照与岗位通用能力画像。
2. 把项目 URL 与 anon key 写入 `.env.local`。
3. 在 Supabase Authentication 中启用 Email，并把本地地址与部署域名加入 Redirect URLs。
4. 选择智谱、DeepSeek 或阿里云百炼，填写对应的服务端 API Key。
5. 服务端通过兼容 Chat Completions 接口调用模型；使用 `AI_PROVIDER`、`AI_MODEL` 和可选的 `AI_BASE_URL` 切换供应商与模型。

部署环境需要配置：

```text
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
AI_PROVIDER
AI_API_KEY
AI_MODEL
TAVILY_API_KEY
```

两项同时存在时页面会进入真实登录模式；任一缺失时继续使用演示数据，不会发起未授权的数据写入。

## 关键接口

- `GET /api/resumes`：读取当前账号的全部简历版本与结构化解析结果。
- `POST /api/resumes/parse`：使用带坐标的版面文本解析并保存不超过 10 MB 的文本型 PDF；上传后会回读校验字节数，重复文件会修复旧存储对象而不是只更新文本。
- `GET /api/resumes/:id/pdf`：在校验登录与文件归属后返回原始 PDF 字节，用于可靠的本地安全预览。
- `POST /api/resumes/:id/reparse`：使用最新版解析器重新处理已保存的 PDF，无需重复上传。
- `/api/resume-documents`：创建、重命名、归档简历资料，并设置默认求职简历。
- `/api/positions/:id/resume-binding`：为岗位切换具体分析简历版本，旧绑定保留为历史。
- `/api/positions/:id/resume-options`：返回所有简历版本及可解释的推荐依据。
- `/api/positions/:id/submissions`：记录和读取实际投递使用的简历版本。

配置 AI 服务后，复杂版式可以额外使用模型进行“行号归类”：模型只能返回原文行 ID，无法改写或补充简历事实。未配置时自动使用本地版面解析器。
- `POST /api/analyze`：生成证据地图、定制简历或面试地图；Zod 校验并验证原文引用。
- `/api/companies`：读取与创建公司。
- `/api/companies/:id`：修改或级联删除公司。
- `/api/companies/:id/positions`：创建具体岗位。
- `/api/positions/:id`：修改、移动或删除岗位。
- `/api/positions/:id/application`：读取或更新岗位求职阶段，并记录阶段历史。
- `/api/roles/normalize`：将用户输入岗位名映射到标准岗位族，并在低置信度时要求确认。
- `/api/role-profiles/match`：读取适合当前岗位范围的通用能力画像。
- `/api/positions/:id/benchmark-analysis`：用岗位通用能力画像分析当前绑定简历，结果与真实 JD 分析分开保存。
- `/api/positions/:id/research`：联网搜索并生成带来源引用的岗位情报；结果复用账号隔离的分析记录保存七天，不需要额外数据库迁移。
- `/api/interview-questions/:id/preparation`：保存当前账号对单道面试问题的回答准备。

## 测试

- `npm test`：构建、16 项产品与权限边界测试，以及 12 组匿名样本合同跑批。
- `npm run test:batch`：单独运行技术、产品、运营、市场各 3 组样本检查。
- `npm run test:isolation:live`：传入两个测试账号令牌后，验证账号 A 的岗位无法被账号 B 或匿名用户读取。

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
