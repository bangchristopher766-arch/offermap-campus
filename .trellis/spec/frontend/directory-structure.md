# Directory Structure

## Runtime and feature boundaries

This is a Vinext/Next App Router project. Route pages live in `app/`; HTTP handlers live alongside their route segment in `app/api/`. Browser UI is currently concentrated in `app/components/OfferMapApp.tsx`, while domain and infrastructure helpers live in `lib/`.

```
app/
  layout.tsx, globals.css       # shared document shell and global styles
  page.tsx                      # entry route
  workspace/, resume/, positions/, map/  # page-route adapters
  components/OfferMapApp.tsx    # client-side product workspace
  api/                          # edge HTTP handlers grouped by resource
lib/
  analysis-*.ts, ai-*.ts        # AI request validation and orchestration
  resume-*.ts                   # PDF parsing and optional AI line grouping
  supabase*.ts                  # server, browser, config, and storage clients
  web-research.ts               # sourced web-research workflow
db/                             # Cloudflare D1/Drizzle template integration
worker/index.ts                 # Cloudflare/Vinext deployment entry point
supabase/migrations/            # production Supabase schema history
tests/, scripts/                # product checks and fixture-based batch runs
```

## Placement rules

- Add a user-facing URL as `app/<segment>/page.tsx`; keep it a small adapter around the shared workspace where possible. Examples: `app/resume/page.tsx` and `app/positions/[id]/page.tsx`.
- Add resource endpoints under `app/api/<resource>/.../route.ts`. Preserve the existing resource-first layout, such as `app/api/positions/[id]/research/route.ts`.
- Put reusable, non-React domain logic in `lib/`. Complex workflows validate/authenticate in the route handler and then delegate; `app/api/analyze/route.ts` delegates to `lib/analysis-engine.ts` after parsing with `lib/analysis-schema.ts`. Ordinary account-scoped resource routes may validate/authenticate and query the user-scoped Supabase client directly, as `app/api/companies/route.ts` does.
- Keep database migrations append-only under `supabase/migrations/`. The `db/` D1 code is a Vinext/Cloudflare template integration, not the source of production application records; current application routes use Supabase.

## Naming

- Use lowercase route directory names and `route.ts` / `page.tsx` App Router conventions.
- Use kebab-case for multiword library filenames (`resume-ai-parser.ts`, `ai-run-guard.ts`).
- Use PascalCase only for React component names; the existing top-level component is `OfferMapApp`.

## Evidence

- Product route adapters: `app/workspace/page.tsx`, `app/positions/[id]/page.tsx`.
- Resource endpoints: `app/api/resumes/parse/route.ts`, `app/api/companies/[id]/positions/route.ts`.
- Domain services: `lib/analysis-engine.ts`, `lib/resume-parser.ts`, `lib/web-research.ts`.
