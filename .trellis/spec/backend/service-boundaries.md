# Service Boundaries

## Direct resource routes

Simple CRUD handlers authenticate and query the user-scoped Supabase client in the route. `app/api/companies/route.ts` and `app/api/positions/[id]/application/route.ts` are the reference pattern. Do not add a service wrapper that only renames one query.

## Delegated workflows

Move reusable or multi-step domain work into `lib/`. `app/api/analyze/route.ts` delegates model orchestration to `lib/analysis-engine.ts`; resume endpoints use `lib/resume-parser.ts`, `lib/resume-ai-parser.ts`, and `lib/supabase-storage.ts`; position research uses `lib/web-research.ts`.

Routes own HTTP concerns: credentials, request validation, status codes and response envelopes. Libraries own provider calls, parsing, verification and reusable orchestration. Preserve `export const runtime = "edge"` on handlers that explicitly declare the edge contract.

## Cross-layer changes

When a payload or persisted field changes, trace all consumers across the route, component response types, library schema and Supabase migration. Read `.trellis/spec/guides/cross-layer-thinking-guide.md` before such changes.
