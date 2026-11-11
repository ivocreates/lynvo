import Link from "next/link";
import { TECH_SOLUTIONS, techHref } from "@/lib/tech-site";

export const metadata = {
  title: "Solutions for small businesses",
  description: "Billing and inventory, bookings, customer portals, staff apps, AI assistants and dashboards — tailored to your business.",
};

export default function TechSolutionsPage() {
  return (
    <div>
      <section className="bg-ink-900 text-text-inverse">
        <div className="container-page py-20">
          <p className="font-mono text-xs uppercase tracking-[0.22em] text-sage-500">SOLUTIONS</p>
          <h1 className="mt-4 max-w-3xl font-display text-4xl font-semibold sm:text-5xl">Proven building blocks, tailored to you</h1>
          <p className="mt-5 max-w-2xl text-text-inverse/75">
            We start from foundations we have already built and tested, then shape them around your workflow. You get custom software
            in weeks, not months — and at a small-business price.
          </p>
        </div>
      </section>

      <section className="container-page py-16">
        <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          {TECH_SOLUTIONS.map((solution) => (
            <div key={solution.title} className="archive-card flex flex-col p-6">
              <h2 className="font-display text-lg font-semibold text-ink-900">{solution.title}</h2>
              <p className="mt-2 flex-1 text-sm leading-6 text-text-primary/75">{solution.text}</p>
              <p className="mt-4 font-mono text-xs uppercase tracking-wide text-brand-500">For: {solution.for}</p>
            </div>
          ))}
        </div>

        <div className="mt-12 grid gap-6 rounded-card border border-border bg-surface p-8 md:grid-cols-3">
          <div>
            <p className="font-display text-3xl font-semibold text-ink-900">You own it</p>
            <p className="mt-2 text-sm text-text-primary/75">Source code and data are transferred to you on final payment.</p>
          </div>
          <div>
            <p className="font-display text-3xl font-semibold text-ink-900">Or license it</p>
            <p className="mt-2 text-sm text-text-primary/75">Prefer a lower upfront cost? Use a ready platform on an annual licence.</p>
          </div>
          <div>
            <p className="font-display text-3xl font-semibold text-ink-900">Supported</p>
            <p className="mt-2 text-sm text-text-primary/75">Care plans cover updates, backups, security patches and small changes.</p>
          </div>
        </div>

        <div className="mt-12 text-center">
          <Link href={techHref("/contact")} className="rounded-card bg-ink-900 px-6 py-3 text-sm font-medium text-text-inverse hover:bg-brand-700">
            Tell us what you need
          </Link>
        </div>
      </section>
    </div>
  );
}
