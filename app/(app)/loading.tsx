// Shown instantly while a page's server data loads — mirrors PageHeader +
// a card grid so the layout doesn't jump when real content arrives.
export default function Loading() {
  return (
    <div aria-busy="true" aria-label="Loading" className="flex flex-1 flex-col">
      <div className="border-b border-border bg-surface px-4 py-5 sm:px-6 lg:px-8">
        <div className="h-5 w-40 animate-pulse rounded bg-surface-2" />
        <div className="mt-2 h-4 w-64 animate-pulse rounded bg-surface-2" />
      </div>
      <div className="grid grid-cols-1 gap-4 px-4 py-6 sm:grid-cols-2 sm:px-6 lg:grid-cols-3 lg:px-8">
        {Array.from({ length: 6 }, (_, i) => (
          <div key={i} className="h-24 animate-pulse rounded-xl border border-border bg-surface" />
        ))}
      </div>
    </div>
  );
}
