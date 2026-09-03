# AI Domain Guidelines

AI features produce structured, attributable job-preparation artifacts. Provider configuration and transport live in `lib/ai-client.ts`; domain orchestration and grounding live in `lib/analysis-engine.ts` and `lib/analysis-schema.ts`; sourced position research lives in `lib/web-research.ts`.

| Guide | Scope |
|---|---|
| [Provider and output contracts](./provider-and-output-contracts.md) | Configuration, calls, timeouts and parsing |
| [Grounding and research](./grounding-and-research.md) | Quotes, source IDs, privacy and cached research |
