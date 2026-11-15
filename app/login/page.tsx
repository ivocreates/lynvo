import { Suspense } from "react";
import { redirect } from "next/navigation";
import type { Metadata } from "next";
import LoginPanel from "@/components/auth/login-panel";
import { getCurrentProfile } from "@/lib/auth";
import { getSiteSettings, settingsMap } from "@/lib/queries";

export const metadata: Metadata = {
  title: "Sign in",
  description: "Sign in to the LYNVO client portal or team workspace.",
  robots: { index: false, follow: false },
};

// Reads the session on every request.
export const dynamic = "force-dynamic";

export default async function LoginPage() {
  // Already signed in: go straight to the right workspace.
  if (await getCurrentProfile()) redirect("/auth/landing");

  const settings = settingsMap(await getSiteSettings());

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-canvas-warm px-4 py-12">
      <div aria-hidden="true" className="pointer-events-none absolute inset-0">
        <div className="absolute -left-40 top-0 h-[28rem] w-[28rem] rounded-full bg-brand-500/15 blur-3xl" />
        <div className="absolute -right-32 bottom-0 h-[26rem] w-[26rem] rounded-full bg-sand-400/40 blur-3xl" />
      </div>
      <div className="relative w-full max-w-4xl">
        <Suspense fallback={null}>
          <LoginPanel contactEmail={settings.contact_email || undefined} />
        </Suspense>
        <p className="mt-6 text-center text-xs text-text-primary/60">
          LYNVO Creative Solutions LLP ·{" "}
          <a href="https://lynvo.studio" className="underline underline-offset-2">
            lynvo.studio
          </a>{" "}
          ·{" "}
          <a href="https://lynvo.tech" className="underline underline-offset-2">
            lynvo.tech
          </a>
        </p>
      </div>
    </main>
  );
}
