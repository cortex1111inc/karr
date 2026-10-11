import Link from "next/link";
import { Card } from "@/components/ui/card";
import { CopyLinkButton } from "@/components/ui/copy-link-button";
import { SETUP, setupProgress, type SetupKey } from "@/lib/guide-content";
import { Pill } from "./mocks";

export type ServerCheck = { name: string; ok: boolean; needed: string };

// Server component: the ticks come from real workspace data (lib/guide.ts).
export function SetupChecklist({
  done,
  isOwner,
  serverChecks,
  webhooks,
  bookingUrl,
}: {
  done: Record<SetupKey, boolean>;
  isOwner: boolean;
  serverChecks: ServerCheck[];
  webhooks: { label: string; url: string; where: string }[];
  bookingUrl: string;
}) {
  const progress = setupProgress(done);

  return (
    <div className="flex flex-col gap-6">
      <Card className="p-5">
        <div className="flex flex-wrap items-end justify-between gap-2">
          <div>
            <h2 className="font-display text-base font-bold">Your setup</h2>
            <p className="mt-0.5 text-sm text-muted">
              {progress.requiredDone} of {progress.requiredTotal} essentials done
              {progress.optionalTotal > 0 ? ` · ${progress.optionalDone} of ${progress.optionalTotal} optional extras` : ""}
            </p>
          </div>
          <p className="font-mono text-2xl tabular-nums">{progress.percent}%</p>
        </div>
        <div
          role="progressbar"
          aria-label="Setup progress"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={progress.percent}
          className="mt-3 h-2 overflow-hidden rounded-full bg-surface-2"
        >
          <div className="h-full rounded-full bg-accent" style={{ width: `${progress.percent}%` }} />
        </div>
      </Card>

      {SETUP.map((phase) => (
        <section key={phase.id} aria-labelledby={`phase-${phase.id}`}>
          <h2 id={`phase-${phase.id}`} className="font-display text-sm font-bold">
            {phase.title}
          </h2>
          <p className="mt-0.5 text-sm text-muted">{phase.blurb}</p>
          <ul className="mt-3 flex flex-col gap-2">
            {phase.items.map((item) => {
              const ok = done[item.key];
              return (
                <li key={item.key}>
                  <Link
                    href={item.href}
                    className="flex items-start gap-3 rounded-xl border border-border bg-surface p-4 transition-colors hover:border-border-strong hover:bg-surface-2"
                  >
                    <span
                      aria-hidden="true"
                      className={
                        ok
                          ? "mt-0.5 flex h-5 w-5 flex-none items-center justify-center rounded-full bg-accent text-xs text-accent-ink"
                          : "mt-0.5 h-5 w-5 flex-none rounded-full border-2 border-border-strong"
                      }
                    >
                      {ok ? "✓" : null}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="flex flex-wrap items-center gap-2">
                        <span className={ok ? "text-sm font-medium text-muted line-through" : "text-sm font-medium"}>{item.title}</span>
                        <span className="sr-only">{ok ? "(done)" : "(not done yet)"}</span>
                        {item.optional ? <Pill>Optional</Pill> : null}
                      </span>
                      <span className="mt-0.5 block text-sm text-muted">{item.why}</span>
                    </span>
                    <span aria-hidden="true" className="mt-0.5 text-faint">
                      ›
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </section>
      ))}

      <Card className="p-5">
        <h2 className="font-display text-sm font-bold">Share your booking link</h2>
        <p className="mt-0.5 text-sm text-muted">Put this on Instagram or your Google profile. Anyone can request a booking without an account.</p>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <code className="break-all rounded-lg border border-border bg-surface-2 px-3 py-2 text-xs">{bookingUrl}</code>
          <CopyLinkButton url={bookingUrl} />
        </div>
      </Card>

      {isOwner ? (
        <Card className="p-5">
          <h2 className="font-display text-sm font-bold">One-time setup outside the app</h2>
          <p className="mt-0.5 text-sm text-muted">These live in other dashboards, so the app can only show you what to enter.</p>

          <h3 className="mt-4 text-xs font-medium uppercase tracking-wide text-faint">Server configuration</h3>
          <ul className="mt-2 flex flex-col gap-2">
            {serverChecks.map((c) => (
              <li key={c.name} className="flex items-start gap-3 text-sm">
                <Pill tone={c.ok ? "accent" : "danger"}>{c.ok ? "Set" : "Missing"}</Pill>
                <span className="min-w-0">
                  <code className="font-mono text-xs">{c.name}</code>
                  <span className="block text-muted">{c.needed}</span>
                </span>
              </li>
            ))}
          </ul>
          <p className="mt-2 text-xs text-faint">Shown as set or missing only — values are never displayed. Change them in your hosting provider&apos;s environment variables.</p>

          <h3 className="mt-5 text-xs font-medium uppercase tracking-wide text-faint">Webhook addresses to paste elsewhere</h3>
          <ul className="mt-2 flex flex-col gap-3">
            {webhooks.map((w) => (
              <li key={w.label}>
                <p className="text-sm font-medium">{w.label}</p>
                <p className="text-xs text-muted">{w.where}</p>
                <div className="mt-1 flex flex-wrap items-center gap-2">
                  <code className="break-all rounded-lg border border-border bg-surface-2 px-3 py-2 text-xs">{w.url}</code>
                  <CopyLinkButton url={w.url} label="Copy" />
                </div>
              </li>
            ))}
          </ul>

          <h3 className="mt-5 text-xs font-medium uppercase tracking-wide text-faint">Also worth doing</h3>
          <ul className="mt-2 flex list-disc flex-col gap-1 pl-5 text-sm text-muted">
            <li>In Supabase → Authentication → URL configuration, add your site address and <code className="font-mono text-xs">/auth/callback</code> so invite and reset emails open the right page.</li>
            <li>Take regular database backups — your free plan does not keep them for you (see <code className="font-mono text-xs">db/OPERATIONS.md</code>).</li>
            <li>Point an uptime monitor at <code className="font-mono text-xs">/api/health</code>.</li>
          </ul>
        </Card>
      ) : null}

      <Card className="p-5">
        <h2 className="font-display text-sm font-bold">Who can do what</h2>
        <div className="mt-3 grid gap-4 sm:grid-cols-2">
          <div>
            <p className="text-sm font-medium">Staff</p>
            <p className="mt-1 text-sm text-muted">Work leads, customers, quotations, invoices, payments, stock and vehicles; use reports; see their own notifications.</p>
          </div>
          <div>
            <p className="text-sm font-medium">Owner</p>
            <p className="mt-1 text-sm text-muted">Everything staff can, plus deleting financial records, customers, vehicles and stock; integrations; billing profile; team; audit log.</p>
          </div>
        </div>
      </Card>
    </div>
  );
}
