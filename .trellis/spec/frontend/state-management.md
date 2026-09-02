# State Management

## Current model

State is local React state in `app/components/OfferMapApp.tsx`. It holds active navigation, authenticated/demo account context, API-loaded entities, form/modal state, and in-flight analysis state. Derived values are calculated with `useMemo`; persistence goes through resource API routes.

## State boundaries

- Keep transient UI state (open dialogs, filters, drafts, loading and errors) in local component state.
- Treat Supabase-backed entities as server state. Read and write them only through existing `app/api/` routes so authorization and account isolation remain server-enforced.
- Preserve the dual-mode contract: without public Supabase configuration the UI uses demonstration data; with both values configured it uses the authenticated account. See `lib/supabase-browser.ts` and `lib/supabase-config.ts`.
- Use URL routes for shareable screen/location state; `OfferMapView` is mapped to `/workspace`, `/resume`, `/positions`, and `/map` in `OfferMapApp.tsx`.

## Do not add global state by default

There is no global client store. Do not introduce Redux, Zustand, context-based data caches, or a new state library for a local screen change. Propose a design first if state must span independently mounted components.

## Evidence

`app/components/OfferMapApp.tsx` owns the workspace state with React hooks. `app/api/positions/[id]/application/route.ts` and the other resource routes own persistent mutations.
