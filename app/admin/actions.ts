"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { getAuth } from "@/lib/better-auth";

export async function signOut() {
  try {
    await getAuth().api.signOut({ headers: headers() });
  } catch {
    // Already signed out.
  }
  redirect("/admin/login");
}
