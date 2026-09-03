# D1 and Drizzle Boundary

`db/index.ts`, `db/schema.ts`, `drizzle.config.ts`, and the D1 binding in `vite.config.ts` are part of the Vinext/Cloudflare starter integration. `getDb()` requires the `DB` binding, but current OfferMap API routes use `createUserSupabase` instead.

Do not model new product data in D1 or generate Drizzle migrations unless a separately approved task adopts D1 as an application store. Do not describe `db/schema.ts` as the production OfferMap schema. Supabase SQL under `supabase/migrations/` is the current source of truth.
