import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";
import test from "node:test";

async function render(path = "/") {
  const workerUrl = new URL("../dist/server/index.js", import.meta.url);
  workerUrl.searchParams.set("test", `${process.pid}-${Date.now()}`);
  const { default: worker } = await import(workerUrl.href);
  return worker.fetch(
    new Request(`http://localhost${path}`, { headers: { accept: "text/html" } }),
    { ASSETS: { fetch: async () => new Response("Not found", { status: 404 }) } },
    { waitUntil() {}, passThroughOnException() {} },
  );
}

test("renders the independent OfferMap workspace routes", async () => {
  const [homeResponse, resumeResponse, mapResponse, analysisResponse] = await Promise.all([
    render("/"),
    render("/resume"),
    render("/map"),
    render("/positions/byte-pm"),
  ]);
  for (const response of [homeResponse, resumeResponse, mapResponse, analysisResponse]) {
    assert.equal(response.status, 200);
  }
  const [home, resume, map, analysis] = await Promise.all([
    homeResponse.text(), resumeResponse.text(), mapResponse.text(), analysisResponse.text(),
  ]);
  assert.match(home, /<title>OfferMap · 应届求职工作台<\/title>/);
  assert.match(home, /href="\/resume" class="entry-card card"/);
  assert.match(home, /href="\/map" class="entry-card card"/);
  assert.match(resume, /当前母版/);
  assert.match(map, /个人求职地图/);
  assert.match(analysis, /证据地图/);
  assert.match(analysis, /定制简历/);
  assert.match(analysis, /面试追问地图/);
  assert.doesNotMatch(home, /codex-preview|Your site is taking shape|react-loading-skeleton/);
});

test("ships the four fixed position categories and semantic verification guardrails", async () => {
  const [component, schema, engine] = await Promise.all([
    readFile(new URL("../app/components/OfferMapApp.tsx", import.meta.url), "utf8"),
    readFile(new URL("../lib/analysis-schema.ts", import.meta.url), "utf8"),
    readFile(new URL("../lib/analysis-engine.ts", import.meta.url), "utf8"),
  ]);
  for (const [uiCategory, schemaCategory] of [["技术", "technology"], ["产品", "product"], ["运营", "operations"], ["市场", "marketing"]]) {
    assert.match(component, new RegExp(uiCategory));
    assert.match(schema, new RegExp(schemaCategory));
  }
  assert.match(engine, /assertVerifiableQuotes/);
  assert.match(engine, /不得编造/);
  assert.match(engine, /candidateResumeLineIds/);
  assert.match(engine, /resumeLineIds/);
});

test("includes a bespoke social preview and removes starter assets", async () => {
  await access(new URL("../public/og.png", import.meta.url));
  await assert.rejects(access(new URL("../app/_sites-preview/SkeletonPreview.tsx", import.meta.url)));
});

test("includes authenticated persistence and application tracking", async () => {
  const [component, browserClient, publicConfig, applicationRoute, migration] = await Promise.all([
    readFile(new URL("../app/components/OfferMapApp.tsx", import.meta.url), "utf8"),
    readFile(new URL("../lib/supabase-browser.ts", import.meta.url), "utf8"),
    readFile(new URL("../lib/supabase-config.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/api/positions/[id]/application/route.ts", import.meta.url), "utf8"),
    readFile(new URL("../supabase/migrations/0002_application_tracking.sql", import.meta.url), "utf8"),
  ]);
  assert.match(component, /signInWithPassword/);
  assert.match(component, /auth\.signUp/);
  assert.match(component, /auth\.updateUser/);
  assert.doesNotMatch(component, /signInWithOtp/);
  assert.match(component, /authenticatedFetch/);
  assert.match(component, /实时数据已连接/);
  assert.match(browserClient, /SupabasePublicConfig/);
  assert.match(publicConfig, /NEXT_PUBLIC_SUPABASE_URL/);
  assert.match(applicationRoute, /auth\.getUser/);
  assert.match(applicationRoute, /application_events/);
  assert.match(migration, /enable row level security/);
  assert.match(migration, /users_manage_own_applications/);
});

