import { Card } from "@/components/ui/card";

export function AuthShell({ title, subtitle, children }: { title: string; subtitle?: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="mx-auto flex max-w-md flex-col px-4 py-16">
      <Card className="space-y-5">
        <div className="space-y-1">
          <h1 className="text-xl font-semibold">{title}</h1>
          {subtitle && <p className="text-sm text-muted">{subtitle}</p>}
        </div>
        {children}
      </Card>
    </div>
  );
}
