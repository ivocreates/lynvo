import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";
import { getSiteUrl } from "@/lib/env";

export const MIN_PASSWORD_LENGTH = 12;

export type ProvisionResult =
  | { ok: false; message: string }
  | { ok: true; userId: string; link: string | null; emailed: boolean; created: boolean };

/**
 * Supabase's own action link lands on the project's Site URL and returns the
 * session in the URL fragment, which a server route cannot read. Building the
 * link against our own /auth/confirm handler keeps the whole exchange
 * server-side and works no matter how Site URL is configured.
 */
function confirmUrl(hashedToken: string, type: "invite" | "recovery", next: string) {
  const params = new URLSearchParams({ token_hash: hashedToken, type, next });
  return `${getSiteUrl()}/auth/confirm?${params.toString()}`;
}

async function sendInviteEmail(to: string, link: string, subject: string, intro: string) {
  if (!process.env.RESEND_API_KEY) return false;

  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "LYNVO <notifications@lynvo.studio>",
        to,
        subject,
        text: [
          intro,
          "",
          "Open this link to set your password and sign in:",
          link,
          "",
          "The link can only be used once and expires in 24 hours.",
          "",
          "LYNVO CREATIVE SOLUTIONS LLP",
        ].join("\n"),
      }),
    });

    return response.ok;
  } catch {
    return false;
  }
}

/**
 * Creates or updates an account. With a password the account is usable
 * immediately; without one a single-use sign-in link is generated (and emailed
 * when Resend is configured) so the invite never depends on Supabase SMTP.
 */
export async function provisionAccount({
  email,
  password,
  next,
  subject,
  intro,
}: {
  email: string;
  password: string | null;
  next: string;
  subject: string;
  intro: string;
}): Promise<ProvisionResult> {
  const admin = createAdminClient();

  const { data: existingProfile } = await admin
    .from("profiles")
    .select("id")
    .eq("email", email)
    .maybeSingle();

  const existingId = (existingProfile as { id: string } | null)?.id ?? null;

  if (password) {
    if (password.length < MIN_PASSWORD_LENGTH) {
      return { ok: false, message: `Password must be at least ${MIN_PASSWORD_LENGTH} characters.` };
    }

    if (existingId) {
      const { error } = await admin.auth.admin.updateUserById(existingId, {
        password,
        email_confirm: true,
      });
      if (error) return { ok: false, message: "Could not set that password." };
      return { ok: true, userId: existingId, link: null, emailed: false, created: false };
    }

    const { data, error } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    });

    if (error || !data.user) {
      return { ok: false, message: "Could not create that account. The address may already exist." };
    }

    return { ok: true, userId: data.user.id, link: null, emailed: false, created: true };
  }

  const type = existingId ? "recovery" : "invite";
  const { data, error } = await admin.auth.admin.generateLink({
    type,
    email,
    options: { redirectTo: `${getSiteUrl()}${next}` },
  });

  const hashedToken = data?.properties?.hashed_token;
  const userId = data?.user?.id ?? existingId;

  if (error || !hashedToken || !userId) {
    return { ok: false, message: "Could not generate an invite link for that address." };
  }

  const link = confirmUrl(hashedToken, type, next);
  const emailed = await sendInviteEmail(email, link, subject, intro);

  return { ok: true, userId, link, emailed, created: type === "invite" };
}
