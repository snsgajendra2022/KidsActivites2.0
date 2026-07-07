export default function WorkspaceUrlPreview({ slug, baseDomain = 'kidsactivites.com' }) {
  const normalized = (slug || '').trim().toLowerCase();
  const displaySlug = normalized || 'your-school';

  return (
    <div className="rounded-lg border border-[var(--sb-border)] bg-[var(--sb-cream)] px-3 py-2.5 text-sm">
      <span className="text-muted">Your workspace URL</span>
      <p className="mt-0.5 font-mono text-sm font-semibold text-brand">
        https://<span className="text-accent">{displaySlug}</span>.{baseDomain}
      </p>
    </div>
  );
}
