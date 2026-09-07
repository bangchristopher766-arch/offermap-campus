# API Route Conventions

## Handler shape

- Place handlers at `app/api/<resource>/route.ts` or `app/api/<resource>/[id]/.../route.ts` and export HTTP verb functions.
- Read bearer credentials from `Authorization`, create a user-scoped client with `createUserSupabase`, and call `supabase.auth.getUser()` before account-owned work. Examples: `app/api/analyze/route.ts` and `app/api/companies/[id]/positions/route.ts`.
- Parse untrusted JSON with `.catch(() => null)` and validate with Zod `safeParse`. Return a 400 with a stable, user-facing error; include flattened details only where the current endpoint contract does so.
- Return JSON through `Response.json`. Existing status meanings include 401 unauthenticated, 404 missing-or-not-owned, 409 invalid workflow state, 422 unsupported document content, 502 upstream AI failure, and 503 missing service/database configuration.
- Narrow thrown values with `error instanceof Error` before reading `.message`.

## Ownership and errors

Queries must be scoped by both the authenticated user's RLS context and the resource relationship or identifier. Deliberately use combined messages such as “不存在或无权访问” so endpoints do not reveal another account's records; see `app/api/positions/[id]/route.ts` and `app/api/resumes/[id]/route.ts`.

## Avoid

- Do not trust an ID merely because it appears in a route parameter.
- Do not accept raw request JSON without runtime validation.
- Do not return a successful AI result when provider configuration is absent; `app/api/analyze/route.ts` returns the explicit `DEMO_MODE` contract.
