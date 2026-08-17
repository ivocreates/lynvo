import { Suspense } from "react";
import LoginForm from "@/components/admin/login-form";

export const metadata = { robots: { index: false, follow: false } };

export default function AdminLoginPage() {
  return (
    <div className="container-page flex min-h-[70vh] items-center justify-center py-20">
      <Suspense fallback={null}>
        <LoginForm />
      </Suspense>
    </div>
  );
}
