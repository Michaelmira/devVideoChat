import { redirect } from "next/navigation";
import { AuthShell } from "@/components/auth/auth-shell";
import { VerifyForm } from "@/components/auth/simple-forms";

export const metadata = { title: "Verify your email" };

export default async function VerifyPage(props: PageProps<"/verify">) {
  const { email } = await props.searchParams;
  if (typeof email !== "string" || !email) redirect("/");
  return (
    <AuthShell
      title="Check your email"
      subtitle={
        <>
          We sent a 6-digit code to <strong className="text-foreground">{email}</strong>. It expires in 30 minutes.
        </>
      }
    >
      <VerifyForm email={email} />
    </AuthShell>
  );
}
