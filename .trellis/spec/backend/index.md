# Backend Guidelines

The backend is implemented as Next/Vinext App Router handlers under `app/api/`. Straightforward resource routes access a bearer-token-scoped Supabase client directly; complex AI and parsing workflows delegate reusable work to `lib/`.

| Guide | Scope |
|---|---|
| [API routes](./api-routes.md) | Handler structure, authentication, validation and responses |
| [Service boundaries](./service-boundaries.md) | When routes query Supabase directly and when they delegate |
