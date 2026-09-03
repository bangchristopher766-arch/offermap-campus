# Provider and Output Contracts

`lib/ai-client.ts` selects the configured OpenAI-compatible provider from `AI_PROVIDER`, reads `AI_API_KEY`, and resolves `AI_MODEL` plus optional `AI_BASE_URL`. `lib/analysis-engine.ts` may select `AI_REASONING_MODEL` or `AI_FAST_MODEL` for purpose-specific work.

Model output is an untrusted boundary. Define an explicit Zod schema, request structured JSON, parse it, and reject invalid output before persistence or display. `lib/analysis-schema.ts` and `lib/web-research.ts` are reference implementations.

Keep provider secrets server-only. Return provider/model/duration/usage metadata only where the endpoint already exposes it. Preserve abort/timeout behavior and map upstream failures to the route's established 502/503/504 semantics.

Do not add provider-specific request logic to React components, accept markdown when a JSON contract exists, or silently fabricate results in demo mode.
