import Link from "next/link";
import { AuthShell } from "@/components/auth/auth-shell";
import { ResetForm } from "@/components/auth/simple-forms";

export const metadata = { title: "Choose a new password" };

export default async function ResetPasswordPage(props: PageProps<"/reset-password">) {
  const { email, token } = await props.searchParams;
  if (typeof email !== "string" || typeof token !== "string") {
    return (
      <AuthShell title="Invalid reset link" subtitle="This link is missing information.">
        <Link href="/forgot-password" className="text-sm text-accent hover:underline">
          Request a new reset link
        </Link>
      </AuthShell>
    );
  }
  return (
    <AuthShell title="Choose a new password" subtitle={email}>
      <ResetForm email={email} token={token} />
    </AuthShell>
  );
}
