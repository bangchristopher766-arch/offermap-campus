# Authentication and Account Isolation

Server routes extract the bearer token, call `createUserSupabase(token)`, and verify it with `supabase.auth.getUser()`. The resulting client carries the user's Authorization header so Supabase RLS applies. Reference `app/api/analyze/route.ts`, `app/api/resumes/route.ts`, and `app/api/positions/[id]/resume-binding/route.ts`.

Never trust a client-supplied `user_id`; derive it from the verified user. Check ownership before accessing nested resources or storage, and use 404-style “missing or unauthorized” responses to avoid account enumeration. Database RLS policies in `supabase/migrations/0001_offermap.sql` and `0004_role_profiles_and_resume_library.sql` remain mandatory even when routes filter by ID.

For changes to account-owned queries, run the normal tests and, when two valid test tokens are available, `npm run test:isolation:live`.
