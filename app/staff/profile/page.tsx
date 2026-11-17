import { requireTeamMember } from "@/lib/auth";
import { ROLE_LABELS } from "@/lib/roles";
import { createClient } from "@/lib/db/server";
import StaffProfileForm from "@/components/staff/profile-form";
import PhotoField from "@/components/team/photo-field";

export const metadata = { title: "My profile" };

export default async function StaffProfilePage() {
  const profile = await requireTeamMember();

  const db = createClient();
  const { data } = await db
    .from("profiles")
    .select("display_name, phone, bio, skills, avatar_url, social_links, show_on_website, public_title, title")
    .eq("id", profile.id)
    .maybeSingle();

  return (
    <div>
      <p className="section-stamp">ACCOUNT</p>
      <h1 className="mt-2 font-display text-3xl font-semibold text-ink-900">My profile</h1>
      <p className="mt-2 max-w-2xl text-sm leading-6 text-text-primary/75">
        You are signed in as {profile.email} ({ROLE_LABELS[profile.role]}). Role, dates, and reporting line are
        managed by an admin.
      </p>

      <section className="mt-8 max-w-xl rounded-card border border-border bg-surface p-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <h2 className="font-display text-lg font-semibold text-ink-900">Photo &amp; website profile</h2>
          <span
            className={`rounded-card px-2 py-1 text-xs font-medium ${
              data?.show_on_website ? "bg-success/10 text-success" : "bg-border/50 text-text-primary/70"
            }`}
          >
            {data?.show_on_website ? "Shown on lynvo.studio/team" : "Not on the website"}
          </span>
        </div>
        <p className="mt-1 text-sm text-text-primary/70">
          Your photo, bio, skills and links appear on the public team page
          {data?.show_on_website ? ` as “${data?.public_title || data?.title || "Team member"}”` : " once an admin switches you on"}.
        </p>
        <div className="mt-4">
          <PhotoField profileId={profile.id} name={data?.display_name ?? profile.email} initialUrl={data?.avatar_url ?? null} />
        </div>
      </section>

      <StaffProfileForm
        defaults={{
          display_name: data?.display_name ?? "",
          phone: data?.phone ?? "",
          bio: data?.bio ?? "",
          skills: (data?.skills ?? []).join(", "),
          social: (data?.social_links ?? {}) as Record<string, string>,
        }}
      />
    </div>
  );
}