test("reads Supabase public configuration at server runtime", async () => {
  process.env.NEXT_PUBLIC_SUPABASE_URL = "https://example.supabase.co";
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY = "sb_publishable_test";
  try {
    const response = await render("/");
    assert.equal(response.status, 200);
    assert.match(await response.text(), /正在恢复登录状态/);
  } finally {
    delete process.env.NEXT_PUBLIC_SUPABASE_URL;
    delete process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  }
});

test("implements private PDF resume versions", async () => {
  const [component, listRoute, parseRoute, pdfRoute, reparseRoute, parser, aiParser, aiClient, storage, migration] = await Promise.all([
    readFile(new URL("../app/components/OfferMapApp.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/api/resumes/route.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/api/resumes/parse/route.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/api/resumes/[id]/pdf/route.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/api/resumes/[id]/reparse/route.ts", import.meta.url), "utf8"),
    readFile(new URL("../lib/resume-parser.ts", import.meta.url), "utf8"),
    readFile(new URL("../lib/resume-ai-parser.ts", import.meta.url), "utf8"),
    readFile(new URL("../lib/ai-client.ts", import.meta.url), "utf8"),
    readFile(new URL("../lib/supabase-storage.ts", import.meta.url), "utf8"),
    readFile(new URL("../supabase/migrations/0003_resume_versions.sql", import.meta.url), "utf8"),
  ]);
  assert.match(component, /type="file"/);
  assert.match(component, /开始解析并保存/);
  assert.match(parseRoute, /storage/);
  assert.match(parseRoute, /analysis_status: "stale"/);
  assert.match(parseRoute, /parseResumePdf\(bytes\.slice\(\)\)/);
  assert.match(parseRoute, /EMPTY_FILE_HASH/);
  assert.doesNotMatch(listRoute, /createSignedUrl/);
  assert.match(pdfRoute, /Content-Type.*application\/pdf/s);
  assert.match(pdfRoute, /%PDF-/);
  assert.match(reparseRoute, /parseResumePdf/);
  assert.match(parser, /extractTextItems/);
  assert.match(parser, /parser_version: 2/);
  assert.match(parser, /normalize\("NFKC"\)/);
  assert.match(parser, /个人技能/);
  assert.match(aiParser, /lineIds/);
  assert.match(aiClient, /DASHSCOPE_API_KEY/);
  assert.match(storage, /verified\.byteLength !== bytes\.byteLength/);
  assert.match(component, /PdfPreviewModal/);
  assert.doesNotMatch(component, /window\.open/);
  assert.match(migration, /resume-pdfs/);
  assert.match(migration, /auth\.uid\(\)/);
  assert.match(migration, /public, file_size_limit/);
});

test("supports manual resume correction and invalidates stale analyses", async () => {
  const [component, resumeRoute, analysisRoute, resumeSuggestionRoute, interviewRoute] = await Promise.all([
    readFile(new URL("../app/components/OfferMapApp.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/api/resumes/[id]/route.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/api/positions/[id]/analysis/route.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/api/positions/[id]/resume-suggestions/route.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/api/positions/[id]/interview-map/route.ts", import.meta.url), "utf8"),
  ]);
  assert.match(component, /校正简历解析稿/);
  assert.match(component, /保存校正稿/);
  assert.match(component, /原始 PDF 不会被修改/);
  assert.match(resumeRoute, /manual-correction/);
  assert.match(resumeRoute, /analysis_status: "stale"/);
  assert.match(resumeRoute, /parsed_text: parsedText/);
  for (const route of [analysisRoute, resumeSuggestionRoute, interviewRoute]) {
    assert.match(route, /resume\.parsed_text/);
  }
});

