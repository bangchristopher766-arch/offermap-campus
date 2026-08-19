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
  assert.match(component, /signInWithOtp/);
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
