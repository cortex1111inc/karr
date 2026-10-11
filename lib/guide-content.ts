// Copy and structure for the in-app Guide (/guide). Pure data + one pure
// helper, so the page, the interactive preview and the tests share it.

export type FlowStep = {
  id: string;
  title: string; // short label in the stepper
  who: "Customer" | "You" | "Automatic";
  headline: string;
  body: string;
  automatic: string[]; // what the product does without being asked
  href: string;
  cta: string;
};

// One rental, start to finish — the same story the interactive preview acts out.
export const FLOW: FlowStep[] = [
  {
    id: "enquiry",
    title: "Enquiry arrives",
    who: "Customer",
    headline: "Every enquiry lands in one place, whichever door it came through",
    body: "The booking form you share online, a call you log by hand, a walk-in at the counter, or a click on an influencer's tracking link — each becomes a lead the moment it arrives.",
    automatic: [
      "Anything you log by hand is a lead in two taps: name, number, what they want.",
      "Booking-form submissions are rate-limited and spam-filtered.",
      "Leads that came through a tracking link remember which influencer or ad sent them.",
      "You get an in-app notification (and optionally an email copy).",
    ],
    href: "/app/leads",
    cta: "Open leads",
  },
  {
    id: "follow-up",
    title: "Follow up",
    who: "You",
    headline: "The pipeline shows who needs a reply today",
    body: "Drag nothing, lose nothing: each lead sits in New, Contacted, Quoted, Booked or Lost. Add a note, set a follow-up date, assign it to a teammate.",
    automatic: [
      "A follow-up that comes due shows up in your notifications that morning.",
      "A lead nobody has touched for 5 days (you choose the number) nudges its owner.",
      "Still untouched after twice that, it is escalated to you as the workspace owner.",
      "Every stage change is recorded, so the funnel in Reports is real history.",
    ],
    href: "/app/leads",
    cta: "Open the pipeline",
  },
  {
    id: "quote",
    title: "Send a quote",
    who: "You",
    headline: "A GST-correct quote in a minute, pre-filled from the booking",
    body: "Pick the lead and the line items. If the lead has a vehicle and rental dates, the rental line fills itself: days × the daily rate. Share it as a link, by email, or as a printable PDF.",
    automatic: [
      "Totals are computed once, server-side, so what the customer sees is what is stored.",
      "CGST + SGST within your state, IGST across states — worked out from your state and the place of supply.",
      "Sending a quote moves a new or contacted lead to Quoted.",
      "Quote numbers are gap-free, even if two people create one at the same moment.",
    ],
    href: "/app/quotations/new",
    cta: "Create a quotation",
  },
  {
    id: "accept",
    title: "Customer accepts",
    who: "Customer",
    headline: "The customer answers on the quote link — no login, no app",
    body: "They open the link, read the quote, and tap Accept or ask for changes. You see the reply on the quotation and in your notifications.",
    automatic: [
      "Acceptance marks the quotation accepted and notifies you immediately.",
      "A change request keeps the quote open and passes their message to you.",
      "The public link is unguessable, rate-limited and hidden from search engines.",
    ],
    href: "/app/quotations",
    cta: "Open quotations",
  },
  {
    id: "book",
    title: "Book the vehicle",
    who: "You",
    headline: "Assign a car and dates — double-bookings are refused",
    body: "Give the lead rental dates and pick a vehicle. The fleet calendar shows the whole week at a glance. Converting the lead creates the customer and marks it Booked.",
    automatic: [
      "Overlapping dates on the same vehicle are rejected with the name of the clash.",
      "A booked lead marks its vehicle Rented.",
      "Once every booked rental on a vehicle has ended, the nightly job sets it back to Available.",
      "Each lead has a private status link you can share with the customer.",
    ],
    href: "/app/vehicles/calendar",
    cta: "Open the fleet calendar",
  },
  {
    id: "invoice",
    title: "Invoice",
    who: "You",
    headline: "One click from the quote, and stock follows the invoice",
    body: "Convert the accepted quote, or add lines from inventory (parts, consumables). The invoice carries your GSTIN, the customer's, HSN/SAC codes and your payment terms.",
    automatic: [
      "Stock-linked lines are deducted in the same transaction as the invoice — if one line is short, nothing is saved.",
      "Voiding an invoice returns the stock; reinstating it takes it again.",
      "Items falling below their alert level notify you so you can reorder.",
    ],
    href: "/app/invoices/new",
    cta: "Create an invoice",
  },
  {
    id: "paid",
    title: "Get paid",
    who: "Customer",
    headline: "Cash at the counter, UPI on the phone, or a Pay now button",
    body: "Record cash, card, UPI or bank transfers yourself, or connect Razorpay so customers can pay the balance from the invoice link. Part payments are fine.",
    automatic: [
      "Status is derived from the payments: partial, then paid — you never type 'paid'.",
      "An online payment is recorded once, even if the gateway delivers it twice.",
      "Unpaid invoices nudge you after 7 days (adjustable), repeated weekly until the invoice is settled.",
    ],
    href: "/app/invoices",
    cta: "Open invoices",
  },
  {
    id: "retain",
    title: "Bring them back",
    who: "Automatic",
    headline: "Customers due for a service show up on their own",
    body: "Ninety days after a visit (you choose the interval) the customer appears in your notifications, with a link to their record — so you can call or email them and book the next visit.",
    automatic: [
      "A daily job at 3 AM UTC checks every customer and rolls their next-due date forward once you've been told.",
      "The same job flags quiet leads, unpaid invoices and low stock.",
      "Each person chooses which reminders they receive, and can get an email copy.",
    ],
    href: "/app/customers",
    cta: "Open customers",
  },
  {
    id: "measure",
    title: "See what works",
    who: "You",
    headline: "Which channel, which person, which week",
    body: "Reports show the funnel from real stage history, revenue by week, receivables by age, and how each influencer or ad performed — including the commission you owe them.",
    automatic: [
      "Every KPI shows the change against the previous period.",
      "Receivables are bucketed 0–30, 31–60 and 60+ days.",
      "Export leads and invoices as CSV, all-time or for a date range, for your accountant.",
    ],
    href: "/app/reports",
    cta: "Open reports",
  },
];

