# Component Guidelines

## Current component model

The product currently uses a single large client component, `app/components/OfferMapApp.tsx`, to coordinate navigation, API calls, modal state, and rendering for the application workspace. Route pages are thin adapters. Match this model for focused changes; do not introduce a component framework or state library without a separately approved refactor.

## Props and types

- Define UI-specific TypeScript types close to the consuming component. `OfferMapApp.tsx` declares view, request, response, and display types at the top of the module.
- Use explicit object prop types and discriminated string unions for finite UI states. Avoid `any` and untyped JSON response access.
- Import shared infrastructure types only when they are actually shared, as with `Session` from Supabase.

## Styling and interaction

- Use the existing global CSS class system in `app/globals.css`; do not add a CSS-in-JS dependency for local changes.
- Use `lucide-react` for interface icons, following the current imports in `OfferMapApp.tsx`.
- Keep full-document navigation intentional for Vinext dynamic routes. `OfferMapApp.tsx` documents its targeted disablement of the Next link lint rule.
- Buttons, dialogs, forms, loading and error states must remain keyboard-operable and have text or an accessible label. Existing interactive flows use visible status copy such as the analysis and upload error states.

## Avoid

- Do not move domain validation, Supabase calls, or AI orchestration into visual render branches.
- Do not duplicate the same API response shape across unrelated modules when a shared domain type is justified; first search the existing component and `lib/` types.
