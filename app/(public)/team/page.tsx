import SectionStamp from "@/components/ui/section-stamp";
import ArchiveCard from "@/components/ui/archive-card";
import { getTeamMembers } from "@/lib/queries";

export const metadata = { title: "Team" };

export default async function TeamPage() {
  const team = await getTeamMembers();

  return (
    <div className="container-page py-20">
      <SectionStamp label="TEAM" />
      <h1 className="font-display text-3xl font-semibold text-ink-900">The people behind LYNVO</h1>
      <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {team.length > 0 ? (
          team.map((member) => (
            <ArchiveCard key={member.id} title={member.display_name} meta={member.role ?? "TEAM"} imageUrl={member.image_url}>
              {member.bio}
              {member.skills?.length ? <p className="mt-3 text-xs uppercase tracking-wider text-brand-700">{member.skills.join(" / ")}</p> : null}
            </ArchiveCard>
          ))
        ) : (
          <p className="text-sm text-text-primary/60">
            No active team members yet. Add rows to the `team_members` table to see them here.
          </p>
        )}
      </div>
    </div>
  );
}
