"use client";

import { useState } from "react";
import Link from "next/link";
import { createBrowserSupabase } from "@/lib/supabase/client";
import { useSupabaseConfig } from "@/components/providers/supabase-config";

export default function ResetPasswordForm() {
  const config = useSupabaseConfig();
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);

    const email = String(new FormData(event.currentTarget).get("email"));
    const supabase = createBrowserSupabase(config.url, config.anonKey);

    await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/confirm?next=/admin/update-password`,
    });

    setLoading(false);
    // Always report success so the form cannot be used to enumerate accounts.
    setSubmitted(true);
  }

  return (
    <div className="w-full max-w-sm rounded-card border border-border bg-surface p-8">
      <p className="section-stamp mb-2">ACCOUNT RECOVERY</p>
      <h1 className="font-display text-2xl font-semibold text-ink-900">Reset password</h1>

      {submitted ? (
        <p className="mt-6 text-sm text-text-primary/80" role="status">
          If an account exists for that address, we&apos;ve sent a password reset link. Check your
          inbox and spam folder.
        </p>
      ) : (
        <form onSubmit={handleSubmit}>
          <p className="mt-2 text-sm text-text-primary/70">
            Enter your email and we&apos;ll send you a reset link.
          </p>
          <div className="mt-6">
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
          <button
            type="submit"
            disabled={loading}
            className="mt-6 w-full rounded-card bg-brand-700 px-4 py-2 text-sm font-medium text-text-inverse hover:bg-ink-900 disabled:opacity-60"
          >
            {loading ? "Sending..." : "Send reset link"}
          </button>
        </form>
      )}

      <Link href="/admin/login" className="mt-6 block text-sm text-brand-700 underline">
        Back to sign in
      </Link>
    </div>
  );
}
