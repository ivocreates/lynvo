"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Eye, EyeOff, Loader2, LockKeyhole } from "lucide-react";
import { authClient } from "@/lib/auth-client";
import logo from "@/assets/logo/Horizontal Logo/Light/Horizontal Logo Light Mode.png";

type Audience = "client" | "team";

const COPY: Record<Audience, { stamp: string; title: string; lead: string; points: string[]; help: string }> = {
  client: {
    stamp: "CLIENT PORTAL",
    title: "Your project, in one place",
    lead: "Sign in to follow your project with LYNVO.",
    points: [
      "Track progress, milestones and previews",
      "Approve deliverables or request changes",
      "Accept quotes and view invoices & receipts",
      "Read and sign agreements online",
    ],
    help: "No login yet? Your LYNVO project lead sends you an invite by email.",
  },
  team: {
    stamp: "LYNVO TEAM",
    title: "Welcome back to work",
    lead: "Sign in to the LYNVO workspace.",
    points: ["Tasks, goals and your HR documents", "Clients, quotes, invoices and payments", "Leads, calls and follow-ups", "Website content for lynvo.studio and lynvo.tech"],
    help: "Locked out? Use 'Forgot password', or ask an admin to resend your invite.",
  },
};

const ERRORS: Record<string, string> = {
  invalid_link: "That link is not valid. Request a new password reset email.",
  expired_link: "That link has expired or was already used. Request a new one.",
  unlinked: "Your client login isn't linked to a company yet. Please contact LYNVO.",
};

/** Same-site relative paths only, so ?next= cannot redirect elsewhere. */
const safeNext = (value: string | null) => (value && value.startsWith("/") && !value.startsWith("//") ? value : null);

