import Link from "next/link";
import SectionStamp from "@/components/ui/section-stamp";
import ArchiveCard from "@/components/ui/archive-card";
import { getStats, getTeamMembers } from "@/lib/queries";

export const metadata = { title: "About" };

export default async function AboutPage() {
  const [stats, team] = await Promise.all([getStats(), getTeamMembers()]);
  const founder = team[0];

  return (
    <div className="container-page py-20">
      <SectionStamp label="ABOUT LYNVO" />
      <div className="grid gap-10 lg:grid-cols-[1.1fr_0.9fr] lg:items-start">
        <div>
          <h1 className="font-display text-3xl font-semibold text-ink-900 sm:text-4xl">Our story</h1>
          <p className="mt-6 max-w-2xl text-text-primary/80">
            Lynvo was founded by Ivo Pereira, a Full-Stack Developer, Cybersecurity Analyst, and Web3 Engineer from Sawantwadi, India.
            The studio exists to bridge the gap between strong ideas and dependable execution.
          </p>
          <p className="mt-4 max-w-2xl text-text-primary/80">
            We work across design, development, security, and growth so the same team that shapes the idea can also ship, harden, and evolve it.
          </p>
          <div className="mt-10 grid gap-6 sm:grid-cols-3">
            {[
              ["2022", "Studio founded"],
              ["2025", "Expanded to Web3"],
              ["2026", "Lynvo v2 launched"],
            ].map(([year, label]) => (
              <div key={year} className="rounded-card border border-border bg-surface p-5">
                <p className="section-stamp">{year}</p>
                <p className="mt-2 font-display text-lg font-semibold text-ink-900">{label}</p>
              </div>
            ))}
          </div>
          {stats.length > 0 && (
            <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {stats.slice(0, 4).map((stat) => (
                <div key={stat.id} className="rounded-card border border-border bg-surface p-5">
                  <p className="font-display text-3xl font-semibold text-ink-900">
                    {stat.value}
                    {stat.suffix}
                  </p>
                  <p className="section-stamp mt-2">{stat.label}</p>
                </div>
              ))}
            </div>
          )}
        </div>
        <div className="space-y-6">
          <ArchiveCard title="Founder" meta="THE PERSON BEHIND LYNVO">
            {founder ? (
              <div>
                <p>{founder.display_name}</p>
                <p className="mt-2 text-sm text-text-primary/80">{founder.bio}</p>
                {founder.skills?.length ? <p className="mt-3 text-xs uppercase tracking-[0.18em] text-brand-700">{founder.skills.join(" / ")}</p> : null}
              </div>
            ) : (
              <p>No active team members yet.</p>
            )}
          </ArchiveCard>
          <ArchiveCard title="Approach" meta="WHAT WE BELIEVE">
            <p>
              End-to-end thinking, long-term vision, security-first implementation, and performance-led iteration.
            </p>
          </ArchiveCard>
          <Link href="/contact" className="inline-flex rounded-card bg-brand-700 px-5 py-3 text-sm font-medium text-text-inverse hover:bg-ink-900">
            Start a project
          </Link>
        </div>
      </div>
    </div>
  );
}
