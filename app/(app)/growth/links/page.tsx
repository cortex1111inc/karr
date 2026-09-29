import Link from "next/link";
import { and, count, desc, eq, isNotNull, isNull } from "drizzle-orm";
import { db } from "@/db";
import { organizations, trackingLinks } from "@/db/schema";
import { requireUser } from "@/lib/auth";
import { getSiteUrl } from "@/lib/site";
import { CHANNEL_LABEL } from "@/lib/growth";
import { formatCurrency } from "@/lib/billing/money";
import { PageHeader } from "@/components/layout/page-header";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { CopyLinkButton } from "@/components/ui/copy-link-button";
import { PAGE_SIZE, Pagination, parsePage } from "@/components/ui/pagination";
import { NewLinkDialog } from "./new-link-dialog";
import { ArchiveButton } from "./archive-button";

export default async function TrackingLinksPage({ searchParams }: { searchParams: Promise<{ page?: string; archived?: string }> }) {
  const user = await requireUser();
  const params = await searchParams;
  const page = parsePage(params.page);
  const showArchived = params.archived === "1";

  const where = and(eq(trackingLinks.orgId, user.orgId), showArchived ? isNotNull(trackingLinks.archivedAt) : isNull(trackingLinks.archivedAt));
  const [[org], rows, [{ total }]] = await Promise.all([
    db.select({ slug: organizations.slug }).from(organizations).where(eq(organizations.id, user.orgId)),
    db.select().from(trackingLinks).where(where).orderBy(desc(trackingLinks.createdAt)).limit(PAGE_SIZE).offset((page - 1) * PAGE_SIZE),
    db.select({ total: count() }).from(trackingLinks).where(where),
  ]);

  const base = `${getSiteUrl()}/r/${org.slug}`;

  return (
    <>
      <PageHeader
        title="Tracking links"
        description="One link per influencer or ad — every booking that comes through is credited to it."
        action={<NewLinkDialog />}
      />
      <div className="flex-1 px-4 py-6 sm:px-6 lg:px-8">
        <div className="mb-4 flex gap-4 text-sm">
          <Link href="/growth/links" className={showArchived ? "text-muted hover:text-foreground" : "font-medium text-foreground"}>
            Active
          </Link>
          <Link href="/growth/links?archived=1" className={showArchived ? "font-medium text-foreground" : "text-muted hover:text-foreground"}>
            Archived
          </Link>
          <Link href="/growth" className="ml-auto text-accent-deep hover:underline">
            See performance →
          </Link>
        </div>

        {rows.length === 0 ? (
          showArchived ? (
            <EmptyState title="No archived links" />
          ) : (
            <EmptyState
              title="No tracking links yet"
              description="Create a link for each influencer or ad, share it, and see which ones actually bring bookings and revenue."
              action={<NewLinkDialog />}
            />
          )
        ) : (
          <Card className="divide-y divide-border">
            {rows.map((link) => {
              const url = `${base}/${link.code}`;
              return (
                <div key={link.id} className="flex flex-col gap-2 p-4 sm:flex-row sm:items-center sm:justify-between">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-sm font-semibold">{link.name}</p>
                      <Badge tone="neutral">{CHANNEL_LABEL[link.channel]}</Badge>
                      {link.commissionType !== "none" && link.commissionValue ? (
                        <Badge tone="accent">
                          {link.commissionType === "flat" ? `${formatCurrency(link.commissionValue)}/booking` : `${Number(link.commissionValue)}% of revenue`}
                        </Badge>
                      ) : null}
                    </div>
                    {link.partnerName ? <p className="mt-0.5 text-xs text-muted">{link.partnerName}</p> : null}
                    <code className="mt-1 block break-all font-mono text-xs text-faint">{url}</code>
                  </div>
                  <div className="flex flex-none items-center gap-3">
                    {!showArchived ? <CopyLinkButton url={url} /> : null}
                    <ArchiveButton linkId={link.id} archived={showArchived} />
                  </div>
                </div>
              );
            })}
          </Card>
        )}
        <Pagination page={page} total={total} pathname="/growth/links" searchParams={{ archived: params.archived }} />
      </div>
    </>
  );
}
