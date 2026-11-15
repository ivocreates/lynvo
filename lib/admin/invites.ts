import "server-only";

import { createLogin, createSetPasswordLink, findUserIdByEmail, setPassword } from "@/lib/accounts-auth";
import { sendEmail } from "@/lib/email";

export const MIN_PASSWORD_LENGTH = 12;

export type ProvisionResult =
  | { ok: false; message: string }
  | { ok: true; userId: string; link: string | null; emailed: boolean; created: boolean };

async function sendInviteEmail(to: string, link: string, subject: string, intro: string) {
  return sendEmail({
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
  });
}

/**
 * Creates or updates a login. With a password the account is usable
 * immediately; without one a single-use set-password link is generated (and
 * emailed when Resend is configured).
 */
export async function provisionAccount({
  email,
  password,
  subject,
  intro,
}: {
  email: string;
  password: string | null;
  next: string;
  subject: string;
  intro: string;
}): Promise<ProvisionResult> {
  if (password && password.length < MIN_PASSWORD_LENGTH) {
    return { ok: false, message: `Password must be at least ${MIN_PASSWORD_LENGTH} characters.` };
  }

  try {
    const existingId = await findUserIdByEmail(email);

    if (existingId) {
      if (password) {
        await setPassword(existingId, password);
        return { ok: true, userId: existingId, link: null, emailed: false, created: false };
      }
      const link = await createSetPasswordLink(existingId);
      return { ok: true, userId: existingId, link, emailed: await sendInviteEmail(email, link, subject, intro), created: false };
    }

    const userId = await createLogin(email, password);
    if (password) return { ok: true, userId, link: null, emailed: false, created: true };

    const link = await createSetPasswordLink(userId);
    return { ok: true, userId, link, emailed: await sendInviteEmail(email, link, subject, intro), created: true };
  } catch {
    return { ok: false, message: "Could not create that account. The address may already exist." };
  }
}