export type FeatureGroup = "Sales" | "Operations" | "Growth" | "Automation" | "Admin";
export const FEATURE_GROUPS: FeatureGroup[] = ["Sales", "Operations", "Growth", "Automation", "Admin"];

export type Feature = {
  id: string;
  group: FeatureGroup;
  title: string;
  summary: string;
  details: string[];
  href: string;
  ownerOnly?: boolean;
};

export const FEATURES: Feature[] = [
  {
    id: "pipeline",
    group: "Sales",
    title: "Lead pipeline",
    summary: "Every enquiry, its stage, its owner, its next step.",
    details: [
      "Five stages with a board view that scrolls sideways on a phone.",
      "Notes, calls and stage changes build a timeline per lead.",
      "Assign to a teammate, set follow-up dates, attach rental dates and a vehicle.",
      "Filter by source or stage; export everything to CSV.",
    ],
    href: "/app/leads",
  },
  {
    id: "customers",
    group: "Sales",
    title: "Customers",
    summary: "A record for everyone who has booked, with their history.",
    details: [
      "Created when a lead is converted; vehicle number and notes kept alongside.",
      "Next-service date drives the automatic reminders.",
      "Jump to their quotations and invoices from one place.",
    ],
    href: "/app/customers",
  },
  {
    id: "quotes",
    group: "Sales",
    title: "Quotations",
    summary: "Share a link; the customer accepts it themselves.",
    details: [
      "GST optional, with CGST/SGST or IGST worked out for you.",
      "Optional HSN/SAC code per line and the customer's GSTIN.",
      "Email it, share the link, or print it to PDF.",
      "Convert to an invoice with one click.",
    ],
    href: "/app/quotations",
  },
  {
    id: "invoices",
    group: "Sales",
    title: "Invoices & payments",
    summary: "Gap-free numbering, part payments, and a status you can trust.",
    details: [
      "Record cash, card, UPI or bank transfers; delete a wrong entry (owner only).",
      "Paid and partial are calculated from the payments, never typed in.",
      "Stock-linked lines are deducted automatically.",
      "Void an invoice to return its stock.",
    ],
    href: "/app/invoices",
  },
  {
    id: "online-pay",
    group: "Sales",
    title: "Online payments",
    summary: "A Pay now button on every invoice link, via Razorpay.",
    details: [
      "UPI, cards and netbanking; the balance due is what gets charged.",
      "A signed webhook records the payment against the invoice once.",
      "Connect your own Razorpay account on Integrations — keys are stored encrypted.",
    ],
    href: "/app/integrations",
    ownerOnly: true,
  },
  {
    id: "fleet",
    group: "Operations",
    title: "Fleet & calendar",
    summary: "Which car is where, this week and next.",
    details: [
      "Per-vehicle status: available, rented, maintenance, retired — and a daily rate.",
      "Week-view calendar; solid bars are booked, dashed are tentative.",
      "Overlapping bookings on one vehicle are blocked.",
      "Rental dates and the daily rate pre-fill the quotation.",
    ],
    href: "/app/vehicles",
  },
  {
    id: "stock",
    group: "Operations",
    title: "Inventory",
    summary: "Parts and consumables, with a trail of every change.",
    details: [
      "Quantity, alert level and cost price per item.",
      "Restock, usage and adjustments are logged; invoices write their own usage.",
      "Counts can never go negative, even with two people working at once.",
      "Low-stock alerts reach the owner.",
    ],
    href: "/app/inventory",
  },
  {
    id: "links",
    group: "Growth",
    title: "Tracking links",
    summary: "Know which influencer or ad actually brings bookings.",
    details: [
      "One short link per partner; clicks, leads, bookings and revenue are counted.",
      "Flat-per-booking or percentage commission is worked out for you.",
      "Attribution is remembered for 30 days after the click.",
    ],
    href: "/app/growth/links",
  },
  {
    id: "booking-page",
    group: "Growth",
    title: "Booking page",
    summary: "A public form your customers can use without an account.",
    details: [
      "Share one link on Instagram or your Google profile.",
      "Each request lands in your pipeline as a new lead, spam-filtered and rate-limited.",
      "Tracking links send visitors here and remember which partner sent them.",
    ],
    href: "/app/settings",
  },
  {
    id: "reports",
    group: "Growth",
    title: "Reports",
    summary: "Funnel, revenue, receivables and staff performance.",
    details: [
      "Funnel built from recorded stage changes; median time to book.",
      "Revenue and new leads per week as charts, with change vs the previous period.",
      "Outstanding receivables by age; CSV exports for leads and invoices.",
    ],
    href: "/app/reports",
  },
  {
    id: "reminders",
    group: "Automation",
    title: "Daily reminders",
    summary: "One nightly job covers everything that is time-based.",
    details: [
      "Customers due for service, follow-ups, stale leads and unpaid invoices — each as a notification to you.",
      "Low-stock alerts and vehicles returning to available.",
      "Safe to re-run: nothing is sent twice for the same reason on the same day.",
    ],
    href: "/app/settings",
  },
  {
    id: "email",
    group: "Automation",
    title: "Email",
    summary: "Email quotes and invoices to customers; alerts to staff.",
    details: ["Connect Resend with your own domain's from-address.", "A test button confirms it works before you rely on it."],
    href: "/app/integrations",
    ownerOnly: true,
  },
  {
    id: "notifications",
    group: "Automation",
    title: "Notifications",
    summary: "An inbox for what needs you, tuned per person.",
    details: [
      "Each person chooses which kinds they receive.",
      "Optionally get a copy by email.",
      "Unread count shows in the sidebar.",
    ],
    href: "/app/settings/account",
  },
  {
    id: "team",
    group: "Admin",
    title: "Team & roles",
    summary: "Invite staff; owners keep the sensitive controls.",
    details: [
      "Staff can work leads, quotes, invoices and stock.",
      "Only owners delete financial records, manage integrations, billing profile and the team.",
      "Removing someone also removes their login.",
    ],
    href: "/app/settings/team",
    ownerOnly: true,
  },
  {
    id: "billing-profile",
    group: "Admin",
    title: "Billing profile",
    summary: "Your legal details, printed on every document.",
    details: ["Legal name, GSTIN, state, address, logo and payment terms.", "The state decides CGST+SGST versus IGST on each document."],
    href: "/app/settings",
    ownerOnly: true,
  },
  {
    id: "audit",
    group: "Admin",
    title: "Audit log",
    summary: "Who changed what, for the changes that matter.",
    details: [
      "Integration changes, team changes, voids and deletions are recorded.",
      "Owner-only page, newest first.",
    ],
    href: "/app/settings/audit",
    ownerOnly: true,
  },
];

