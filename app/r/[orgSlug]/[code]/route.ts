import { NextResponse, type NextRequest } from "next/server";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { orgSites, organizations, trackingLinkClicks, trackingLinks } from "@/db/schema";
import { REF_COOKIE, REF_COOKIE_MAX_AGE } from "@/lib/growth";
import { clientKey, consumeRateLimit } from "@/lib/rate-limit";

// Public short link shared by influencers/ads. Records a click, remembers
// the link in a first-party cookie for 30 days (so a booking made later
// still gets attributed), then sends the visitor to the business's site.
export async function GET(request: NextRequest, { params }: { params: Promise<{ orgSlug: string; code: string }> }) {
  const { orgSlug, code } = await params;

  const [org] = await db
    .select({ id: organizations.id, slug: organizations.slug })
    .from(organizations)
    .where(eq(organizations.slug, orgSlug))
    .limit(1);
  if (!org) return new NextResponse("Not found", { status: 404 });

  const [[link], [site]] = await Promise.all([
    db
      .select({ id: trackingLinks.id, archivedAt: trackingLinks.archivedAt })
      .from(trackingLinks)
      .where(and(eq(trackingLinks.orgId, org.id), eq(trackingLinks.code, code.toLowerCase())))
      .limit(1),
    db.select({ published: orgSites.published }).from(orgSites).where(eq(orgSites.orgId, org.id)).limit(1),
  ]);

  const destination = site?.published ? `/site/${org.slug}` : `/book/${org.slug}`;
  const response = NextResponse.redirect(new URL(destination, request.nextUrl.origin));

  // Unknown or archived links still land on the business (old posts keep
  // working) but aren't credited.
  if (link && !link.archivedAt) {
    // One counted click per visitor per link per 10 minutes, so refreshes
    // and link-preview bots don't inflate the numbers.
    if (await consumeRateLimit(await clientKey(`click:${link.id}`), 1, 600)) {
      await db.insert(trackingLinkClicks).values({ orgId: org.id, trackingLinkId: link.id });
    }
    response.cookies.set(REF_COOKIE, link.id, {
      httpOnly: true,
      sameSite: "lax",
      secure: request.nextUrl.protocol === "https:",
      maxAge: REF_COOKIE_MAX_AGE,
      path: "/",
    });
  }

  return response;
}
