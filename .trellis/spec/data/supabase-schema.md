# Supabase Schema and Migrations

## Source of truth

Add schema changes as a new numbered SQL file under `supabase/migrations/`; do not rewrite an applied migration. The current sequence is `0001_offermap.sql` through `0004_role_profiles_and_resume_library.sql`.

## Ownership

Account-owned tables carry `user_id`, enable RLS, and use policies based on `auth.uid() = user_id`. `0001_offermap.sql` establishes the general pattern; `0002_application_tracking.sql` and `0004_role_profiles_and_resume_library.sql` extend it. Shared role taxonomy/profile tables are authenticated-read rather than user-owned.

## Historical integrity

The domain preserves facts over time: application changes create events; resume edits create immutable versions; bindings, submissions and analysis snapshots record the version used. See `0002_application_tracking.sql`, `0003_resume_versions.sql`, and `0004_role_profiles_and_resume_library.sql`. Do not update historical evidence to make it look current.

## Change checklist

- Add constraints, indexes, timestamps and RLS policies together with a new table.
- Update every route/query/type consuming a changed field.
- Preserve account isolation in both SQL policies and application queries.
- Do not expose service-role credentials to client or route code.
