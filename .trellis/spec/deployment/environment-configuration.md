# Environment Configuration

Public browser configuration uses `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` (with the existing anon-key fallback). Both must be present before `lib/supabase-config.ts` enables authenticated mode; otherwise the application remains in demo mode.

Server-only configuration includes `AI_PROVIDER`, `AI_API_KEY`, `AI_MODEL`, optional `AI_BASE_URL`, optional purpose-specific model names, and `TAVILY_API_KEY`. The canonical setup and deployment list is in `README.md`.

Never expose AI or Tavily keys through `NEXT_PUBLIC_` names, commit `.env.local`, or assume configuration exists. Feature endpoints must return their explicit unavailable/demo response. When adding a variable, update its single config reader and `README.md`; search all current names before changing them.
