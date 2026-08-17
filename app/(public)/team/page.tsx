import Link from "next/link";
import SectionStamp from "@/components/ui/section-stamp";
import ArchiveCard from "@/components/ui/archive-card";
import { getSocialLinks, getTeamMembers } from "@/lib/queries";

export const metadata = { title: "Team" };

export default async function TeamPage() {
  const [team, socialLinks] = await Promise.all([getTeamMembers(), getSocialLinks()]);

  return (
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
      <div className="mt-12 rounded-card border border-border bg-surface p-6">
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
    </div>
  );
}
