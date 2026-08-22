"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createBrowserSupabase } from "@/lib/supabase/client";
import { useSupabaseConfig } from "@/components/providers/supabase-config";

const MIN_PASSWORD_LENGTH = 12;

export default function UpdatePasswordForm() {
  const router = useRouter();
  const config = useSupabaseConfig();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    const formData = new FormData(event.currentTarget);
    const password = String(formData.get("password"));
    const confirmPassword = String(formData.get("confirmPassword"));

    if (password.length < MIN_PASSWORD_LENGTH) {
      setError(`Password must be at least ${MIN_PASSWORD_LENGTH} characters.`);
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);
    const supabase = createBrowserSupabase(config.url, config.anonKey);
    const { error: updateError } = await supabase.auth.updateUser({ password });
    setLoading(false);

    if (updateError) {
      setError("Could not update the password. Request a new reset link and try again.");
      return;
    }

    router.push("/auth/landing");
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="w-full max-w-sm rounded-card border border-border bg-surface p-8">
      <p className="section-stamp mb-2">ACCOUNT RECOVERY</p>
      <h1 className="font-display text-2xl font-semibold text-ink-900">Choose a new password</h1>
      <div className="mt-6 space-y-4">
        <div>
          <label htmlFor="password" className="block text-sm font-medium text-ink-900">
            New password
          </label>
          <input
            id="password"
            name="password"
            type="password"
            required
            minLength={MIN_PASSWORD_LENGTH}
            autoComplete="new-password"
            className="mt-1 w-full rounded-card border border-border px-3 py-2 text-sm focus:border-brand-700 focus:outline-none"
          />
          <p className="mt-1 text-xs text-text-primary/60">At least {MIN_PASSWORD_LENGTH} characters.</p>
        </div>
        <div>
          <label htmlFor="confirmPassword" className="block text-sm font-medium text-ink-900">
            Confirm password
          </label>
          <input
            id="confirmPassword"
            name="confirmPassword"
            type="password"
            required
            minLength={MIN_PASSWORD_LENGTH}
            autoComplete="new-password"
            className="mt-1 w-full rounded-card border border-border px-3 py-2 text-sm focus:border-brand-700 focus:outline-none"
          />
        </div>
      </div>
      {error && (
        <p className="mt-4 text-sm text-error" role="alert">
          {error}
        </p>
      )}
      <button
        type="submit"
        disabled={loading}
        className="mt-6 w-full rounded-card bg-brand-700 px-4 py-2 text-sm font-medium text-text-inverse hover:bg-ink-900 disabled:opacity-60"
      >
        {loading ? "Updating..." : "Update password"}
      </button>
    </form>
  );
}
