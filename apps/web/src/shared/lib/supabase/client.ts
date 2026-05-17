import { createBrowserClient } from "@supabase/ssr";

/** Returns true when Supabase env is configured. */
export function isSupabaseConfigured(): boolean {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  );
}

/** Creates Supabase client for browser components. */
export function createClient() {
  if (!isSupabaseConfigured()) {
    throw new Error("Supabase is not configured");
  }
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}
