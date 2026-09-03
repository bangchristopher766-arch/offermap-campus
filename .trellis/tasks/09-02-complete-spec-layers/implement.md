# Implementation plan

1. Inspect representative API, Supabase, AI, worker, and test files; record only observed conventions.
2. Create six spec-layer indexes and focused guideline documents with examples and anti-patterns.
3. Update the spec navigation/index to link every layer and preserve the existing frontend guidance.
4. Run `git diff --check`, attempt `npm run lint`, and attempt `npm run build`; record missing dependency limitations.
5. Run the Trellis quality check, correct factual drift, then present the final planning/implementation result.

Validation: `git diff --check`; `npm run lint`; `npm run build`.
Rollback point: before adding the new spec directories; no product source files should be dirty.
