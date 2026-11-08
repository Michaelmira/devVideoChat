import Link from "next/link";
import { buttonClass } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="grid min-h-dvh place-items-center p-4 text-center">
      <div className="space-y-4">
        <p className="text-sm font-medium text-accent">404</p>
        <h1 className="text-2xl font-semibold">Page not found</h1>
        <Link href="/" className={buttonClass("secondary")}>
          Go home
        </Link>
      </div>
    </div>
  );
}
