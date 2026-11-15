import { Suspense } from "react";
import LoginForm from "@/components/admin/login-form";

export const metadata = { robots: { index: false, follow: false } };

// Rendered per request: auth state is read from the Worker at runtime.
export const dynamic = "force-dynamic";

export default function AdminLoginPage() {
  return (
    <div className="container-page flex min-h-[70vh] flex-col items-center justify-center py-20">
      <Suspense fallback={null}>
        <LoginForm />
      </Suspense>
    </div>
  );
}
