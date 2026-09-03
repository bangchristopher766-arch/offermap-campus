# Vinext and Cloudflare Worker

`vite.config.ts` composes React/Vinext with the Cloudflare and Sites plugins. `worker/index.ts` is the deployment entry: it handles `/_vinext/image` with Cloudflare Images and delegates all other requests to `vinext/server/app-router-entry`.

Keep Worker bindings reflected in the `Env` interface and hosting configuration. Do not add Node-only APIs to files or routes intended for the edge runtime. Handlers that explicitly declare `export const runtime = "edge"`, such as `app/api/analyze/route.ts`, must keep edge-compatible dependencies.

Use the package scripts as the canonical lifecycle: `npm run dev`, `npm run build`, and `npm run start`. They set `WRANGLER_LOG_PATH` and invoke Vinext; avoid bypassing them in documentation or automation.
