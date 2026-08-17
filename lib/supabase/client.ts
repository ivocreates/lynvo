import { createBrowserClient } from "@supabase/ssr";

// Swap to createBrowserClient<Database> once real generated types replace lib/supabase/types.ts.
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}
