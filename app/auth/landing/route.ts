import { redirect } from "next/navigation";
import { getCurrentProfile } from "@/lib/auth";
import { ROLE_RANK } from "@/lib/roles";

export const dynamic = "force-dynamic";

/** Sends a freshly authenticated user to the workspace their role belongs to. */
export async function GET() {
  const profile = await getCurrentProfile();

  if (!profile) redirect("/admin/login");
  if (profile.role === "client") redirect("/client");
  redirect(ROLE_RANK[profile.role] < ROLE_RANK.editor ? "/staff" : "/admin");
}
