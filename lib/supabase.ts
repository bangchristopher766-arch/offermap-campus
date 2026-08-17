import { createClient } from "@supabase/supabase-js";

export function createUserSupabase(accessToken?: string) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !publishableKey) throw new Error("Supabase 尚未配置");
  return createClient(url, publishableKey, accessToken ? { global: { headers: { Authorization: `Bearer ${accessToken}` } } } : undefined);
}
