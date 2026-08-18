import Link from "next/link";
import SectionStamp from "@/components/ui/section-stamp";
import ArchiveCard from "@/components/ui/archive-card";
import ProjectCta from "@/components/ui/project-cta";
import { getSiteSettings, getSocialLinks, getTeamMembers, settingsMap } from "@/lib/queries";

export const metadata = { title: "Team" };

export default async function TeamPage() {
  const [team, socialLinks, settingsRows] = await Promise.all([
    getTeamMembers(),
    getSocialLinks(),
    getSiteSettings(),
  ]);
  const settings = settingsMap(settingsRows);

  return (
    <div>
      <div className="container-page py-20">
      <SectionStamp label="TEAM" />
      <div className="grid gap-8 lg:grid-cols-[1fr_0.75fr] lg:items-end">
        <div>
          <h1 className="font-display text-3xl font-semibold text-ink-900 sm:text-4xl">The people behind LYNVO</h1>
          <p className="mt-4 max-w-2xl text-text-primary/80">
            A small studio team with a wide surface area: design, development, security, product thinking, and launch support.
          </p>
        </div>
        <p className="text-sm leading-6 text-text-primary/70">
          The founder, collaborators, and public links are all surfaced from the CMS so the team page stays current when the admin updates it.
        </p>
      </div>
      <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {team.length > 0 ? (
          team.map((member) => (
            <ArchiveCard key={member.id} title={member.display_name} meta={member.role ?? "TEAM"} imageUrl={member.image_url}>
              <p>{member.bio}</p>
              {member.skills?.length ? <p className="mt-3 text-xs uppercase tracking-[0.18em] text-brand-700">{member.skills.join(" / ")}</p> : null}
            </ArchiveCard>
          ))
        ) : (
          <p className="text-sm text-text-primary/60">
            No active team members yet. Add rows to the `team_members` table to see them here.
          </p>
        )}
      </div>
        <div className="mt-12 grid gap-6 lg:grid-cols-2">
          <div className="rounded-card border border-border bg-surface p-6">
            <p className="section-stamp">CONNECT</p>
            <div className="mt-4 flex flex-wrap gap-3 text-sm">
              {socialLinks.map((link) => (
                <a key={link.id} href={link.url} target="_blank" rel="noreferrer" className="rounded-card border border-border px-3 py-2 hover:bg-canvas-warm">
                  {link.platform}
                </a>
              ))}
            </div>
            <Link href="/contact" className="mt-6 inline-flex rounded-card bg-brand-700 px-5 py-3 text-sm font-medium text-text-inverse hover:bg-ink-900">
              Start a project
            </Link>
          </div>
          <div className="rounded-card border border-border bg-canvas-warm p-6">
            <p className="section-stamp">JOIN THE TEAM</p>
            <h2 className="mt-2 font-display text-xl font-semibold text-ink-900">We&apos;re hiring</h2>
            <p className="mt-3 max-w-md text-sm leading-6 text-text-primary/80">
              We&apos;re always looking for talented developers, designers, and strategists — including paid internships
              with a verifiable completion certificate.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Link
                href="/careers"
                className="rounded-card bg-ink-900 px-5 py-3 text-sm font-medium text-text-inverse hover:bg-brand-700"
              >
                See open roles
              </Link>
              <Link
                href="/contact?type=careers"
                className="rounded-card border border-border px-5 py-3 text-sm font-medium text-ink-900 hover:bg-surface"
              >
                Get in touch
              </Link>
            </div>
          </div>
        </div>
      </div>

      <ProjectCta contactEmail={settings.contact_email} />
    </div>
  );
}
