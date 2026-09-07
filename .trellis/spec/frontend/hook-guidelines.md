# Hook Guidelines

## Current usage

There is no project-local `hooks/` directory and no custom-hook layer today. `app/components/OfferMapApp.tsx` uses React built-ins (`useState`, `useEffect`, `useMemo`, `useRef`) directly to own workspace state, derived display values, lifecycle work, and DOM references.

## Rules for changes

- Keep one-off stateful logic in the component that owns the screen; this matches the current application shape.
- Use `useMemo` only for values derived from existing state or props, and `useEffect` for synchronization/side effects such as session loading or request lifecycles.
- If a repeated stateful workflow emerges in multiple components, introduce a `use<Name>.ts` module only after checking that it has more than one real consumer. Keep its API typed and put API/domain work in `lib/`, not in the hook.
- Follow React Hooks lint rules. Do not suppress dependency warnings casually; make dependencies or callback identity explicit instead.

## Data fetching

The project currently fetches from `app/api/` directly in the client component rather than using React Query or SWR. Preserve loading, failure, and stale-result handling close to each request flow. Do not add a client cache library for a small change.

## Evidence

`app/components/OfferMapApp.tsx` imports and uses `useEffect`, `useMemo`, `useRef`, and `useState`; `package.json` contains no React Query, SWR, Redux, Zustand, or similar client-state dependency.
