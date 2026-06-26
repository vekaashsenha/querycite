import { createClient, type SupabaseClient } from "@supabase/supabase-js";

export type SupabasePublicConfig = {
  url: string;
  anonKey: string;
};

let browserClient: SupabaseClient | null = null;

export function getSupabasePublicConfig(): SupabasePublicConfig | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anonKey) return null;
  return { url, anonKey };
}

export function isSupabaseClientConfigured() {
  return Boolean(getSupabasePublicConfig());
}

export function getSupabaseBrowserClient() {
  const config = getSupabasePublicConfig();
  if (!config) return null;

  browserClient ??= createClient(config.url, config.anonKey, {
    auth: {
      autoRefreshToken: true,
      detectSessionInUrl: false,
      persistSession: true,
    },
  });

  return browserClient;
}
