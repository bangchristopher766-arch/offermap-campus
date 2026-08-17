"use client";

import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { SupabasePublicConfig } from "@/lib/supabase-config";

let browserClient: SupabaseClient | null = null;
let browserClientSignature = "";

export function isSupabaseConfigured(config?: SupabasePublicConfig | null) {
  return Boolean(config?.url && config.publishableKey);
}

export function getBrowserSupabase(config?: SupabasePublicConfig | null) {
  if (!isSupabaseConfigured(config)) return null;
  const signature = `${config?.url}:${config?.publishableKey}`;
  if (!browserClient || browserClientSignature !== signature) {
    browserClient = createClient(
      config?.url as string,
      config?.publishableKey as string,
      { auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true } },
    );
    browserClientSignature = signature;
  }
  return browserClient;
}
