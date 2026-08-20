import { mkdir, readFile, writeFile } from "node:fs/promises";

const fixtureUrl = new URL("../tests/fixtures/analysis-samples.json", import.meta.url);
const reportUrl = new URL("../tests/reports/analysis-batch-report.json", import.meta.url);
const samples = JSON.parse(await readFile(fixtureUrl, "utf8"));
const categories = ["technology", "product", "operations", "marketing"];
const seen = new Set();
const results = samples.map((sample) => {
  const checks = {
    uniqueId: !seen.has(sample.id),
    validCategory: categories.includes(sample.category),
    substantiveJd: typeof sample.jd === "string" && sample.jd.length >= 60,
    substantiveResume: typeof sample.resume === "string" && sample.resume.length >= 70,
    requirementTraceable: sample.jd.includes(sample.expectedRequirement),
    evidenceTraceable: sample.resume.includes(sample.expectedEvidenceQuote),
    anonymous: !/@|1[3-9]\d{9}|身份证|微信[:：]/.test(`${sample.jd}${sample.resume}`),
  };
  seen.add(sample.id);
  return { id: sample.id, category: sample.category, title: sample.title, passed: Object.values(checks).every(Boolean), checks };
});
const distribution = Object.fromEntries(categories.map((category) => [category, results.filter((item) => item.category === category).length]));
const report = {
  generatedBy: "npm run test:batch",
  mode: "offline-source-contract",
  note: "验证匿名样本覆盖、输入完整性与引用可定位性；真实模型语义质量需在具备服务端模型密钥的环境运行在线批次。",
  summary: { total: results.length, passed: results.filter((item) => item.passed).length, failed: results.filter((item) => !item.passed).length, distribution },
  results,
};
if (samples.length !== 12 || categories.some((category) => distribution[category] !== 3)) throw new Error(`样本分布错误：${JSON.stringify(distribution)}`);
if (report.summary.failed) throw new Error(`${report.summary.failed} 组样本未通过来源合同检查`);
await mkdir(new URL("../tests/reports/", import.meta.url), { recursive: true });
await writeFile(reportUrl, `${JSON.stringify(report, null, 2)}\n`, "utf8");
console.log(`OfferMap 样本跑批通过：${report.summary.passed}/${report.summary.total}，四类岗位各 3 组。`);
