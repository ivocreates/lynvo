import type { TeamMember } from "@/lib/queries";

const SOCIAL_LABELS: Record<string, string> = {
  linkedin: "LinkedIn",
  github: "GitHub",
  twitter: "X",
  x: "X",
  instagram: "Instagram",
  website: "Website",
  dribbble: "Dribbble",
  behance: "Behance",
};

/** Portrait card for the team page: uploaded photo, or initials when there is none. */
export default function TeamCard({ member }: { member: TeamMember }) {
  const initials = member.display_name
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
  const links = Object.entries(member.social_links ?? {}).filter(([, url]) => /^https?:\/\//i.test(String(url)));

  return (
    <article className="group overflow-hidden rounded-card border border-border bg-surface shadow-sm transition-shadow hover:shadow-md">
      <div className="relative aspect-[4/5] overflow-hidden bg-gradient-to-br from-brand-700 to-ink-900">
        {member.image_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={member.image_url}
            alt={member.display_name}
            loading="lazy"
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
          />
        ) : (
          <span aria-hidden="true" className="flex h-full items-center justify-center font-display text-6xl font-semibold text-text-inverse/80">
            {initials}
          </span>
        )}
        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-ink-900/85 to-transparent p-5 pt-16">
          <h3 className="font-display text-xl font-semibold text-text-inverse">{member.display_name}</h3>
          {member.role && <p className="mt-0.5 text-sm text-text-inverse/80">{member.role}</p>}
        </div>
      </div>
      <div className="p-5">
        {member.bio && <p className="text-sm leading-6 text-text-primary/80">{member.bio}</p>}
        {member.skills?.length ? (
          <ul className="mt-4 flex flex-wrap gap-1.5">
            {member.skills.map((skill) => (
              <li key={skill} className="rounded-full border border-border bg-canvas-warm px-2.5 py-0.5 text-xs text-ink-900">
                {skill}
              </li>
            ))}
          </ul>
        ) : null}
        {links.length > 0 && (
          <p className="mt-4 flex flex-wrap gap-3 text-sm">
            {links.map(([platform, url]) => (
              <a key={platform} href={String(url)} target="_blank" rel="noopener noreferrer" className="text-brand-700 underline underline-offset-4">
                {SOCIAL_LABELS[platform.toLowerCase()] ?? platform}
              </a>
            ))}
          </p>
        )}
      </div>
    </article>
  );
}
