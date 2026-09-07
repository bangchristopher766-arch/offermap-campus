# 当前 PDF 解析链路调研

## 入口与存储

- `app/api/resumes/parse/route.ts` 校验登录、PDF MIME、10 MB 上限和 `%PDF-` 文件头，调用 `parseResumePdf` 后保存原文件及解析结果。
- `app/api/resumes/[id]/reparse/route.ts` 下载私有 PDF，复用同一解析器并创建新版本。
- `lib/supabase-storage.ts` 负责原文件上传、回读字节校验和鉴权下载。

## 解析与结构化

- `lib/resume-parser.ts` 使用 `unpdf`/PDF.js 提取带坐标文本项，按 y 坐标聚行、按 x 坐标拼接。
- 同一模块通过固定中文栏目别名划分简历结构，说明底层提取与领域适配目前耦合。
- `lib/resume-ai-parser.ts` 仅在本地质量非 high 且 AI 已配置时按行号归类；模型不能改写事实，但输入已经丢失页面和坐标信息。

## 兼容面

- 下游岗位分析主要消费 `resumes.parsed_text`，部分流程读取 `structured_content.sections`。
- 前端读取 `parser_version`、`sections` 和 `quality`，人工校正使用 parser version 4。
- 原始 PDF、简历版本、岗位绑定和历史分析均需保持不可变语义。

## 已确认局限

- 扫描件不支持，本任务明确不引入 OCR。
- 固定中文栏目 schema 对英文和自定义栏目适应性不足。
- 单纯 y/x 排序无法稳定恢复多栏、表格、页眉页脚和复杂跨页阅读顺序。
- 80 字阈值不能区分扫描件、空白、加密、损坏和部分可提取等失败类型。
- 现有测试以源码字符串断言为主，缺少真实布局 fixture 和解析结果测试。
