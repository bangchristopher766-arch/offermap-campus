# Complete project specification layers

## Goal

Document the repository's actual architecture and durable coding conventions so future AI and human contributors can load guidance by responsibility instead of relying on generic defaults.

## Background and confirmed facts

- This is a single-repo Vinext/Next App Router application.
- UI and page adapters are under `app/`; resource HTTP handlers are under `app/api/`.
- Domain and infrastructure helpers are under `lib/`; production persistence is Supabase with SQL migrations under `supabase/migrations/`.
- `worker/index.ts` is the Cloudflare Worker/Vinext runtime entry point. `db/` contains the D1/Drizzle template integration.
- Existing frontend guidelines are already populated under `.trellis/spec/frontend/`.

## Requirements

Create and populate six additional spec layers, each grounded in at least two real repository examples:

1. `backend`: API route structure, auth, errors, and service boundaries.
2. `data`: Supabase schema, migrations, storage, account isolation, and D1 boundary.
3. `ai-domain`: AI client, schemas, evidence/citation invariants, and research/resume workflows.
4. `deployment`: Vinext, Vite, Cloudflare Worker, environment configuration, and runtime constraints.
5. `security`: authentication, authorization, private files, untrusted JD/resume text, and secret handling.
6. `testing`: test layers, fixtures, scripts, required commands, and known environment prerequisites.

Each layer must have an English `index.md` and concrete guideline files with examples, forbidden patterns, and links to source files. Update the top-level spec navigation so all layers are discoverable without inventing a package structure that does not exist.

## Out of scope

- No product-code refactor, dependency upgrade, schema migration, or behavior change.
- No claim that D1/Drizzle is the production data source.
- No speculative conventions unsupported by current code.

## Acceptance criteria

- [x] Six new layer directories exist with readable English index and guideline documents.
- [x] Every document cites real paths and describes current behavior, including known limitations.
- [x] Cross-layer boundaries (route → auth/validation → Supabase or `lib/` service → response) are explicit.
- [x] Top-level navigation indexes all layers and no placeholder/TBD text remains in the new docs.
- [x] `git diff --check` passes; `npm run lint` / `npm run build` are attempted and any dependency limitation is recorded.
