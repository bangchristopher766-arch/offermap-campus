import { createClient } from "@supabase/supabase-js";

export function createUserSupabase(accessToken?: string) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) throw new Error("Supabase 尚未配置");
  return createClient(url, anonKey, accessToken ? { global: { headers: { Authorization: `Bearer ${accessToken}` } } } : undefined);
}
