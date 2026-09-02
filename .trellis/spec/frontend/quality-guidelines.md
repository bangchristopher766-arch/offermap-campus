# Quality Guidelines

## Required checks

- Run `npm run lint` for static linting.
- Run `npm run build` for the Vinext/TypeScript production build.
- Run `npm test` for the full product check: build, analysis sample batch, and rendered HTML tests. For targeted analysis-contract work, `npm run test:batch` is available.

The commands are defined in `package.json`; `README.md` documents the same verification path.

## Product invariants

- Authenticate and verify the active Supabase user before accessing account-owned resources. Routes such as `app/api/analyze/route.ts` obtain the bearer token, create a user-scoped client, and return 401 if there is no user.
- Keep JD and resume source text attributable. Analysis output is validated and must be grounded in original text; do not emit invented quotes or opaque match scores.
- When AI configuration is absent, return the explicit `DEMO_MODE` contract rather than simulating a successful analysis.
- Keep resume PDFs private and access-controlled via the established storage helpers.

## Review checklist

- For complex domain workflows, does the change preserve the `app/` route → validation/auth → `lib/` domain-service boundary? For straightforward account-scoped resource routes, does it use the authenticated user-scoped Supabase client directly and consistently?
- Are request inputs validated and failures represented as client-safe responses?
- Are authenticated and demo-mode behaviors both considered where relevant?
- Are loading, error, and accessibility states present for changed UI actions?
- Did the relevant lint/build/test command pass, or is any environmental limitation recorded?

## Avoid

- Do not add dependencies or broad structural refactors for a narrow feature.
- Do not bypass account-scoped Supabase access with a privileged client in user-facing routes.
