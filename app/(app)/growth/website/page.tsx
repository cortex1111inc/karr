import { eq } from "drizzle-orm";
import { db } from "@/db";
import { orgSites, organizations } from "@/db/schema";
import { requireUser } from "@/lib/auth";
import { getSiteUrl } from "@/lib/site";
import { PageHeader } from "@/components/layout/page-header";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CopyLinkButton } from "@/components/ui/copy-link-button";
import { SiteForm } from "./site-form";

export default async function WebsiteEditorPage() {
  const user = await requireUser();
  const [[org], [site]] = await Promise.all([
    db.select({ name: organizations.name, slug: organizations.slug }).from(organizations).where(eq(organizations.id, user.orgId)),
    db.select().from(orgSites).where(eq(orgSites.orgId, user.orgId)).limit(1),
  ]);
  const url = `${getSiteUrl()}/site/${org.slug}`;

  return (
    <>
      <PageHeader title="Website" description="A simple mobile page for your business, with a booking form built in." />
      <div className="flex flex-1 flex-col gap-6 px-4 py-6 sm:px-6 lg:px-8">
        <Card className="flex flex-col gap-3 p-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h2 className="font-display text-sm font-bold">Your page</h2>
              <Badge tone={site?.published ? "accent" : "neutral"}>{site?.published ? "Live" : "Not published"}</Badge>
            </div>
            <code className="mt-1 block break-all font-mono text-xs text-faint">{url}</code>
          </div>
          <div className="flex flex-none items-center gap-3">
            <CopyLinkButton url={url} />
            {site?.published ? (
              <a href={url} target="_blank" rel="noopener" className="text-sm font-medium text-accent-deep hover:underline">
                View live →
              </a>
            ) : null}
          </div>
        </Card>
        <Card className="p-5">
          <SiteForm
            canEdit={user.role === "owner"}
            values={{
              published: site?.published ?? false,
              headline: site?.headline ?? org.name,
              tagline: site?.tagline ?? "",
              about: site?.about ?? "",
              phone: site?.phone ?? "",
              whatsappNumber: site?.whatsappNumber ?? "",
              address: site?.address ?? "",
              hours: site?.hours ?? "",
              mapUrl: site?.mapUrl ?? "",
              heroImageUrl: site?.heroImageUrl ?? "",
              accent: site?.accent ?? "green",
              services: site?.services ?? [],
            }}
          />
        </Card>
      </div>
    </>
  );
}
