import ResetPasswordForm from "@/components/admin/reset-password-form";

export const metadata = { robots: { index: false, follow: false } };

// Rendered per request so the Supabase config comes from the Worker runtime
// rather than being frozen into the build output.
export const dynamic = "force-dynamic";

export default function ResetPasswordPage() {
  return (
    <div className="container-page flex min-h-[70vh] items-center justify-center py-20">
      <ResetPasswordForm />
    </div>
  );
}
