# 技术设计

## 架构边界

将 `lib/resume-parser.ts` 拆为三层：通用 PDF 提取器产出 `ParsedDocument`；版式分段器依据视觉特征发现 section 边界；简历 adapter 对已发现的 section 做可选语义归类。底层和分段器都不依赖中文简历栏目名单。

## 数据流

上传与重新解析接口继续负责鉴权、文件校验、私有 Storage 和版本创建；解析器负责页级文本块、阅读顺序和质量评估；版式分段器用字号、字重、留白、位置、分隔线和内容连续性发现模块；adapter 只负责可选语义标签。`parsed_text` 继续作为下游兼容字段。AI 若启用，只接收带 block id 的模块并返回可验证的标签和 block 引用。

## 中间表示

新增 `ParsedDocument`：包含 parser version、source 元数据、pages、blocks、plain text 和 quality。block 至少保留 page number、稳定 id、text、bbox、block type；提取方式区分 native text / failed。扫描件不引入 OCR，检测到文本不足时返回 typed failure/warning。

section 同时保存 `originalTitle`、`normalizedKind` 和 `sourceBlockIds`。`normalizedKind` 可为空；任何未知栏目都保留原始标题和内容。固定别名只能提高语义标签置信度，不能参与是否创建 section 的决策。

## 版式策略

按页面分别聚合文本块；使用列分组和阅读顺序排序，而不是全局按 y 坐标排序。对重复页眉页脚、页码、表格边界保留 block 信息并在 plain text 生成时谨慎过滤。无法可靠判断时保留原始顺序并降低质量等级，不静默丢弃文本。

模块发现优先使用可解释的版式信号；当版式信号不足且 AI 可用时，AI 可辅助判断 block 边界和语义。AI 返回的每个模块必须引用既有 block ID，服务端校验所有 block 不被篡改或无故遗漏。AI 不可用、超时、返回非法结果或校验失败时，仍返回动态发现的原始模块，并降低质量等级；不回退到固定栏目枚举，也不让上传失败。

## 兼容与迁移

不删除 `parsed_text`、`structured_content` 或现有版本字段。`structured_content` 增加来源/质量字段时保持旧字段可读；旧记录可按 reparse 逐步升级。下游分析接口继续读取 `parsed_text`，引用校验继续基于完整规范化文本。

## 风险与回滚

主要风险是阅读顺序变化导致历史分析输入变化。通过 parser version、fixture 对比和按版本 reparse 控制；新解析结果异常时可回退到旧 parser adapter，原始 PDF 永不修改。数据库迁移只增加可空/默认字段，避免阻塞旧数据。