test("supports selecting and deleting private resume versions", async () => {
  const [component, listRoute, resumeRoute] = await Promise.all([
    readFile(new URL("../app/components/OfferMapApp.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/api/resumes/route.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/api/resumes/[id]/route.ts", import.meta.url), "utf8"),
  ]);
  assert.match(component, /设为母版/);
  assert.match(component, /ResumeVersionDeleteModal/);
  assert.match(listRoute, /is_current/);
  assert.match(resumeRoute, /export async function PUT/);
  assert.match(resumeRoute, /export async function DELETE/);
  assert.match(resumeRoute, /resume-pdfs/);
  assert.match(resumeRoute, /analysis_status: "stale"/);
  assert.match(resumeRoute, /preservedActiveId/);
});

test("shows complete position metadata and the original JD in analysis", async () => {
  const [component, analysisRoute] = await Promise.all([
    readFile(new URL("../app/components/OfferMapApp.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/api/positions/[id]/analysis/route.ts", import.meta.url), "utf8"),
  ]);
  assert.match(component, /岗位信息与 JD/);
  assert.match(component, /完整 JD 原文/);
  assert.match(component, /复制完整 JD/);
  assert.match(component, /function JobDetailDrawer/);
  assert.match(analysisRoute, /jd_text/);
});

test("exposes company and position management with destructive confirmation", async () => {
  const component = await readFile(new URL("../app/components/OfferMapApp.tsx", import.meta.url), "utf8");
  assert.match(component, /function CompanyManageModal/);
  assert.match(component, /删除公司及其岗位/);
  assert.match(component, /function PositionManageModal/);
  assert.match(component, /确认删除岗位/);
  assert.match(component, /method: "PATCH"/);
  assert.match(component, /method: "DELETE"/);
});

test("persists grounded resume suggestions and interview maps", async () => {
  const [component, analysisRoute, resumeRoute, interviewRoute, suggestionRoute, engine, aiClient] = await Promise.all([
    readFile(new URL("../app/components/OfferMapApp.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/api/positions/[id]/analysis/route.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/api/positions/[id]/resume-suggestions/route.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/api/positions/[id]/interview-map/route.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/api/resume-suggestions/[id]/route.ts", import.meta.url), "utf8"),
    readFile(new URL("../lib/analysis-engine.ts", import.meta.url), "utf8"),
    readFile(new URL("../lib/ai-client.ts", import.meta.url), "utf8"),
  ]);
  assert.match(analysisRoute, /resume_suggestions/);
  assert.match(analysisRoute, /interview_questions/);
  assert.match(resumeRoute, /resumeSuggestionsSchema/);
  assert.match(resumeRoute, /analysisContext/);
  assert.match(interviewRoute, /interviewMapSchema/);
  assert.match(interviewRoute, /question_followups/);
  assert.match(suggestionRoute, /accepted/);
  assert.match(engine, /SOURCE_CATALOG/);
  assert.match(engine, /generateGroundedOutput/);
  assert.match(engine, /thinking: false/);
  assert.match(engine, /isFaithfulResumeRewrite/);
  assert.match(engine, /同一 evidenceId 最多使用一次/);
  assert.match(engine, /不得把“参与”升级成“负责\/主导”/);
  assert.match(resumeRoute, /resume-\$\{phase\}/);
  assert.match(resumeRoute, /resume-v5-fast-single-call/);
  assert.match(interviewRoute, /interview-\$\{phase\}/);
  assert.match(aiClient, /finishReason/);
  assert.match(component, /核心结果已生成/);
  assert.match(component, /继续补充/);
  assert.doesNotMatch(component, /const shouldExpand/);
  assert.match(component, /没有值得硬改的内容/);
  assert.match(component, /复制定制版/);
  assert.match(component, /核心结果已生成/);
  assert.match(component, /生成定制简历/);
  assert.match(component, /生成追问地图/);
  assert.match(component, /navigator\.clipboard/);
});

