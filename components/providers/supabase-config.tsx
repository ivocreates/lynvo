"use client";

import { createContext, useContext } from "react";

type SupabaseConfig = { url: string; anonKey: string };

const SupabaseConfigContext = createContext<SupabaseConfig | null>(null);

/**
 * Carries the Supabase config from the server to browser code.
 *
 * NEXT_PUBLIC_* values are inlined into the client bundle at build time, so a
 * deploy whose *build* step lacks them ships a bundle with `undefined` baked in
 * even when the runtime is configured correctly. Passing the values down at
 * request time removes that dependency.
 */
export function SupabaseConfigProvider({
  config,
  children,
}: {
  config: SupabaseConfig;
  children: React.ReactNode;
}) {
  return <SupabaseConfigContext.Provider value={config}>{children}</SupabaseConfigContext.Provider>;
}

export function useSupabaseConfig(): SupabaseConfig {
  const config = useContext(SupabaseConfigContext);

  if (!config?.url || !config?.anonKey) {
    throw new Error(
      "Supabase is not configured. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY in the Worker runtime variables."
    );
  }

  return config;
}
