# OfferMap 应届求职工作台

OfferMap 把一份母版简历和多个目标岗位连接起来，按「公司 → 岗位类别 → 具体岗位」组织求职准备。每个岗位包含证据地图、定制简历建议和面试追问地图。

## 核心设计

- 四类互联网岗位：技术、产品、运营、市场。
- 所有 AI 判断都必须引用 JD 或简历原文。
- 不输出不可解释的匹配分；使用「证据充分 / 部分支持 / 暂无证据」。
- 面试地图沿着「JD 要求 → 简历经历 → 面试官关注点 → 主问题 → 连环追问 → 回答准备」展开。
- 无外部凭据时，首页以完整演示数据运行；配置后可接真实 PDF、Supabase 和千问。

## 本地运行

```bash
npm install
cp .env.example .env.local
npm run dev
```

浏览 `http://localhost:3000`。不填写环境变量也可以使用演示工作台。

## 外部服务配置

1. 在 Supabase 创建项目，执行 `supabase/migrations/0001_offermap.sql`。
2. 把项目 URL 与 anon key 写入 `.env.local`。
3. 在阿里云百炼创建 API Key，并填写 `DASHSCOPE_API_KEY`。
4. 服务端通过兼容 Chat Completions 接口调用千问，默认模型可用 `DASHSCOPE_MODEL` 调整。

## 关键接口

- `POST /api/resumes/parse`：解析不超过 5 MB 的文本型 PDF，原文件不落盘。
- `POST /api/analyze`：生成证据地图、定制简历或面试地图；Zod 校验并验证原文引用。
- `/api/companies`：读取与创建公司。
- `/api/companies/:id`：修改或级联删除公司。
- `/api/companies/:id/positions`：创建具体岗位。
- `/api/positions/:id`：修改、移动或删除岗位。

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
