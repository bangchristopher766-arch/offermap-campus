# Untrusted Inputs and Secrets

Validate request JSON with Zod, bound uploaded PDFs by size/type, and reject encrypted, scanned or insufficient-text documents according to the existing resume endpoints. Do not interpolate raw JD, resume or search text into trusted prompt instructions; retain the labeled data boundaries used by `lib/analysis-engine.ts` and `lib/web-research.ts`.

Verify all AI quotes against original input and all research references against known source IDs. The fixture batch in `scripts/run-sample-batch.mjs` also checks for prompt leakage and personal-data-like output patterns.

Keep `AI_API_KEY` and `TAVILY_API_KEY` server-only, do not log bearer tokens or document contents, and do not introduce service-role credentials into user-facing routes. Supabase publishable keys are public configuration but still require authenticated user tokens and RLS for protection.
