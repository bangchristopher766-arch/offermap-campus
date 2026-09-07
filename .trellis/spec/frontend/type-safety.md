# Type Safety

## TypeScript and validation

Use TypeScript for application code and Zod for runtime validation at untrusted boundaries. `lib/analysis-schema.ts` defines the request contract consumed by `app/api/analyze/route.ts`, where `safeParse` produces a structured 400 response instead of allowing malformed data to reach AI orchestration.

## Type placement

- Keep component-specific view and API response types near their consumer, as in `app/components/OfferMapApp.tsx`.
- Keep reusable request schemas and inferred domain contracts in `lib/`, adjacent to the service that uses them.
- Model finite states as string unions, e.g. `AnalysisRunKind`, `ApplicationStage`, and explicit processing statuses.
- Account for Supabase relation shapes that may be one object or an array where the generated query shape requires it; narrow before reading fields.

## Boundary rules

- Validate `request.json()` data before use; return a useful client error on validation failure.
- Narrow `unknown` errors with `instanceof Error` before reading `.message`, as done in `app/api/analyze/route.ts`.
- Avoid `any`, broad assertions, and silently assumed JSON shapes. Prefer an explicit type or Zod schema.

## Evidence

`lib/analysis-schema.ts`, `app/api/analyze/route.ts`, and the strongly typed API records at the beginning of `app/components/OfferMapApp.tsx` are the reference patterns.
