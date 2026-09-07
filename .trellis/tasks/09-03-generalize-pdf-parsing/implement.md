# 执行计划

1. 定义 `ParsedDocument`、block、quality 和 typed parse error 类型，补充单元测试。
2. 重构 PDF 提取逻辑为 page/block 输出，保留现有 `parseResumePdf` 兼容包装。
3. 实现多栏/表格/页眉页脚/跨页排序与文本清洗策略，加入中英文 fixture。
4. 实现基于版式特征的动态模块发现，确保未知标题和未命名模块也能保留。
5. 将栏目语义理解迁移到 resume adapter：保留原始标题，标准标签可为空；AI 仅做可验证的可选增强，并为未配置、超时、非法输出和 block 遗漏实现本地降级。
6. 更新上传、重新解析和人工校正接口，持久化 parser metadata；维持旧字段和版本语义。
7. 更新前端状态与提示，明确“文本型 PDF 支持、扫描件暂不支持”和质量告警。
8. 扩展 rendered HTML/解析测试，加入任意自定义栏目未被丢失的测试，并运行 `npm run build`、`npm run lint`、`npm test`。
9. 完成 Trellis quality check，确认引用校验、账号隔离、Storage 校验和旧数据兼容。

## 风险检查点

- 先固定旧 fixture 的 `parsed_text` 与 sections 快照，再切换新排序。
- 若下游 quote 验证失败，优先回退 plain text 生成策略，不修改 AI 规则。
- AI 增强不得改变 block 原文；校验不通过时丢弃 AI 结果而非阻断解析。
- 数据库字段迁移必须可选，失败时旧记录仍可读取和预览。
