import { setOnWebsite } from "@/app/admin/(dashboard)/admins/actions";

export type TeamPerson = {
  id: string;
  email: string;
  display_name: string | null;
  title: string | null;
  is_active: boolean;
  avatar_url: string | null;
  bio: string | null;
  skills: string[] | null;
  show_on_website?: boolean;
  website_order?: number;
  public_title?: string | null;
  social_links?: Record<string, string> | null;
};

/** Every active team member at a glance, with a one-tap show / hide on the public team page. */
export default function TeamWebsiteOverview({ people, canPublish }: { people: TeamPerson[]; canPublish: boolean }) {
  const active = people
    .filter((person) => person.is_active)
    .sort((a, b) => Number(b.show_on_website) - Number(a.show_on_website) || (a.website_order ?? 0) - (b.website_order ?? 0));
  const shown = active.filter((person) => person.show_on_website).length;

  return (
    <section className="mb-8 rounded-card border border-border bg-surface p-4 sm:p-5">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="font-display text-lg font-semibold text-ink-900">Public team page</h2>
        <a href="/team" target="_blank" rel="noreferrer" className="text-sm text-brand-700 underline">
          View the team page ↗
        </a>
      </div>
      <p className="mt-1 text-sm text-text-primary/70">
        {shown} of {active.length} active people are shown. Everyone can add their own photo and bio under My profile; you can edit any
        of it below (open a person, then “Website profile”).
      </p>

      <ul className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6">
        {active.map((person) => {
          const name = person.display_name ?? person.email;
          return (
            <li
              key={person.id}
              className={`flex flex-col overflow-hidden rounded-card border bg-canvas-warm/40 ${person.show_on_website ? "border-success/50" : "border-border"}`}
            >
              <a href={`#person-${person.id}`} className="block flex-1">
                <div className="relative aspect-[4/5] bg-gradient-to-br from-brand-700 to-ink-900">
                  {person.avatar_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={person.avatar_url}
                      alt={name}
                      className={`h-full w-full object-cover ${person.show_on_website ? "" : "opacity-60 grayscale"}`}
                    />
                  ) : (
                    <span className="flex h-full items-center justify-center font-display text-3xl font-semibold text-text-inverse/70">
                      {name.slice(0, 1).toUpperCase()}
                    </span>
                  )}
                  <span className="absolute left-2 top-2 flex flex-wrap gap-1">
                    {!person.avatar_url && <span className="rounded bg-warning px-1.5 text-[10px] font-medium text-white">no photo</span>}
                    {!person.bio && <span className="rounded bg-warning px-1.5 text-[10px] font-medium text-white">no bio</span>}
                  </span>
                </div>
                <p className="truncate px-2 pt-2 text-sm font-medium text-ink-900">{name}</p>
                <p className="truncate px-2 text-xs text-text-primary/60">{person.public_title || person.title || "No title"}</p>
              </a>
              {canPublish ? (
                <form action={setOnWebsite} className="p-2">
                  <input type="hidden" name="id" value={person.id} />
                  <input type="hidden" name="show" value={person.show_on_website ? "0" : "1"} />
                  <button
                    type="submit"
                    aria-pressed={Boolean(person.show_on_website)}
                    className={`w-full rounded-card px-2 py-2 text-xs font-medium ${
                      person.show_on_website
                        ? "bg-success/15 text-success hover:bg-success/25"
                        : "border border-border bg-surface text-ink-900 hover:bg-canvas-warm"
                    }`}
                  >
                    {person.show_on_website ? "✓ On website — hide" : "Show on website"}
                  </button>
                </form>
              ) : (
                <p className="p-2 text-xs text-text-primary/60">{person.show_on_website ? "On website" : "Hidden"}</p>
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
}
