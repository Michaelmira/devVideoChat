import { AuthShell } from "@/components/auth/auth-shell";
import { ForgotForm } from "@/components/auth/simple-forms";

export const metadata = { title: "Forgot password" };

export default function ForgotPasswordPage() {
  return (
    <AuthShell title="Reset your password" subtitle="Enter your account email and we'll send you a reset link.">
      <ForgotForm />
    </AuthShell>
  );
}
