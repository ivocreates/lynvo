import "server-only";

import { getAuth } from "@/lib/better-auth";
import { createAdminClient } from "@/lib/db/server";
import { getAppUrl } from "@/lib/env";

/**
 * Login account management on Better Auth: create a login with its profile,
 * set a password, issue a "set your password" link, delete a login.
 * Callers must check permissions first.
 */

const randomToken = (length = 32) => {
  const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  return Array.from(crypto.getRandomValues(new Uint8Array(length)), (byte) => alphabet[byte % alphabet.length]).join("");
};

export async function findUserIdByEmail(email: string) {
  const context = await getAuth().$context;
  const found = await context.internalAdapter.findUserByEmail(email.toLowerCase());
  return found?.user.id ?? null;
}

/** Creates the Better Auth user + credential account and the matching (inactive) profile row. */
export async function createLogin(email: string, password: string | null, name?: string) {
  const context = await getAuth().$context;
  const normalised = email.trim().toLowerCase();
  const user = await context.internalAdapter.createUser({ email: normalised, name: name || normalised, emailVerified: true }, { method: "admin" });
  await context.internalAdapter.linkAccount({
    userId: user.id,
    providerId: "credential",
    accountId: user.id,
    // Without a password the account is unusable until the set-password link is used.
    password: await context.password.hash(password ?? randomToken(48)),
  });

  // Mirrors the old handle_new_user trigger: callers then set role / is_active.
  await createAdminClient()
    .from("profiles")
    .upsert({ id: user.id, email: normalised, display_name: name || normalised, role: "editor", is_active: false }, { onConflict: "id" });

  return user.id;
}

export async function setPassword(userId: string, password: string) {
  const context = await getAuth().$context;
  const hash = await context.password.hash(password);
  const accounts = await context.internalAdapter.findAccounts(userId);
  const credential = accounts.find((account) => account.providerId === "credential");
  if (credential) await context.internalAdapter.updatePassword(userId, hash);
  else await context.internalAdapter.linkAccount({ userId, providerId: "credential", accountId: userId, password: hash });
}

/** A single-use link to /admin/update-password, valid for 24 hours (Better Auth reset token). */
export async function createSetPasswordLink(userId: string) {
  const context = await getAuth().$context;
  const token = randomToken(24);
  await context.internalAdapter.createVerificationValue({
    identifier: `reset-password:${token}`,
    value: userId,
    expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
  });
  return `${getAppUrl()}/admin/update-password?token=${token}`;
}

export async function deleteLogin(userId: string) {
  const context = await getAuth().$context;
  await context.internalAdapter.deleteUser(userId);
  await createAdminClient().from("profiles").delete().eq("id", userId);
}
