import "server-only";

import { cache } from "react";
import { betterAuth } from "better-auth";
import { nextCookies } from "better-auth/next-js";
import { hashPassword, verifyPassword } from "better-auth/crypto";
import bcrypt from "bcryptjs";
import { D1Dialect } from "kysely-d1";
import { getDb, getEnv } from "@/lib/db/cloudflare";
import { getAppUrl } from "@/lib/env";
import { sendEmail } from "@/lib/email";

/**
 * Better Auth on D1. Accounts migrated from Supabase keep their bcrypt
 * password hashes; they are verified with bcrypt and re-hashed with Better
 * Auth's scrypt the next time the password changes.
 *
 * Sign-up is closed: accounts are created by admins (People / Clients pages).
 */
function createAuth() {
  const env = getEnv();
  const appUrl = (env.APP_URL as string | undefined)?.replace(/\/+$/, "") || getAppUrl();
  const secret = env.BETTER_AUTH_SECRET || process.env.BETTER_AUTH_SECRET;
  if (!secret) throw new Error("BETTER_AUTH_SECRET is not set. Add it as a Worker secret (npx wrangler secret put BETTER_AUTH_SECRET).");

  return betterAuth({
    appName: "LYNVO",
    baseURL: appUrl,
    basePath: "/api/auth",
    secret,
    database: { dialect: new D1Dialect({ database: getDb() as never }), type: "sqlite" },
    emailAndPassword: {
      enabled: true,
      disableSignUp: true,
      minPasswordLength: 8,
      maxPasswordLength: 128,
      resetPasswordTokenExpiresIn: 60 * 60 * 24,
      revokeSessionsOnPasswordReset: true,
      password: {
        hash: (password) => hashPassword(password),
        verify: async ({ hash, password }) => (hash.startsWith("$2") ? bcrypt.compare(password, hash) : verifyPassword({ hash, password })),
      },
      async sendResetPassword({ user, url }) {
        await sendEmail({
          to: user.email,
          subject: "Reset your LYNVO password",
          text: [
            "We received a request to reset your LYNVO password.",
            "",
            "Open this link to choose a new password:",
            url,
            "",
            "The link expires in 24 hours. If you didn't ask for this, you can ignore this email.",
            "",
            "LYNVO CREATIVE SOLUTIONS LLP",
          ].join("\n"),
        });
      },
    },
    session: {
      expiresIn: 60 * 60 * 24 * 30,
      updateAge: 60 * 60 * 24,
      cookieCache: { enabled: true, maxAge: 5 * 60 },
    },
    // UUIDs keep user ids identical to profile ids (and to the old Supabase ids).
    advanced: {
      database: { generateId: () => crypto.randomUUID() },
      useSecureCookies: appUrl.startsWith("https://"),
    },
    trustedOrigins: [...new Set([appUrl, getAppUrl(), String(env.APP_URL ?? "").replace(/\/+$/, "")].filter(Boolean))],
    rateLimit: { enabled: true, window: 60, max: 30 },
    plugins: [nextCookies()],
  });
}

export type Auth = ReturnType<typeof createAuth>;

/** One instance per request (the D1 binding is request-scoped on Workers). */
export const getAuth = cache(createAuth);
