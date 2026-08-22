"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createBrowserSupabase } from "@/lib/supabase/client";
import { useSupabaseConfig } from "@/components/providers/supabase-config";

/**
 * Supabase's default email links return the session in the URL fragment, which
 * a server route can never see. This picks the tokens up in the browser,
 * establishes the session, then hands off to the role-aware landing route.
 */
export default function LinkSessionHandler() {
  const router = useRouter();
  const { url, anonKey } = useSupabaseConfig();
  const [status, setStatus] = useState<{ tone: "info" | "error"; text: string } | null>(null);

  useEffect(() => {
    const raw = window.location.hash.replace(/^#/, "");
    if (!raw) return;

    const params = new URLSearchParams(raw);
    const clearHash = () =>
      window.history.replaceState(null, "", window.location.pathname + window.location.search);

    if (params.get("error_description") || params.get("error")) {
      clearHash();
      setStatus({ tone: "error", text: "That link has expired or was already used. Request a new one." });
      return;
    }

    const accessToken = params.get("access_token");
    const refreshToken = params.get("refresh_token");
    if (!accessToken || !refreshToken) return;

    const type = params.get("type");
    setStatus({ tone: "info", text: "Signing you in…" });

    createBrowserSupabase(url, anonKey)
      .auth.setSession({ access_token: accessToken, refresh_token: refreshToken })
      .then(({ error }) => {
        clearHash();

        if (error) {
          setStatus({ tone: "error", text: "That link has expired. Request a new one." });
          return;
        }

        router.push(type === "recovery" || type === "invite" ? "/admin/update-password" : "/auth/landing");
        router.refresh();
      });
  }, [url, anonKey, router]);

  if (!status) return null;

  return (
    <p
      role="status"
      className={`mb-4 w-full max-w-sm rounded-card border px-4 py-3 text-sm ${
        status.tone === "error"
          ? "border-error/40 bg-error/10 text-error"
          : "border-border bg-surface text-text-primary/80"
      }`}
    >
      {status.text}
    </p>
  );
}
