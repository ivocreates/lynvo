import ResetPasswordForm from "@/components/admin/reset-password-form";

export const metadata = { robots: { index: false, follow: false } };

// Rendered per request: auth state is read from the Worker at runtime.
export const dynamic = "force-dynamic";

export default function ResetPasswordPage() {
  return (
    <div className="container-page flex min-h-[70vh] items-center justify-center py-20">
      <ResetPasswordForm />
    </div>
  );
}
