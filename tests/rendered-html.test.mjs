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

test("ships the four fixed position categories and verification guardrails", async () => {
  const [component, schema, route] = await Promise.all([
    readFile(new URL("../app/components/OfferMapApp.tsx", import.meta.url), "utf8"),
    readFile(new URL("../lib/analysis-schema.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/api/analyze/route.ts", import.meta.url), "utf8"),
  ]);
  for (const [uiCategory, schemaCategory] of [["技术", "technology"], ["产品", "product"], ["运营", "operations"], ["市场", "marketing"]]) {
    assert.match(component, new RegExp(uiCategory));
    assert.match(schema, new RegExp(schemaCategory));
  }
  assert.match(route, /assertVerifiableQuotes/);
  assert.match(route, /禁止编造/);
});

test("includes a bespoke social preview and removes starter assets", async () => {
  await access(new URL("../public/og.png", import.meta.url));
  await assert.rejects(access(new URL("../app/_sites-preview/SkeletonPreview.tsx", import.meta.url)));
});
