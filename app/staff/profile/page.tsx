import { requireTeamMember } from "@/lib/auth";
import { ROLE_LABELS } from "@/lib/roles";
import { createClient } from "@/lib/supabase/server";
import StaffProfileForm from "@/components/staff/profile-form";

export const metadata = { title: "My profile" };

export default async function StaffProfilePage() {
  const profile = await requireTeamMember();

  const supabase = createClient();
  const { data } = await supabase
    .from("profiles")
    .select("display_name, phone, bio, skills")
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

      <StaffProfileForm
        defaults={{
          display_name: data?.display_name ?? "",
          phone: data?.phone ?? "",
          bio: data?.bio ?? "",
          skills: (data?.skills ?? []).join(", "),
        }}
      />
    </div>
  );
}
