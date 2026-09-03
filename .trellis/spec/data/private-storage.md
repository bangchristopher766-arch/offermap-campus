# Private Resume Storage

Resume PDFs use the private `resume-pdfs` bucket created in `supabase/migrations/0003_resume_versions.sql`. Storage paths begin with the authenticated user's ID, and select/insert/update/delete policies verify that first folder segment.

`lib/supabase-storage.ts` performs authenticated REST requests with the user's bearer token. Uploads are not considered complete until the stored object is read back and its byte length matches the original. Reads use the authenticated object endpoint; `app/api/resumes/[id]/pdf/route.ts` verifies login and record ownership before returning bytes.

Never make the bucket public, build paths from another user's input, log PDF bytes or bearer tokens, or replace ownership checks with possession of a storage path. Database deletion may return a storage cleanup warning, as shown in `app/api/resumes/[id]/route.ts`; preserve that partial-failure contract.
