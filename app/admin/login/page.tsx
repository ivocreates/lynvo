import { redirect } from "next/navigation";

// Old team login address: the combined sign-in page lives at /login.
export default function AdminLoginPage({ searchParams }: { searchParams: Record<string, string | undefined> }) {
  const params = new URLSearchParams({ as: "team" });
  for (const key of ["error", "reset", "unlinked", "next"]) {
    const value = searchParams[key];
    if (value) params.set(key, value);
  }
  redirect(`/login?${params.toString()}`);
}