export default function LoginPanel({ contactEmail }: { contactEmail?: string }) {
  const router = useRouter();
  const params = useSearchParams();
  const [audience, setAudience] = useState<Audience>(params.get("as") === "team" ? "team" : "client");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const copy = COPY[audience];
  const notice = ERRORS[params.get("error") ?? ""] ?? (params.get("unlinked") ? ERRORS.unlinked : null);
  const resetDone = params.get("reset") === "1";

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError(null);
    const form = new FormData(event.currentTarget);
    const { error: signInError } = await authClient.signIn.email({
      email: String(form.get("email")).trim(),
      password: String(form.get("password")),
    });
    if (signInError) {
      setLoading(false);
      setError(signInError.status === 429 ? "Too many attempts. Wait a minute and try again." : "That email and password don't match.");
      return;
    }
    // /auth/landing sends clients to their portal and the team to their workspace.
    router.push(safeNext(params.get("next")) ?? "/auth/landing");
    router.refresh();
  }

  return (
    <div className="grid w-full max-w-4xl overflow-hidden rounded-2xl border border-border bg-surface shadow-xl shadow-ink-900/10 md:grid-cols-[1fr_1.05fr]">
      <aside className="relative hidden flex-col justify-between overflow-hidden bg-ink-900 p-10 text-text-inverse md:flex">
        <div aria-hidden="true" className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-brand-500/40 blur-3xl" />
        <div aria-hidden="true" className="pointer-events-none absolute -bottom-28 -left-20 h-72 w-72 rounded-full bg-clay-500/30 blur-3xl" />
        <div className="relative">
          <Image src={logo} alt="LYNVO" height={36} className="h-9 w-auto brightness-0 invert" priority />
          <p className="mt-10 font-mono text-[11px] uppercase tracking-[0.2em] text-sage-500">{copy.stamp}</p>
          <h2 className="mt-3 font-display text-3xl font-semibold leading-tight">{copy.title}</h2>
          <ul className="mt-8 space-y-3 text-sm text-text-inverse/80">
            {copy.points.map((point) => (
              <li key={point} className="flex gap-3">
                <span aria-hidden="true" className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-sage-500" />
                {point}
              </li>
            ))}
          </ul>
        </div>
        <p className="relative mt-10 flex items-center gap-2 text-xs text-text-inverse/60">
          <LockKeyhole aria-hidden="true" className="h-3.5 w-3.5" /> Secured on Cloudflare. Your password is never stored in plain text.
        </p>
      </aside>

      <div className="p-8 sm:p-10">
        <Image src={logo} alt="LYNVO" height={32} className="h-8 w-auto md:hidden" priority />

        <div role="tablist" aria-label="Who is signing in" className="mt-6 grid grid-cols-2 rounded-card border border-border bg-canvas-warm p-1 text-sm md:mt-0">
          {(["client", "team"] as Audience[]).map((value) => (
            <button
              key={value}
              type="button"
              role="tab"
              aria-selected={audience === value}
              onClick={() => {
                setAudience(value);
                setError(null);
              }}
              className={`rounded-[6px] px-3 py-2 font-medium transition-colors ${
                audience === value ? "bg-surface text-ink-900 shadow-sm" : "text-text-primary/60 hover:text-ink-900"
              }`}
            >
              {value === "client" ? "Client portal" : "Team"}
            </button>
          ))}
        </div>

        <h1 className="mt-8 font-display text-2xl font-semibold text-ink-900">Sign in</h1>
        <p className="mt-1 text-sm text-text-primary/70">{copy.lead}</p>

        {resetDone && (
          <p role="status" className="mt-5 rounded-card border border-success/40 bg-success/10 px-4 py-3 text-sm text-success">
            Password updated. Sign in with your new password.
          </p>
        )}
        {notice && (
          <p role="alert" className="mt-5 rounded-card border border-warning/40 bg-warning/10 px-4 py-3 text-sm text-warning">
            {notice}
          </p>
        )}

        <form onSubmit={submit} className="mt-6 space-y-4">
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
              placeholder={audience === "client" ? "you@yourcompany.com" : "you@lynvo.studio"}
              className="mt-1 w-full rounded-card border border-border bg-surface px-3 py-2.5 text-sm focus:border-brand-700 focus:outline-none focus:ring-2 focus:ring-brand-700/15"
            />
          </div>
          <div>
            <div className="flex items-center justify-between">
              <label htmlFor="password" className="block text-sm font-medium text-ink-900">
                Password
              </label>
              <Link href="/admin/reset-password" className="text-xs text-brand-700 underline underline-offset-2">
                Forgot password?
              </Link>
            </div>
            <div className="relative mt-1">
              <input
                id="password"
                name="password"
                type={showPassword ? "text" : "password"}
                required
                autoComplete="current-password"
                className="w-full rounded-card border border-border bg-surface px-3 py-2.5 pr-10 text-sm focus:border-brand-700 focus:outline-none focus:ring-2 focus:ring-brand-700/15"
              />
              <button
                type="button"
                onClick={() => setShowPassword((value) => !value)}
                aria-label={showPassword ? "Hide password" : "Show password"}
                className="absolute inset-y-0 right-0 flex w-10 items-center justify-center text-text-primary/50 hover:text-ink-900"
              >
                {showPassword ? <EyeOff aria-hidden="true" className="h-4 w-4" /> : <Eye aria-hidden="true" className="h-4 w-4" />}
              </button>
            </div>
          </div>

          {error && (
            <p role="alert" className="text-sm text-error">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="flex w-full items-center justify-center gap-2 rounded-card bg-ink-900 px-4 py-3 text-sm font-medium text-text-inverse transition-colors hover:bg-brand-700 disabled:opacity-60"
          >
            {loading && <Loader2 aria-hidden="true" className="h-4 w-4 animate-spin" />}
            {loading ? "Signing in..." : audience === "client" ? "Open my portal" : "Sign in to workspace"}
          </button>
        </form>

        <p className="mt-6 text-xs leading-5 text-text-primary/60">
          {copy.help}
          {audience === "client" && contactEmail && (
            <>
              {" "}
              <a href={`mailto:${contactEmail}`} className="text-brand-700 underline">
                {contactEmail}
              </a>
            </>
          )}
        </p>
      </div>
    </div>
  );
}
