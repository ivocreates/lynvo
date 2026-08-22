import { Suspense } from "react";
import LoginForm from "@/components/admin/login-form";
import LinkSessionHandler from "@/components/admin/link-session-handler";

export const metadata = { robots: { index: false, follow: false } };

// Rendered per request so the Supabase config comes from the Worker runtime
// rather than being frozen into the build output.
export const dynamic = "force-dynamic";

export default function AdminLoginPage() {
  return (
    <div className="container-page flex min-h-[70vh] flex-col items-center justify-center py-20">
      <LinkSessionHandler />
      <Suspense fallback={null}>
        <LoginForm />
      </Suspense>
    </div>
  );
}
