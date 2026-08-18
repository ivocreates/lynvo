import { createBrowserClient } from "@supabase/ssr";

/**
 * Browser client. The config is passed in rather than read from process.env so
 * it cannot be lost when the build environment differs from the runtime one —
 * see components/providers/supabase-config.tsx.
 */
export function createBrowserSupabase(url: string, anonKey: string) {
  return createBrowserClient(url, anonKey);
}
