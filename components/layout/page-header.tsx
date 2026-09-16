export function PageHeader({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: React.ReactNode;
}) {
  return (
    <header className="flex items-center justify-between gap-4 border-b border-border bg-surface px-8 py-5">
      <div>
        <h1 className="font-display text-lg font-bold">{title}</h1>
        {description ? <p className="mt-0.5 text-sm text-muted">{description}</p> : null}
      </div>
      {action}
    </header>
  );
}