test("persists, resumes, and safely retries AI analysis runs", async () => {
  const [component, guard, analysisRoute, resumeRoute, interviewRoute] = await Promise.all([
    readFile(new URL("../app/components/OfferMapApp.tsx", import.meta.url), "utf8"),
    readFile(new URL("../lib/ai-run-guard.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/api/positions/[id]/analysis/route.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/api/positions/[id]/resume-suggestions/route.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/api/positions/[id]/interview-map/route.ts", import.meta.url), "utf8"),
  ]);
  assert.match(guard, /STALLED_AFTER_MS/);
  assert.match(guard, /deterministicRunId/);
  assert.match(guard, /loadActiveAiRun/);
  assert.match(guard, /stalled:auto-released/);
  for (const route of [analysisRoute, resumeRoute, interviewRoute]) {
    assert.match(route, /claimAiRun/);
    assert.match(route, /inProgress/);
    assert.match(route, /activeRun/);
  }
  assert.match(component, /window\.setInterval/);
  assert.match(component, /分析任务已经保存在账号中/);
  assert.match(component, /上次分析没有正常结束/);
  assert.match(component, /result\.meta\?\.inProgress/);
});

test("provides analysis history and a portable job preparation report", async () => {
  const [component, analysisRoute] = await Promise.all([
    readFile(new URL("../app/components/OfferMapApp.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/api/positions/[id]/analysis/route.ts", import.meta.url), "utf8"),
  ]);
  assert.match(analysisRoute, /input_tokens,output_tokens/);
  assert.match(analysisRoute, /history: historyRuns\.data/);
  assert.match(component, /function AnalysisHistoryDrawer/);
  assert.match(component, /分析记录/);
  assert.match(component, /导出准备包/);
  assert.match(component, /求职准备包\.md/);
  assert.match(component, /text\/markdown/);
});

test("saves a private answer preparation workspace for every interview question", async () => {
  const [component, preparationRoute, analysisRoute, migration] = await Promise.all([
    readFile(new URL("../app/components/OfferMapApp.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/api/interview-questions/[id]/preparation/route.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/api/positions/[id]/analysis/route.ts", import.meta.url), "utf8"),
    readFile(new URL("../supabase/migrations/0001_offermap.sql", import.meta.url), "utf8"),
  ]);
  assert.match(component, /回答准备/);
  assert.match(component, /function AnswerPreparationPanel/);
  assert.match(component, /回答草稿/);
  assert.match(component, /真实案例与个人贡献/);
  assert.match(component, /关键数据/);
  assert.match(component, /保存回答准备/);
  assert.match(preparationRoute, /auth\.getUser/);
  assert.match(preparationRoute, /interview_questions/);
  assert.match(preparationRoute, /target_type.*interview_question/s);
  assert.match(preparationRoute, /user_id: user\.user\.id/);
  assert.match(analysisRoute, /enrichQuestionPreparations/);
  assert.match(analysisRoute, /question-preparation/);
  assert.match(migration, /'ai_runs','feedback'/);
  assert.match(migration, /auth\.uid\(\) = user_id/);
});

test("passes the 12-sample four-category batch contract", async () => {
  const [fixture, report] = await Promise.all([
    readFile(new URL("../tests/fixtures/analysis-samples.json", import.meta.url), "utf8").then(JSON.parse),
    readFile(new URL("../tests/reports/analysis-batch-report.json", import.meta.url), "utf8").then(JSON.parse),
  ]);
  assert.equal(fixture.length, 12);
  assert.equal(report.summary.total, 12);
  assert.equal(report.summary.passed, 12);
  assert.equal(report.summary.failed, 0);
  assert.deepEqual(report.summary.distribution, { technology: 3, product: 3, operations: 3, marketing: 3 });
  assert.ok(fixture.every((sample) => sample.jd.includes(sample.expectedRequirement)));
  assert.ok(fixture.every((sample) => sample.resume.includes(sample.expectedEvidenceQuote)));
});
