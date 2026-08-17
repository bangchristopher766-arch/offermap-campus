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

test("renders the OfferMap workbench", async () => {
  const response = await render();
  assert.equal(response.status, 200);
  const html = await response.text();
  assert.match(html, /<title>OfferMap · 应届求职工作台<\/title>/);
  assert.match(html, /证据地图/);
  assert.match(html, /定制简历/);
  assert.match(html, /面试追问地图/);
  assert.match(html, /字节跳动/);
  assert.doesNotMatch(html, /codex-preview|Your site is taking shape|react-loading-skeleton/);
});

test("ships the four fixed position categories and verification guardrails", async () => {
  const [component, schema, route] = await Promise.all([
    readFile(new URL("../app/components/OfferMapApp.tsx", import.meta.url), "utf8"),
    readFile(new URL("../lib/analysis-schema.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/api/analyze/route.ts", import.meta.url), "utf8"),
  ]);
  for (const category of ["technology", "product", "operations", "marketing"]) {
    assert.match(component, new RegExp(category));
    assert.match(schema, new RegExp(category));
  }
  assert.match(route, /assertVerifiableQuotes/);
  assert.match(route, /禁止编造/);
});

test("includes a bespoke social preview and removes starter assets", async () => {
  await access(new URL("../public/og.png", import.meta.url));
  await assert.rejects(access(new URL("../app/_sites-preview/SkeletonPreview.tsx", import.meta.url)));
});
