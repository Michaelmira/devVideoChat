export function OAuthButtons({ google, github, next }: { google: boolean; github: boolean; next?: string }) {
  if (!google && !github) return null;
  const q = next ? `?next=${encodeURIComponent(next)}` : "";
  const cls =
    "flex h-10 w-full items-center justify-center gap-2 rounded-lg border border-border bg-card text-sm font-medium transition hover:bg-accent-soft";
  return (
    <div className="space-y-3">
      <div className="grid gap-2 sm:grid-cols-2">
        {google && (
          // Plain links: these routes redirect to the provider.
          <a href={`/api/auth/google${q}`} className={cls}>
            <svg viewBox="0 0 24 24" className="size-4" aria-hidden>
              <path fill="#EA4335" d="M12 10.2v3.9h5.5c-.2 1.3-1.6 3.8-5.5 3.8-3.3 0-6-2.7-6-6.1s2.7-6.1 6-6.1c1.9 0 3.2.8 3.9 1.5l2.7-2.6C16.9 3 14.7 2 12 2 6.5 2 2 6.5 2 12s4.5 10 10 10c5.8 0 9.6-4 9.6-9.8 0-.7-.1-1.2-.2-1.7H12z" />
            </svg>
            Continue with Google
          </a>
        )}
        {github && (
          <a href={`/api/auth/github${q}`} className={cls}>
            <svg viewBox="0 0 24 24" className="size-4" fill="currentColor" aria-hidden>
              <path d="M12 .5C5.7.5.5 5.7.5 12c0 5.1 3.3 9.4 7.9 10.9.6.1.8-.3.8-.6v-2c-3.2.7-3.9-1.5-3.9-1.5-.5-1.3-1.3-1.7-1.3-1.7-1.1-.7.1-.7.1-.7 1.2.1 1.8 1.2 1.8 1.2 1 1.8 2.8 1.3 3.5 1 .1-.8.4-1.3.7-1.6-2.6-.3-5.3-1.3-5.3-5.7 0-1.3.5-2.3 1.2-3.1-.1-.3-.5-1.5.1-3.1 0 0 1-.3 3.3 1.2a11.4 11.4 0 0 1 6 0c2.3-1.5 3.3-1.2 3.3-1.2.7 1.6.2 2.8.1 3.1.8.8 1.2 1.9 1.2 3.1 0 4.4-2.7 5.4-5.3 5.7.4.4.8 1.1.8 2.2v3.3c0 .3.2.7.8.6A11.5 11.5 0 0 0 23.5 12C23.5 5.7 18.3.5 12 .5z" />
            </svg>
            Continue with GitHub
          </a>
        )}
      </div>
      <div className="flex items-center gap-3 text-xs text-muted">
        <span className="h-px flex-1 bg-border" />
        or with email
        <span className="h-px flex-1 bg-border" />
      </div>
    </div>
  );
}
