import Link from "next/link";
import { logoutAction } from "@/app/actions/auth";
import { getCurrentUser } from "@/lib/auth";
import { Logo } from "./logo";
import { buttonClass } from "./ui/button";

export async function SiteHeader() {
  const user = await getCurrentUser();
  return (
    <header className="border-b border-border bg-card/70 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4">
        <Logo />
        <nav className="flex items-center gap-2">
          {user ? (
            <>
              <Link href="/dashboard" className={buttonClass("ghost", "sm")}>
                Dashboard
              </Link>
              <form action={logoutAction}>
                <button className={buttonClass("secondary", "sm")}>Sign out</button>
              </form>
            </>
          ) : (
            <Link href="/?signin=1#auth" className={buttonClass("secondary", "sm")}>
              Sign in
            </Link>
          )}
        </nav>
      </div>
    </header>
  );
}

export function SiteFooter() {
  return (
    <footer className="mt-auto border-t border-border">
      <div className="mx-auto max-w-6xl px-4 py-6 text-sm text-muted">© {new Date().getFullYear()} GuildMeet</div>
    </footer>
  );
}
