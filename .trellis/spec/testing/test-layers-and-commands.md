# Test Layers and Commands

## Canonical commands

- `npm run lint`: ESLint across the repository, excluding build output.
- `npm run build`: Vinext production build and configured TypeScript verification.
- `npm run test:batch`: runs `scripts/run-sample-batch.mjs` against the 12 fixtures in `tests/fixtures/analysis-samples.json` and writes `tests/reports/analysis-batch-report.json`.
- `node --test tests/rendered-html.test.mjs`: checks route/UI/source contracts and worker-rendered HTML.
- `node --test tests/pdf-parser.test.mjs`: focused text-layer PDF layout, dynamic-section, AI-fallback and typed-error tests.
- `npm test`: full gate in order—build, batch contracts, then every `tests/*.test.mjs` Node test.
- `npm run test:isolation:live`: optional two-account Supabase boundary test; it requires live test credentials/tokens and is not part of the default offline gate.

## Test selection

Run the narrow relevant test while iterating, then `npm test` before completing behavior changes. Documentation-only changes require at least `git diff --check`; still attempt lint/build when dependencies are installed. Record environmental blockers rather than claiming a pass.

Tests in `tests/rendered-html.test.mjs` intentionally inspect implementation text for critical product contracts as well as rendered output. When refactoring, update an assertion only after verifying that the guarded behavior still exists. Do not weaken grounding, privacy or isolation checks just to make a refactor pass.
