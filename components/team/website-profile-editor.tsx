import { updateWebsiteProfile } from "@/app/admin/(dashboard)/admins/actions";
import PhotoField from "@/components/team/photo-field";
import { SOCIAL_FIELDS } from "@/lib/team-profile";
import type { TeamPerson } from "@/components/team/team-website-overview";

const FIELD =
  "mt-1 w-full rounded-card border border-border bg-canvas-warm px-2 py-1.5 text-base focus:border-brand-700 focus:outline-none sm:text-sm";
const LABEL = "block text-xs uppercase tracking-[0.18em] text-text-primary/60";

/** Admin editor for everything a person's public team card shows. */
export default function WebsiteProfileEditor({ person }: { person: TeamPerson }) {
  const name = person.display_name ?? person.email;
  return (
    <div className="border-t border-border p-4 sm:p-5">
      <p className="section-stamp">Website profile</p>
      <div className="mt-3 grid gap-6 lg:grid-cols-[auto_1fr]">
        <PhotoField profileId={person.id} name={name} initialUrl={person.avatar_url} />
        <form action={updateWebsiteProfile} className="grid gap-4 sm:grid-cols-2">
          <input type="hidden" name="id" value={person.id} />
          <label className="flex items-center gap-2 text-sm font-medium text-ink-900 sm:col-span-2">
            <input
              type="checkbox"
              name="show_on_website"
              defaultChecked={Boolean(person.show_on_website)}
              className="h-4 w-4 rounded border-border accent-brand-700"
            />
            Show {name.split(" ")[0]} on the public team page
          </label>
          <div>
            <label htmlFor={`ptitle-${person.id}`} className={LABEL}>
              Title on website
            </label>
            <input
              id={`ptitle-${person.id}`}
              name="public_title"
              defaultValue={person.public_title ?? ""}
              placeholder={person.title ?? "e.g. Lead designer"}
              className={FIELD}
            />
          </div>
          <div>
            <label htmlFor={`order-${person.id}`} className={LABEL}>
              Order (lower shows first)
            </label>
            <input
              id={`order-${person.id}`}
              name="website_order"
              type="number"
              min={0}
              max={999}
              defaultValue={person.website_order ?? 0}
              className={FIELD}
            />
          </div>
          <div className="sm:col-span-2">
            <label htmlFor={`bio-${person.id}`} className={LABEL}>
              Bio
            </label>
            <textarea id={`bio-${person.id}`} name="bio" rows={4} maxLength={2000} defaultValue={person.bio ?? ""} className={FIELD} />
          </div>
          <div className="sm:col-span-2">
            <label htmlFor={`skills-${person.id}`} className={LABEL}>
              Skills (comma separated)
            </label>
            <input id={`skills-${person.id}`} name="skills" defaultValue={(person.skills ?? []).join(", ")} className={FIELD} />
          </div>
          {SOCIAL_FIELDS.map((field) => (
            <div key={field.key}>
              <label htmlFor={`${field.key}-${person.id}`} className={LABEL}>
                {field.label}
              </label>
              <input
                id={`${field.key}-${person.id}`}
                name={`social_${field.key}`}
                type="url"
                defaultValue={person.social_links?.[field.key] ?? ""}
                placeholder={field.placeholder}
                className={FIELD}
              />
            </div>
          ))}
          <div className="sm:col-span-2">
            <button type="submit" className="rounded-card bg-brand-700 px-4 py-2 text-sm font-medium text-text-inverse hover:bg-ink-900">
              Save website profile
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
