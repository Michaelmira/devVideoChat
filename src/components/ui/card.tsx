import { cn } from "@/lib/cn";

export function Card({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("rounded-2xl border border-border bg-card p-6 shadow-sm", className)} {...props} />;
}

export function Alert({
  tone = "info",
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement> & { tone?: "info" | "error" | "success" }) {
  const tones = {
    info: "border-accent/30 bg-accent-soft text-foreground",
    error: "border-danger/30 bg-danger/10 text-danger",
    success: "border-success/30 bg-success/10 text-success",
  };
  return <div role={tone === "error" ? "alert" : "status"} className={cn("rounded-lg border px-3 py-2 text-sm", tones[tone], className)} {...props} />;
}
