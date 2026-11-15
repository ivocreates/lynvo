"use client";

import { createAuthClient } from "better-auth/react";

/** Browser client for sign-in, sign-out and password reset. Same-origin /api/auth. */
export const authClient = createAuthClient();
