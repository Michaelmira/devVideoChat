import { cn } from "@/lib/cn";

export function Field({
  label,
  name,
  error,
  hint,
  className,
  ...props
}: React.InputHTMLAttributes<HTMLInputElement> & { label: string; name: string; error?: string; hint?: string }) {
  const id = props.id ?? `f-${name}`;
  return (
    <div className={cn("space-y-1.5", className)}>
      <label htmlFor={id} className="block text-sm font-medium">
        {label}
      </label>
      <input
        id={id}
        name={name}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? `${id}-err` : hint ? `${id}-hint` : undefined}
        className={cn(
          "h-10 w-full rounded-lg border border-border bg-card px-3 text-sm outline-none transition",
          "placeholder:text-muted focus:border-accent focus:ring-4 focus:ring-[var(--ring)]",
          error && "border-danger",
        )}
        {...props}
      />
      {error ? (
        <p id={`${id}-err`} className="text-xs text-danger">
          {error}
        </p>
      ) : hint ? (
        <p id={`${id}-hint`} className="text-xs text-muted">
          {hint}
        </p>
      ) : null}
    </div>
  );
}
