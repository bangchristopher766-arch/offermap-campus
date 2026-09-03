# Technical design

## Information architecture

Add six sibling directories under `.trellis/spec/`: `backend`, `data`, `ai-domain`, `deployment`, `security`, and `testing`. Each has an `index.md` plus focused guides; keep files small enough for task context injection. Reuse the existing frontend index style and the general thinking guides rather than creating a new hierarchy.

## Evidence and boundaries

Use route handlers in `app/api/`, helpers in `lib/`, migrations/storage in `supabase/`, runtime code in `worker/`, and scripts/tests as the source of truth. Explicitly distinguish direct user-scoped Supabase resource routes from complex workflows delegated to `lib/`.

## Compatibility

Documentation-only change. Do not alter application imports, runtime behavior, environment names, or database files. Existing frontend docs remain compatible and should be linked from the new top-level navigation.

## Risks and rollback

The main risk is documenting aspirational architecture or conflating D1 template code with Supabase production behavior. Mitigate with path-anchored examples and reviewer verification. Rollback is deleting the new `.trellis/spec` documents and reverting the navigation update.
