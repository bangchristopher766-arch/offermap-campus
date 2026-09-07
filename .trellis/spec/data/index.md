# Data Guidelines

Supabase is the production application data source. SQL migrations define relational data and RLS; private resume PDFs live in Supabase Storage. The root `db/` D1/Drizzle integration belongs to the hosting template and is not currently used by application routes.

| Guide | Scope |
|---|---|
| [Supabase schema](./supabase-schema.md) | Migrations, RLS, history and immutable snapshots |
| [Private storage](./private-storage.md) | Resume PDF paths, upload verification and authenticated reads |
| [D1 boundary](./d1-boundary.md) | Hosting binding and non-production status |