export type SetupKey =
  | "billing"
  | "team"
  | "vehicles"
  | "stock"
  | "link"
  | "email"
  | "payments"
  | "lead"
  | "quote"
  | "invoice";

export type SetupItem = { key: SetupKey; title: string; why: string; href: string; optional?: boolean };
export type SetupPhase = { id: string; title: string; blurb: string; items: SetupItem[] };

export const SETUP: SetupPhase[] = [
  {
    id: "basics",
    title: "1 · Basics",
    blurb: "Ten minutes, and the documents you send already look professional.",
    items: [
      { key: "billing", title: "Fill in your billing profile", why: "Legal name, GSTIN and state appear on every quote and invoice, and decide the GST split.", href: "/app/settings" },
      { key: "team", title: "Invite a teammate", why: "Give staff their own login so work can be assigned and tracked.", href: "/app/settings/team", optional: true },
      { key: "vehicles", title: "Add your vehicles", why: "Needed for rentals, availability and the fleet calendar. Skip if you only do servicing.", href: "/app/vehicles", optional: true },
      { key: "stock", title: "Add stock items", why: "Parts you sell or use, so invoices can deduct them. Skip if you don't track parts.", href: "/app/inventory", optional: true },
    ],
  },
  {
    id: "front",
    title: "2 · Customer-facing",
    blurb: "Where customers meet you.",
    items: [
      { key: "link", title: "Create a tracking link", why: "One per influencer or ad, so you can see what brings bookings.", href: "/app/growth/links", optional: true },
    ],
  },
  {
    id: "connect",
    title: "3 · Email and payments",
    blurb: "Both are optional. Without them, emails are only logged and invoices have no Pay now button.",
    items: [
      { key: "email", title: "Connect email", why: "Email quotes and invoices, and get staff alerts by email.", href: "/app/integrations", optional: true },
      { key: "payments", title: "Connect Razorpay", why: "Adds a Pay now button to every invoice link.", href: "/app/integrations", optional: true },
    ],
  },
  {
    id: "live",
    title: "4 · Go live",
    blurb: "Run one real job through the whole flow.",
    items: [
      { key: "lead", title: "Log your first lead", why: "From a call, a walk-in, or the booking form.", href: "/app/leads" },
      { key: "quote", title: "Send your first quotation", why: "Try the Accept button on the customer link yourself.", href: "/app/quotations/new" },
      { key: "invoice", title: "Issue your first invoice", why: "Then record a payment and watch the status change.", href: "/app/invoices/new" },
    ],
  },
];

export const ALL_SETUP_KEYS: SetupKey[] = SETUP.flatMap((p) => p.items.map((i) => i.key));

export function setupProgress(done: Record<SetupKey, boolean>) {
  const items = SETUP.flatMap((p) => p.items);
  const required = items.filter((i) => !i.optional);
  const requiredDone = required.filter((i) => done[i.key]).length;
  const optional = items.filter((i) => i.optional);
  const optionalDone = optional.filter((i) => done[i.key]).length;
  return {
    requiredDone,
    requiredTotal: required.length,
    optionalDone,
    optionalTotal: optional.length,
    percent: required.length === 0 ? 100 : Math.round((requiredDone / required.length) * 100),
  };
}
