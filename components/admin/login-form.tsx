"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { createBrowserSupabase } from "@/lib/supabase/client";
import { useSupabaseConfig } from "@/components/providers/supabase-config";

const LINK_ERRORS: Record<string, string> = {
  invalid_link: "That link is not valid. Request a new password reset email.",
  expired_link: "That link has expired or was already used. Request a new one.",
};

export default function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const config = useSupabaseConfig();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const linkError = LINK_ERRORS[searchParams.get("error") ?? ""] ?? null;
  const setupRequired = searchParams.get("setup") === "1";

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError(null);

    const formData = new FormData(event.currentTarget);
    const email = String(formData.get("email"));
    const password = String(formData.get("password"));

    const supabase = createBrowserSupabase(config.url, config.anonKey);
    const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });

    setLoading(false);

    if (signInError) {
      setError("Invalid email or password.");
      return;
    }

    // The destination layout redirects staff, interns, and clients onwards.
    router.push("/admin");
    router.refresh();
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="w-full max-w-sm rounded-card border border-border bg-surface p-8"
    >
      <p className="section-stamp mb-2">ADMIN ACCESS</p>
      <h1 className="font-display text-2xl font-semibold text-ink-900">Sign in</h1>
      {setupRequired && (
        <p className="mt-4 rounded-card border border-warning/40 bg-warning/10 px-4 py-3 text-sm text-warning">
          Supabase is not configured for this Cloudflare deployment. Add the Supabase URL and publishable key to the Worker build and runtime variables.
        </p>
      )}
      <div className="mt-6 space-y-4">
        <div>
          <label htmlFor="email" className="block text-sm font-medium text-ink-900">
            Email
          </label>
          <input
            id="email"
            name="email"
            type="email"
            required
            autoComplete="email"
            className="mt-1 w-full rounded-card border border-border px-3 py-2 text-sm focus:border-brand-700 focus:outline-none"
          />
        </div>
        <div>
          <label htmlFor="password" className="block text-sm font-medium text-ink-900">
            Password
          </label>
          <input
            id="password"
            name="password"
            type="password"
            required
            autoComplete="current-password"
            className="mt-1 w-full rounded-card border border-border px-3 py-2 text-sm focus:border-brand-700 focus:outline-none"
          />
        </div>
      </div>
      {(error || linkError) && (
        <p className="mt-4 text-sm text-error" role="alert">
          {error ?? linkError}
        </p>
      )}
      <button
        type="submit"
        disabled={loading}
        className="mt-6 w-full rounded-card bg-brand-700 px-4 py-2 text-sm font-medium text-text-inverse hover:bg-ink-900 disabled:opacity-60"
      >
        {loading ? "Signing in..." : "Sign in"}
      </button>
      <Link
        href="/admin/reset-password"
        className="mt-4 block text-center text-sm text-brand-700 underline"
      >
        Forgot your password?
      </Link>
    </form>
  );
}
