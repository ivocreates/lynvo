"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { authClient } from "@/lib/auth-client";

const MIN_PASSWORD_LENGTH = 12;

export default function UpdatePasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token");
  const linkError = searchParams.get("error");
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

    if (!token) {
      setError("This page needs the link from your email. Request a new one below.");
      return;
    }

    setLoading(true);
    const { error: resetError } = await authClient.resetPassword({ newPassword: password, token });
    setLoading(false);

    if (resetError) {
      setError("That link has expired or was already used. Request a new one below.");
      return;
    }

    router.push("/admin/login?reset=1");
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="w-full max-w-sm rounded-card border border-border bg-surface p-8">
      <p className="section-stamp mb-2">ACCOUNT RECOVERY</p>
      <h1 className="font-display text-2xl font-semibold text-ink-900">Choose a new password</h1>
      {(linkError || !token) && (
        <p className="mt-4 rounded-card border border-warning/40 bg-warning/10 px-4 py-3 text-sm text-warning">
          {linkError ? "That link has expired or was already used." : "Open this page from the link in your email."}{" "}
          <Link href="/admin/reset-password" className="underline">
            Request a new link
          </Link>
          .
        </p>
      )}
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
