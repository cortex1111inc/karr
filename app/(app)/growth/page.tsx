import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { formatCurrency } from "@/lib/billing/money";
import { CHANNEL_LABEL } from "@/lib/growth";
import { growthStats } from "@/lib/growth-stats";
import { PageHeader } from "@/components/layout/page-header";
import { Card } from "@/components/ui/card";
import { Select } from "@/components/ui/input";
import { Button, ButtonLink } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";

export const metadata = { title: "Growth" };

export default async function GrowthPage({ searchParams }: { searchParams: Promise<{ days?: string }> }) {
  const user = await requireUser();
  const org = user.orgId;
  const days = Number((await searchParams).days) > 0 ? Number((await searchParams).days) : 30;
  const to = new Date();
  const from = new Date(to);
  from.setDate(from.getDate() - days);
  from.setHours(0, 0, 0, 0);

  const { hasLinks, rows, totals } = await growthStats(org, from, to);

  return (
    <>
      <PageHeader
        title="Growth"
        description="Which influencers and ads actually bring bookings — and what you owe them."
        action={
          <form method="get" className="flex items-center gap-2">
            <Select name="days" defaultValue={String(days)} className="w-36" aria-label="Date range">
              <option value="7">Last 7 days</option>
              <option value="30">Last 30 days</option>
              <option value="90">Last 90 days</option>
              <option value="365">Last 12 months</option>
            </Select>
            <Button type="submit" variant="ghost" size="sm">
              Apply
            </Button>
          </form>
        }
      />
      <div className="flex flex-1 flex-col gap-6 px-4 py-6 sm:px-6 lg:px-8">
        {!hasLinks ? (
          <EmptyState
            title="Start tracking your marketing"
            description="Create a tracking link for each influencer or ad. Every click, lead, booking and rupee that comes through shows up here."
            action={<ButtonLink href="/growth/links" variant="accent" size="sm">Create a tracking link</ButtonLink>}
          />
        ) : (
          <>
            <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-5">
              {[
                { label: "Clicks", value: totals.clicks.toLocaleString("en-IN") },
                { label: "Leads", value: totals.leads.toLocaleString("en-IN") },
                { label: "Booked", value: totals.booked.toLocaleString("en-IN") },
                { label: "Revenue", value: formatCurrency(totals.revenue) },
                { label: "Commission owed", value: formatCurrency(totals.commission) },
              ].map((k) => (
                <Card key={k.label} className="p-4 sm:p-5">
                  <p className="text-sm text-muted">{k.label}</p>
                  <p className="mt-1 font-mono text-xl font-medium tabular-nums">{k.value}</p>
                </Card>
              ))}
            </div>

            <Card className="p-5">
              <div className="flex items-center justify-between gap-3">
                <h2 className="font-display text-sm font-bold">By tracking link</h2>
                <Link href="/growth/links" className="text-sm text-accent-deep hover:underline">
                  Manage links →
                </Link>
              </div>
              <div className="mt-4 overflow-x-auto">
                <table className="w-full min-w-[640px] text-sm">
                  <thead>
                    <tr className="border-b border-border text-left text-xs text-faint">
                      <th className="pb-2 font-medium">Link</th>
                      <th className="pb-2 text-right font-medium">Clicks</th>
                      <th className="pb-2 text-right font-medium">Leads</th>
                      <th className="pb-2 text-right font-medium">Booked</th>
                      <th className="pb-2 text-right font-medium">Conv.</th>
                      <th className="pb-2 text-right font-medium">Revenue</th>
                      <th className="pb-2 text-right font-medium">Commission</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((r) => (
                      <tr key={r.link.id} className="border-b border-border last:border-0">
                        <td className="py-2.5 pr-3">
                          <p className="font-medium">{r.link.name}</p>
                          <p className="text-xs text-faint">
                            {[r.link.partnerName, CHANNEL_LABEL[r.link.channel], r.link.archivedAt ? "archived" : null].filter(Boolean).join(" · ")}
                          </p>
                        </td>
                        <td className="py-2.5 text-right font-mono tabular-nums">{r.clicks}</td>
                        <td className="py-2.5 text-right font-mono tabular-nums">{r.leads}</td>
                        <td className="py-2.5 text-right font-mono tabular-nums">{r.booked}</td>
                        <td className="py-2.5 text-right font-mono tabular-nums">{r.leads ? `${r.conversion.toFixed(0)}%` : "—"}</td>
                        <td className="py-2.5 text-right font-mono tabular-nums">{formatCurrency(r.revenue)}</td>
                        <td className="py-2.5 text-right font-mono tabular-nums">{r.link.commissionType === "none" ? "—" : formatCurrency(r.commission)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p className="mt-4 text-xs text-faint">
                Revenue counts payments received in this period on invoices for leads that came through a link — or for customers
                who first came through one. &quot;Booked&quot; counts leads created in this period that are booked now.
              </p>
            </Card>
          </>
        )}
      </div>
    </>
  );
}
