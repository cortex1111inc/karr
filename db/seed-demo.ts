import "dotenv/config";
import { randomUUID } from "node:crypto";
import { and, eq, like } from "drizzle-orm";
import { db, dbClient } from "./index";
import * as t from "./schema";
import { calculateTotals } from "../lib/billing/money";
import { generatePublicToken } from "../lib/tokens";

// Fills a workspace with ~3 months of believable activity for a small Kerala
// car-rental + service business, so the app can be explored as if it were
// already in daily use.
//
// Usage:  npm run db:seed-demo -- admin@gmail.com            (refuses if the workspace already has leads)
//         npm run db:seed-demo -- admin@gmail.com --reset    (wipes that workspace's data first)
//
// Every phone number is +91 55555 xxxxx (not a valid Indian mobile range), so
// reminders and campaigns can never reach a real person even once WhatsApp is
// connected. The three extra staff have no login.

// ---------- deterministic randomness ----------
let seed = 20261005;
function rand() {
  seed |= 0;
  seed = (seed + 0x6d2b79f5) | 0;
  let x = Math.imul(seed ^ (seed >>> 15), 1 | seed);
  x = (x + Math.imul(x ^ (x >>> 7), 61 | x)) ^ x;
  return ((x ^ (x >>> 14)) >>> 0) / 4294967296;
}
const int = (a: number, b: number) => a + Math.floor(rand() * (b - a + 1));
const pick = <T,>(xs: readonly T[]): T => xs[Math.floor(rand() * xs.length)];
const chance = (p: number) => rand() < p;
function weighted<T>(entries: [T, number][]): T {
  const total = entries.reduce((s, [, w]) => s + w, 0);
  let r = rand() * total;
  for (const [v, w] of entries) if ((r -= w) <= 0) return v;
  return entries[entries.length - 1][0];
}
const round2 = (n: number) => Math.round(n * 100) / 100;

// ---------- time ----------
const NOW = new Date();
const DAY = 86_400_000;
const at = (daysAgo: number, hour = int(9, 18)) => {
  const d = new Date(NOW.getTime() - daysAgo * DAY);
  d.setHours(hour, int(0, 59), 0, 0);
  return d > NOW ? new Date(NOW.getTime() - 10 * 60_000) : d;
};
const minDate = (a: Date, b: Date) => (a < b ? a : b);
const addMs = (d: Date, ms: number) => new Date(d.getTime() + ms);
const iso = (d: Date) => d.toISOString().slice(0, 10);

// ---------- reference data ----------
const FIRST = ["Anil", "Suresh", "Rahul", "Anjali", "Fathima", "Mohammed", "Priya", "Arun", "Divya", "Jibin", "Neethu", "Shafeeq", "Lakshmi", "Vishnu", "Aswin", "Meera", "Sajid", "Remya", "Nikhil", "Hasna", "Abdul", "Sreejith", "Athira", "Kiran", "Sana", "Joseph", "Maria", "Thomas", "Gopika", "Faisal"];
const LAST = ["Nair", "Menon", "Pillai", "Kurian", "Thomas", "Basheer", "Krishnan", "Iyer", "Varghese", "Rahman", "Joseph", "Das", "Kumar", "Mathew", "Hameed", "Warrier", "George", "Shaji", "Mohan", "Sharma"];
const name = () => `${pick(FIRST)} ${pick(LAST)}`;
let phoneCounter = 0;
const phone = () => `+91 55555 ${String(10000 + ++phoneCounter * 7).slice(-5)}`;

const FLEET = [
  { make: "Maruti Suzuki", model: "Swift", category: "Hatchback", rate: 1800 },
  { make: "Hyundai", model: "i20", category: "Hatchback", rate: 2000 },
  { make: "Honda", model: "City", category: "Sedan", rate: 2600 },
  { make: "Tata", model: "Nexon", category: "SUV", rate: 2800 },
  { make: "Kia", model: "Seltos", category: "SUV", rate: 3200 },
  { make: "Hyundai", model: "Creta", category: "SUV", rate: 3400 },
  { make: "Maruti Suzuki", model: "Ertiga", category: "MPV", rate: 3000 },
  { make: "Toyota", model: "Innova Crysta", category: "MPV", rate: 4200 },
  { make: "Mahindra", model: "Thar", category: "SUV", rate: 4500 },
  { make: "Toyota", model: "Glanza", category: "Hatchback", rate: 1900 },
];
const STOCK = [
  ["Engine oil 5W-30 (1L)", "OIL-530", "L", 60, 12, 480],
  ["Oil filter", "FLT-OIL", "pcs", 40, 8, 220],
  ["Air filter", "FLT-AIR", "pcs", 25, 6, 350],
  ["Cabin / AC filter", "FLT-CAB", "pcs", 20, 5, 420],
  ["Brake pad set (front)", "BRK-F", "set", 14, 4, 1650],
  ["Brake pad set (rear)", "BRK-R", "set", 12, 4, 1400],
  ["Spark plug", "SPK-01", "pcs", 36, 8, 260],
  ["Wiper blade (pair)", "WPR-01", "pair", 9, 4, 380],
  ["Coolant (1L)", "CLT-01", "L", 22, 6, 210],
  ["Car battery 45Ah", "BAT-45", "pcs", 7, 3, 4800],
  ["AC gas R134a (can)", "ACG-134", "can", 6, 3, 900],
  ["Headlight bulb H4", "BLB-H4", "pcs", 5, 6, 320],
] as const;

const SOURCES = [
  ["whatsapp", 30],
  ["instagram", 20],
  ["call", 15],
  ["website", 12],
  ["walk_in", 10],
  ["referral", 9],
  ["other", 4],
] as const;
const SERVICES: [string, number, string][] = [
  ["Full service + car wash", 2800, "9987"],
  ["Engine oil & filter change", 1500, "9987"],
  ["Brake pad replacement", 1200, "9987"],
  ["AC repair & gas top-up", 1800, "9987"],
  ["Wheel alignment & balancing", 1100, "9987"],
  ["Battery replacement", 600, "9987"],
  ["Periodic inspection", 900, "9987"],
];
const PART_FOR: Record<string, number[]> = {
  "Full service + car wash": [0, 1, 2],
  "Engine oil & filter change": [0, 1],
  "Brake pad replacement": [4],
  "AC repair & gas top-up": [3, 10],
  "Wheel alignment & balancing": [],
  "Battery replacement": [9],
  "Periodic inspection": [6],
};

async function main() {
  const [email, ...flags] = process.argv.slice(2);
  const reset = flags.includes("--reset");
  if (!email) {
    console.error("Usage: npm run db:seed-demo -- you@business.com [--reset]");
    process.exit(1);
  }

  const [owner] = await db.select().from(t.profiles).where(eq(t.profiles.email, email)).limit(1);
  if (!owner) {
    console.error(`No workspace member with email ${email}. Sign up / seed that user first.`);
    process.exit(1);
  }
  const orgId = owner.orgId;

  const [existing] = await db.select({ id: t.leads.id }).from(t.leads).where(eq(t.leads.orgId, orgId)).limit(1);
  if (existing && !reset) {
    console.error("This workspace already has data. Re-run with --reset to wipe it first (customers, leads, invoices, stock, vehicles…).");
    process.exit(1);
  }

  if (reset) {
    console.log("Wiping existing workspace data…");
    await db.delete(t.invoices).where(eq(t.invoices.orgId, orgId));
    await db.delete(t.quotations).where(eq(t.quotations.orgId, orgId));
    await db.delete(t.leads).where(eq(t.leads.orgId, orgId));
    await db.delete(t.customers).where(eq(t.customers.orgId, orgId));
    await db.delete(t.vehicles).where(eq(t.vehicles.orgId, orgId));
    await db.delete(t.stockItems).where(eq(t.stockItems.orgId, orgId));
    await db.delete(t.campaigns).where(eq(t.campaigns.orgId, orgId));
    await db.delete(t.whatsappMessages).where(eq(t.whatsappMessages.orgId, orgId));
    await db.delete(t.emailMessages).where(eq(t.emailMessages.orgId, orgId));
    await db.delete(t.trackingLinks).where(eq(t.trackingLinks.orgId, orgId));
    await db.delete(t.notifications).where(eq(t.notifications.orgId, orgId));
    await db.delete(t.auditLog).where(eq(t.auditLog.orgId, orgId));
    await db.delete(t.profiles).where(and(eq(t.profiles.orgId, orgId), like(t.profiles.email, "demo-%@example.com")));
  }

  // ---------- organisation ----------
  await db
    .update(t.organizations)
    .set({
      name: "Malabar Drive & Care",
      legalName: "Malabar Drive & Care Pvt Ltd",
      gstin: "32AABCM1234F1Z5",
      stateCode: "32",
      billingAddress: "NH 66 Bypass, Palarivattom\nKochi, Kerala 682025",
      invoiceTerms: "Payment due within 7 days. UPI: malabardrive@okbank · Bank: Federal Bank, A/c 1234567890, IFSC FDRL0001234.\nFuel and tolls are extra. Security deposit refunded within 3 working days of return.",
      defaultGstRate: 18,
      serviceIntervalDays: 90,
      staleLeadDays: 5,
      invoiceReminderDays: 7,
      reminderMessage: "Hi {{name}}, it's been a while since your last service at Malabar Drive & Care — reply to book a slot this week!",
    })
    .where(eq(t.organizations.id, orgId));

  // ---------- team ----------
  const staffSeed = [
    { fullName: "Anjali Menon", email: "demo-anjali@example.com", phone: "+91 55555 90001" },
    { fullName: "Rahul Nair", email: "demo-rahul@example.com", phone: "+91 55555 90002" },
    { fullName: "Fathima Basheer", email: "demo-fathima@example.com", phone: "+91 55555 90003" },
  ];
  const staff = await db
    .insert(t.profiles)
    .values(staffSeed.map((s) => ({ id: randomUUID(), orgId, role: "staff" as const, ...s })))
    .returning({ id: t.profiles.id, fullName: t.profiles.fullName });
  const assignees = [owner.id, ...staff.map((s) => s.id)];

  // ---------- vehicles ----------
  const vehicleRows = FLEET.map((v, i) => ({
    id: randomUUID(),
    orgId,
    registrationNumber: `KL-07-${pick(["AB", "BC", "CD", "DE", "EF"])}-${1200 + i * 137}`,
    make: v.make,
    model: v.model,
    category: v.category,
    dailyRate: String(v.rate),
    status: "available" as "available" | "rented" | "maintenance" | "retired",
    notes: chance(0.3) ? "Insurance renewal due in the next quarter" : null,
    createdAt: at(120),
  }));

  // Non-overlapping rental slots per vehicle, from ~85 days ago to ~25 days ahead.
  type Slot = { vehicle: (typeof vehicleRows)[number]; start: Date; end: Date };
  const slots: Slot[] = [];
  for (const v of vehicleRows) {
    let cursor = at(int(60, 85), 0);
    for (;;) {
      cursor = addMs(cursor, int(0, 6) * DAY);
      const len = int(2, 7);
      const start = cursor;
      const end = addMs(start, (len - 1) * DAY);
      if (start.getTime() > NOW.getTime() + 25 * DAY) break;
      if (chance(0.25)) slots.push({ vehicle: v, start, end });
      cursor = addMs(end, 1 * DAY);
    }
  }
  slots.sort((a, b) => a.start.getTime() - b.start.getTime());
  const isoDate = (d: Date) => iso(new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate())));
  const today = isoDate(NOW);
  for (const v of vehicleRows) {
    const current = slots.some((s) => s.vehicle === v && isoDate(s.start) <= today && isoDate(s.end) >= today && s.start <= NOW);
    if (current) v.status = "rented";
  }
  const toMaintain = vehicleRows.find((v) => v.status === "available" && v.model === "Thar");
  if (toMaintain) {
    toMaintain.status = "maintenance";
    toMaintain.notes = "In the workshop — clutch replacement, back on Thursday";
  }
  await db.insert(t.vehicles).values(vehicleRows);

  // ---------- stock ----------
  const stockRows = STOCK.map(([n, sku, unit, qty, low, cost], i) => ({
    id: randomUUID(),
    orgId,
    name: n,
    sku,
    unit,
    quantityOnHand: qty + int(10, 25), // restocked; usage below brings it back down
    lowStockThreshold: low,
    costPrice: String(cost),
    createdAt: at(110 - i),
    updatedAt: NOW,
  }));
  await db.insert(t.stockItems).values(stockRows); // invoice lines reference these
  const stockQty = new Map<string, number>(stockRows.map((s) => [s.id, s.quantityOnHand]));
  const initialQty = new Map(stockQty);
  const movements: (typeof t.stockMovements.$inferInsert)[] = [];

  // ---------- customers ----------
  const customerRows = Array.from({ length: 38 }, (_, i) => {
    const fullName = name();
    const last = chance(0.75) ? at(int(5, 100)) : null;
    const base = last ?? at(int(5, 100));
    const interval = 90;
    const next = addMs(base, interval * DAY);
    return {
      id: randomUUID(),
      orgId,
      fullName,
      phone: phone(),
      email: chance(0.6) ? `${fullName.toLowerCase().replace(/[^a-z]+/g, ".")}@example.com` : null,
      vehicleNumber: chance(0.7) ? `KL-${pick(["07", "08", "41", "43", "63"])}-${pick(["A", "B", "C", "D", "E", "F"])}${pick(["K", "M", "P"])}-${int(1000, 9999)}` : null,
      notes: chance(0.2) ? pick(["Prefers pickup after 6pm", "Corporate account — invoice monthly", "Always asks for the white Seltos", "VIP: refers friends often"]) : null,
      lastServiceAt: last,
      nextServiceDueAt: next,
      createdAt: at(int(20, 118)),
      _i: i,
    };
  });
  await db.insert(t.customers).values(customerRows.map(({ _i, ...c }) => ({ ...c, createdAt: c.createdAt })));
  void customerRows.map((c) => c._i);

  // ---------- tracking links ----------
  const linkRows = [
    { name: "Reels with Arjun Travels", code: "arjun-7k2d", channel: "influencer" as const, partnerName: "Arjun Travels", commissionType: "flat" as const, commissionValue: "250", share: 0.34, clicks: 188 },
    { name: "Instagram ads — monsoon offer", code: "monsoon-p3ax", channel: "instagram_ads" as const, partnerName: null, commissionType: "none" as const, commissionValue: null, share: 0.3, clicks: 342 },
    { name: "Google ads — Kochi car rental", code: "gads-kochi", channel: "google_ads" as const, partnerName: null, commissionType: "none" as const, commissionValue: null, share: 0.2, clicks: 129 },
    { name: "Airport flyer QR", code: "airport-qr9", channel: "flyer" as const, partnerName: "Cochin airport kiosk", commissionType: "percent" as const, commissionValue: "5", share: 0.16, clicks: 64 },
  ].map((l) => ({ ...l, id: randomUUID(), createdAt: at(int(70, 95)) }));
  await db.insert(t.trackingLinks).values(
    linkRows.map(({ share, clicks, ...l }) => ({ ...l, orgId })),
  );
  const clickRows: (typeof t.trackingLinkClicks.$inferInsert)[] = [];
  for (const l of linkRows) {
    for (let i = 0; i < l.clicks; i++) clickRows.push({ orgId, trackingLinkId: l.id, clickedAt: at(Math.floor(Math.pow(rand(), 1.4) * 70), int(7, 23)) });
  }
  for (let i = 0; i < clickRows.length; i += 500) await db.insert(t.trackingLinkClicks).values(clickRows.slice(i, i + 500));

  // ---------- leads ----------
  type LeadPlan = {
    id: string;
    contactName: string;
    contactPhone: string;
    interest: string;
    source: (typeof SOURCES)[number][0];
    stage: "new" | "contacted" | "quoted" | "booked" | "lost";
    createdAt: Date;
    assignedTo: string | null;
    trackingLinkId: string | null;
    vehicleId: string | null;
    rentalStart: string | null;
    rentalEnd: string | null;
    customerId: string | null;
    kind: "rental" | "service";
    serviceIdx: number;
    slot?: Slot;
    contactedAt: Date | null;
    quotedAt: Date | null;
    bookedAt: Date | null;
    lostAt: Date | null;
    lastTouch: Date;
    followUpAt: Date | null;
  };
  const plans: LeadPlan[] = [];
  const customerPool = [...customerRows];

  function basePlan(createdAt: Date, kind: "rental" | "service", slot?: Slot): LeadPlan {
    const age = (NOW.getTime() - createdAt.getTime()) / DAY;
    const stage: LeadPlan["stage"] = slot
      ? slot.start > NOW
        ? weighted([["booked", 55], ["quoted", 30], ["contacted", 15]])
        : "booked"
      : age < 3
        ? weighted([["new", 60], ["contacted", 40]])
        : age < 10
          ? weighted([["new", 20], ["contacted", 30], ["quoted", 30], ["booked", 15], ["lost", 5]])
          : weighted([["new", 4], ["contacted", 12], ["quoted", 12], ["booked", 42], ["lost", 30]]);
    const trackingLinkId = chance(0.4) ? weighted(linkRows.map((l) => [l.id, l.share] as [string, number])) : null;
    const source = trackingLinkId
      ? (linkRows.find((l) => l.id === trackingLinkId)!.channel === "instagram_ads" || linkRows.find((l) => l.id === trackingLinkId)!.channel === "influencer" ? "instagram" : "website")
      : weighted(SOURCES.map(([s, w]) => [s, w] as [(typeof SOURCES)[number][0], number]));
    const svc = int(0, SERVICES.length - 1);
    const model = slot ? `${slot.vehicle.make} ${slot.vehicle.model}` : pick(FLEET).model;
    const days = slot ? Math.round((slot.end.getTime() - slot.start.getTime()) / DAY) + 1 : 0;
    const interest =
      kind === "rental"
        ? pick([`Self-drive ${model}, ${days || int(2, 5)} days`, `${model} for a family trip`, `Airport pickup + ${model}`, `Weekend rental — ${model}`])
        : SERVICES[svc][0];
    const p: LeadPlan = {
      id: randomUUID(),
      contactName: name(),
      contactPhone: phone(),
      interest,
      source,
      stage,
      createdAt,
      assignedTo: chance(0.88) ? pick(assignees) : null,
      trackingLinkId,
      vehicleId: slot?.vehicle.id ?? null,
      rentalStart: slot ? isoDate(slot.start) : null,
      rentalEnd: slot ? isoDate(slot.end) : null,
      customerId: null,
      kind,
      serviceIdx: svc,
      slot,
      contactedAt: null,
      quotedAt: null,
      bookedAt: null,
      lostAt: null,
      lastTouch: createdAt,
      followUpAt: null,
    };
    // Stage timeline: strictly increasing, and squeezed to end before now if needed.
    const steps: [keyof Pick<LeadPlan, "contactedAt" | "quotedAt" | "bookedAt" | "lostAt">, number][] = [];
    if (stage !== "new") steps.push(["contactedAt", int(1, 20) * 3_600_000]);
    if (stage === "quoted" || stage === "booked") steps.push(["quotedAt", int(3, 40) * 3_600_000]);
    if (stage === "booked") steps.push(["bookedAt", int(4, 60) * 3_600_000]);
    if (stage === "lost") steps.push(["lostAt", int(1, 6) * DAY]);
    const span = steps.reduce((sum, [, gap]) => sum + gap, 0);
    const room = NOW.getTime() - createdAt.getTime() - 60_000;
    const scale = span > room ? Math.max(room, steps.length * 1000) / span : 1;
    let cursor = createdAt.getTime();
    for (const [key, gap] of steps) {
      cursor += Math.max(1000, Math.floor(gap * scale));
      p[key] = new Date(cursor);
    }
    p.lastTouch = p.lostAt ?? p.bookedAt ?? p.quotedAt ?? p.contactedAt ?? createdAt;
    // A few open leads have gone quiet; a few have follow-ups due.
    if (stage === "contacted" || stage === "quoted") {
      if (chance(0.5)) p.followUpAt = addMs(NOW, int(-3, 4) * DAY);
    }
    return p;
  }

  for (const slot of slots) {
    const created = minDate(addMs(slot.start, -int(2, 10) * DAY), addMs(NOW, -3_600_000));
    plans.push(basePlan(created, "rental", slot));
  }
  const extra = 108 - plans.length;
  for (let i = 0; i < extra; i++) {
    const age = Math.floor(Math.pow(rand(), 1.15) * 88);
    plans.push(basePlan(at(age), chance(0.35) ? "rental" : "service"));
  }
  // Booked leads become customers (reusing existing ones about half the time).
  for (const p of plans) {
    if (p.stage === "booked") {
      const c = chance(0.5) && customerPool.length ? pick(customerPool) : null;
      if (c) {
        p.customerId = c.id;
        p.contactName = c.fullName;
        p.contactPhone = c.phone;
      }
    }
  }
  // Remaining booked leads without a customer get a new one.
  const newCustomers: typeof customerRows = [];
  for (const p of plans) {
    if (p.stage === "booked" && !p.customerId) {
      const c = {
        id: randomUUID(),
        orgId,
        fullName: p.contactName,
        phone: p.contactPhone,
        email: chance(0.5) ? `${p.contactName.toLowerCase().replace(/[^a-z]+/g, ".")}@example.com` : null,
        vehicleNumber: p.kind === "service" ? `KL-07-${pick(["A", "B", "C"])}${pick(["K", "M"])}-${int(1000, 9999)}` : null,
        notes: null,
        lastServiceAt: p.bookedAt,
        nextServiceDueAt: addMs(p.bookedAt ?? NOW, 90 * DAY),
        lastReminderSentAt: null,
        createdAt: p.bookedAt ?? p.createdAt,
        _i: -1,
      };
      p.customerId = c.id;
      newCustomers.push(c as (typeof customerRows)[number]);
    }
  }
  if (newCustomers.length) await db.insert(t.customers).values(newCustomers.map(({ _i, ...c }) => c));
  void newCustomers.map((c) => c._i);

  await db.insert(t.leads).values(
    plans.map((p) => ({
      id: p.id,
      orgId,
      customerId: p.customerId,
      assignedTo: p.assignedTo,
      vehicleId: p.vehicleId,
      trackingLinkId: p.trackingLinkId,
      contactName: p.contactName,
      contactPhone: p.contactPhone,
      interest: p.interest,
      source: p.source,
      stage: p.stage,
      followUpAt: p.followUpAt,
      rentalStart: p.rentalStart,
      rentalEnd: p.rentalEnd,
      publicToken: generatePublicToken(),
      createdAt: p.createdAt,
      updatedAt: p.lastTouch,
    })),
  );

  const history: (typeof t.leadStageChanges.$inferInsert)[] = [];
  const activities: (typeof t.leadActivities.$inferInsert)[] = [];
  for (const p of plans) {
    const by = p.assignedTo ?? owner.id;
    history.push({ orgId, leadId: p.id, fromStage: null, toStage: "new", changedBy: null, changedAt: p.createdAt });
    let prev: LeadPlan["stage"] = "new";
    for (const [stage, when] of [["contacted", p.contactedAt], ["quoted", p.quotedAt], ["booked", p.bookedAt], ["lost", p.lostAt]] as const) {
      if (!when) continue;
      history.push({ orgId, leadId: p.id, fromStage: prev, toStage: stage, changedBy: by, changedAt: when });
      activities.push({ leadId: p.id, authorId: by, kind: "stage_change", body: `Moved to ${stage}`, createdAt: when });
      prev = stage;
    }
    if (p.contactedAt) {
      activities.push({
        leadId: p.id,
        authorId: by,
        kind: pick(["call", "whatsapp", "note"] as const),
        body: pick([
          "Called — wants the quote on WhatsApp",
          "Shared the rate card and availability",
          "Customer comparing with another operator, will confirm by evening",
          "Asked for a discount on a 5-day rental",
          "Confirmed pickup time and documents needed",
          "Needs the car by Friday morning",
        ]),
        createdAt: addMs(p.contactedAt, int(5, 90) * 60_000),
      });
    }
    if (p.stage === "lost") {
      activities.push({ leadId: p.id, authorId: by, kind: "note", body: pick(["Went with a cheaper operator", "Plans changed — no longer travelling", "Not reachable after 3 attempts", "Wanted a model we didn't have free"]), createdAt: addMs(p.lostAt!, 60_000) });
    }
  }
  for (let i = 0; i < history.length; i += 400) await db.insert(t.leadStageChanges).values(history.slice(i, i + 400));
  for (let i = 0; i < activities.length; i += 400) await db.insert(t.leadActivities).values(activities.slice(i, i + 400));

  // ---------- quotations & invoices ----------
  let quoN = 0;
  let invN = 0;
  const quoRows: (typeof t.quotations.$inferInsert)[] = [];
  const quoItemRows: (typeof t.quotationItems.$inferInsert)[] = [];
  const invRows: (typeof t.invoices.$inferInsert)[] = [];
  const invItemRows: (typeof t.invoiceItems.$inferInsert)[] = [];
  const payRows: (typeof t.payments.$inferInsert)[] = [];
  const invMeta: { id: string; number: string; status: string; total: number; paid: number; createdAt: Date; contactName: string }[] = [];

  const GSTINS = [["27AABCT1332L1ZD", "27"], ["29AAACH7409R1ZX", "29"], ["33AAACR5055K1Z7", "33"]] as const;
  const fixedPos = (): { gstin: string | null; pos: string | null; inter: boolean } => {
    if (chance(0.12)) {
      const [g, s] = pick(GSTINS);
      return { gstin: g, pos: s, inter: true };
    }
    return { gstin: null, pos: chance(0.7) ? "32" : null, inter: false };
  };

  function buildItems(p: LeadPlan) {
    type Item = { description: string; quantity: number; unitPrice: number; hsnSac: string | null; stockItemId: string | null };
    const items: Item[] = [];
    if (p.kind === "rental" && p.slot) {
      const days = Math.round((p.slot.end.getTime() - p.slot.start.getTime()) / DAY) + 1;
      items.push({
        description: `${p.slot.vehicle.make} ${p.slot.vehicle.model} (${p.slot.vehicle.registrationNumber}) rental, ${isoDate(p.slot.start)} to ${isoDate(p.slot.end)}`,
        quantity: days,
        unitPrice: Number(p.slot.vehicle.dailyRate),
        hsnSac: "9966",
        stockItemId: null,
      });
      if (chance(0.35)) items.push({ description: "Driver allowance", quantity: days, unitPrice: 500, hsnSac: "9966", stockItemId: null });
      if (chance(0.3)) items.push({ description: "Airport pickup / drop", quantity: 1, unitPrice: 800, hsnSac: "9966", stockItemId: null });
    } else if (p.kind === "rental") {
      const v = pick(vehicleRows);
      const days = int(2, 5);
      items.push({ description: `${v.make} ${v.model} rental, ${days} days`, quantity: days, unitPrice: Number(v.dailyRate), hsnSac: "9966", stockItemId: null });
    } else {
      const [svcName, labour, sac] = SERVICES[p.serviceIdx];
      items.push({ description: svcName + " — labour", quantity: 1, unitPrice: labour, hsnSac: sac, stockItemId: null });
      for (const idx of PART_FOR[svcName] ?? []) {
        const s = stockRows[idx];
        items.push({ description: s.name, quantity: idx === 0 ? int(3, 4) : 1, unitPrice: round2(Number(s.costPrice) * 1.4), hsnSac: "8708", stockItemId: s.id });
      }
    }
    return items;
  }

  const sortedPlans = [...plans].sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
  for (const p of sortedPlans) {
    const wantsQuote = (p.stage === "quoted" || p.stage === "booked") && p.quotedAt && chance(0.85);
    const wantsInvoice = p.stage === "booked" && p.bookedAt && chance(0.88);
    if (!wantsQuote && !wantsInvoice) continue;
    const items = buildItems(p);
    const gstOn = chance(0.75);
    const { gstin, pos, inter } = fixedPos();
    const header = { gstEnabled: gstOn, gstRate: gstOn ? 18 : 0 };
    const totals = calculateTotals(items, header.gstEnabled, header.gstRate);

    if (wantsQuote) {
      const id = randomUUID();
      const n = `QUO-${String(++quoN).padStart(4, "0")}`;
      const respondedAt = p.stage === "booked" ? addMs(p.quotedAt!, int(2, 30) * 3_600_000) : null;
      quoRows.push({
        id,
        orgId,
        leadId: p.id,
        customerId: p.customerId,
        number: n,
        status: p.stage === "booked" ? "accepted" : p.quotedAt && NOW.getTime() - p.quotedAt.getTime() < 2 * DAY ? "sent" : weighted([["sent", 70], ["declined", 15], ["draft", 15]]),
        contactName: p.contactName,
        contactPhone: p.contactPhone,
        notes: chance(0.3) ? "Valid for 7 days. Rates exclude fuel and tolls." : null,
        gstEnabled: header.gstEnabled,
        gstRate: header.gstRate,
        placeOfSupply: pos,
        customerGstin: gstin,
        interState: header.gstEnabled && inter,
        respondedAt,
        customerResponse: respondedAt && chance(0.3) ? "Looks good, please go ahead" : null,
        subtotal: totals.subtotal.toFixed(2),
        taxAmount: totals.taxAmount.toFixed(2),
        total: totals.total.toFixed(2),
        publicToken: generatePublicToken(),
        createdBy: p.assignedTo ?? owner.id,
        createdAt: p.quotedAt!,
        updatedAt: respondedAt ?? p.quotedAt!,
      });
      items.forEach((it, i) =>
        quoItemRows.push({
          quotationId: id,
          description: it.description,
          hsnSac: it.hsnSac,
          stockItemId: it.stockItemId,
          quantity: String(it.quantity),
          unitPrice: it.unitPrice.toFixed(2),
          amount: round2(it.quantity * it.unitPrice).toFixed(2),
          sortOrder: i,
        }),
      );
    }

    if (wantsInvoice) {
      // Rentals bill when the trip ends (or starts, if still out); services shortly after booking.
      const billedAt = minDate(
        p.slot ? (p.slot.end < NOW ? addMs(p.slot.end, int(2, 20) * 3_600_000) : p.slot.start) : addMs(p.bookedAt!, int(1, 3) * DAY),
        addMs(NOW, -3_600_000),
      );
      if (billedAt < p.bookedAt!) continue;
      const ageDays = (NOW.getTime() - billedAt.getTime()) / DAY;
      let status: "draft" | "sent" | "partial" | "paid" | "void" = ageDays > 45
        ? weighted([["paid", 82], ["sent", 10], ["partial", 6], ["void", 2]])
        : ageDays > 12
          ? weighted([["paid", 55], ["partial", 17], ["sent", 25], ["void", 3]])
          : weighted([["paid", 28], ["partial", 17], ["sent", 40], ["draft", 15]]);
      if (p.slot && p.slot.start <= NOW && p.slot.end >= NOW && status === "paid") status = "partial"; // trip still running
      const id = randomUUID();
      const number = `INV-${String(++invN).padStart(4, "0")}`;

      // Stock: link only if it can be taken without going negative; void invoices never took any.
      const lines = items.map((it) => {
        if (!it.stockItemId || status === "void") return { ...it, stockItemId: status === "void" ? null : it.stockItemId };
        const have = stockQty.get(it.stockItemId) ?? 0;
        if (have - it.quantity < 0) return { ...it, stockItemId: null };
        stockQty.set(it.stockItemId, have - it.quantity);
        movements.push({ orgId, stockItemId: it.stockItemId, type: "usage", quantity: -it.quantity, note: `Invoice ${number}`, createdBy: p.assignedTo ?? owner.id, createdAt: billedAt });
        return it;
      });

      let paid = 0;
      if (status === "paid") paid = totals.total;
      else if (status === "partial") paid = Math.max(100, Math.round((totals.total * (0.3 + rand() * 0.4)) / 50) * 50);
      if (paid >= totals.total && status === "partial") status = "paid", (paid = totals.total);
      if (status === "paid" && paid > 0) {
        // sometimes settled in two instalments
        const parts = chance(0.25) && totals.total > 1000 ? 2 : 1;
        let remaining = totals.total;
        for (let k = 0; k < parts; k++) {
          const amt = k === parts - 1 ? remaining : Math.round((remaining * 0.5) / 50) * 50;
          remaining = round2(remaining - amt);
          payRows.push({ orgId, invoiceId: id, amount: amt.toFixed(2), method: weighted([["upi", 50], ["cash", 20], ["card", 15], ["bank_transfer", 15]]), recordedBy: owner.id, notes: null, paidAt: minDate(addMs(billedAt, (k + 1) * int(1, 5) * DAY), NOW), createdAt: billedAt });
        }
      } else if (status === "partial") {
        payRows.push({ orgId, invoiceId: id, amount: paid.toFixed(2), method: weighted([["upi", 55], ["cash", 30], ["card", 15]]), recordedBy: owner.id, notes: chance(0.4) ? "Advance" : null, paidAt: minDate(addMs(billedAt, int(0, 4) * DAY), NOW), createdAt: billedAt });
      }

      invRows.push({
        id,
        orgId,
        customerId: p.customerId,
        leadId: p.id,
        quotationId: quoRows.find((q) => q.leadId === p.id)?.id ?? null,
        number,
        status,
        contactName: p.contactName,
        contactPhone: p.contactPhone,
        notes: null,
        gstEnabled: header.gstEnabled,
        gstRate: header.gstRate,
        placeOfSupply: pos,
        customerGstin: gstin,
        interState: header.gstEnabled && inter,
        subtotal: totals.subtotal.toFixed(2),
        taxAmount: totals.taxAmount.toFixed(2),
        total: totals.total.toFixed(2),
        amountPaid: paid.toFixed(2),
        publicToken: generatePublicToken(),
        createdBy: p.assignedTo ?? owner.id,
        createdAt: billedAt,
        updatedAt: billedAt,
      });
      lines.forEach((it, i) =>
        invItemRows.push({
          invoiceId: id,
          description: it.description,
          hsnSac: it.hsnSac,
          stockItemId: it.stockItemId,
          quantity: String(it.quantity),
          unitPrice: it.unitPrice.toFixed(2),
          amount: round2(it.quantity * it.unitPrice).toFixed(2),
          sortOrder: i,
        }),
      );
      invMeta.push({ id, number, status, total: totals.total, paid, createdAt: billedAt, contactName: p.contactName });
    }
  }
  // Quotation → invoice link must point at a quotation that exists.
  const quoIds = new Set(quoRows.map((q) => q.id));
  for (const inv of invRows) if (inv.quotationId && !quoIds.has(inv.quotationId)) inv.quotationId = null;

  const chunk = async <T,>(rows: T[], insert: (c: T[]) => Promise<unknown>, size = 300) => {
    for (let i = 0; i < rows.length; i += size) await insert(rows.slice(i, i + size));
  };
  await chunk(quoRows, (c) => db.insert(t.quotations).values(c));
  await chunk(quoItemRows, (c) => db.insert(t.quotationItems).values(c));
  await chunk(invRows, (c) => db.insert(t.invoices).values(c));
  await chunk(invItemRows, (c) => db.insert(t.invoiceItems).values(c));
  await chunk(payRows, (c) => db.insert(t.payments).values(c));

  // ---------- stock rows + movements ----------
  for (const s of stockRows) {
    movements.push({ orgId, stockItemId: s.id, type: "restock", quantity: initialQty.get(s.id)!, note: "Opening stock", createdBy: owner.id, createdAt: at(105) });
  }
  // A couple of mid-period restocks and a correction.
  for (const s of stockRows.slice(0, 5)) {
    const q = int(10, 20);
    movements.push({ orgId, stockItemId: s.id, type: "restock", quantity: q, note: "Supplier delivery", createdBy: owner.id, createdAt: at(int(20, 60)) });
    stockQty.set(s.id, stockQty.get(s.id)! + q);
  }
  movements.push({ orgId, stockItemId: stockRows[7].id, type: "adjustment", quantity: -1, note: "Damaged in storage", createdBy: owner.id, createdAt: at(14) });
  stockQty.set(stockRows[7].id, Math.max(0, stockQty.get(stockRows[7].id)! - 1));
  for (const s of stockRows) await db.update(t.stockItems).set({ quantityOnHand: stockQty.get(s.id)! }).where(eq(t.stockItems.id, s.id));
  await chunk(movements, (c) => db.insert(t.stockMovements).values(c));

  // ---------- counters, vehicles' statuses already set ----------
  await db.update(t.organizations).set({ quotationCounter: quoN, invoiceCounter: invN }).where(eq(t.organizations.id, orgId));

  // ---------- campaigns & WhatsApp log ----------
  const everyone = [...customerRows, ...newCustomers];
  const campaignDefs = [
    { name: "Monsoon service offer", message: "Hi {{name}}, monsoon check-up special at Malabar Drive & Care — free AC check with any service this month. Reply YES to book!", daysAgo: 38, share: 0.6 },
    { name: "Onam weekend rentals", message: "Hi {{name}}, planning an Onam trip? Book a self-drive car for the long weekend and get 10% off. Reply to reserve.", daysAgo: 17, share: 0.45 },
  ];
  const wa: (typeof t.whatsappMessages.$inferInsert)[] = [];
  for (const c of campaignDefs) {
    const audience = everyone.filter(() => chance(c.share));
    const id = randomUUID();
    let sent = 0;
    for (const cust of audience) {
      const failed = chance(0.04);
      if (!failed) sent++;
      wa.push({ orgId, customerId: cust.id, campaignId: id, kind: "campaign", toPhone: cust.phone, body: c.message.replace("{{name}}", cust.fullName), status: failed ? "failed" : weighted([["read", 45], ["delivered", 40], ["sent", 15]]), providerMessageId: failed ? null : `demo-${randomUUID().slice(0, 8)}`, error: failed ? "Recipient phone number not on WhatsApp" : null, createdAt: at(c.daysAgo, 11) });
    }
    await db.insert(t.campaigns).values({ id, orgId, createdBy: owner.id, name: c.name, message: c.message, audienceCount: audience.length, sentCount: sent, createdAt: at(c.daysAgo, 11) });
  }
  for (const p of plans.filter((x) => x.stage === "booked" && x.customerId).slice(0, 40)) {
    wa.push({ orgId, customerId: p.customerId, leadId: p.id, kind: "vehicle_received", toPhone: p.contactPhone, body: `Hi ${p.contactName}, we've got your booking for "${p.interest}". Track it here: https://demo.example/status/${p.id.slice(0, 8)}`, status: "read", providerMessageId: `demo-${randomUUID().slice(0, 8)}`, createdAt: p.bookedAt! });
  }
  for (const c of customerRows.filter((c) => c.nextServiceDueAt < NOW).slice(0, 8)) {
    wa.push({ orgId, customerId: c.id, kind: "service_reminder", toPhone: c.phone, body: `Hi ${c.fullName}, it's been a while since your last service at Malabar Drive & Care — reply to book a slot this week!`, status: "delivered", providerMessageId: `demo-${randomUUID().slice(0, 8)}`, createdAt: addMs(c.nextServiceDueAt, int(0, 3) * DAY) });
  }
  for (const m of invMeta.filter((m) => m.status === "sent" || m.status === "partial").slice(0, 6)) {
    wa.push({ orgId, kind: "invoice_reminder", toPhone: phone(), body: `Hi ${m.contactName}, a friendly reminder: ${m.number} is pending.`, status: "delivered", providerMessageId: `demo-${randomUUID().slice(0, 8)}`, createdAt: addMs(m.createdAt, 8 * DAY) });
  }
  await chunk(wa, (c) => db.insert(t.whatsappMessages).values(c));

  // ---------- micro-site ----------
  await db
    .insert(t.orgSites)
    .values({
      orgId,
      published: true,
      headline: "Self-drive cars & trusted servicing in Kochi",
      tagline: "Clean cars, honest prices, same-day support.",
      about: "Malabar Drive & Care has been renting and servicing cars in Kochi since 2016. Airport pickup, driver on request, and a workshop that tells you what it is fixing before it fixes it.",
      phone: "+91 55555 00000",
      whatsappNumber: "+91 55555 00000",
      address: "NH 66 Bypass, Palarivattom, Kochi 682025",
      hours: "Mon–Sat 8:30am–7pm · Sun 10am–2pm",
      accent: "green",
      services: [
        { name: "Self-drive rentals", description: "Hatchbacks, sedans, SUVs and MPVs by the day or week.", priceFrom: 1800 },
        { name: "Full car service", description: "Oil, filters, brakes and a 40-point check.", priceFrom: 2800 },
        { name: "AC repair", description: "Gas top-up, leak test and cabin filter.", priceFrom: 1800 },
        { name: "Wheel alignment", priceFrom: 1100 },
      ],
    })
    .onConflictDoUpdate({ target: t.orgSites.orgId, set: { published: true, updatedAt: NOW } });

  // ---------- notifications & audit ----------
  const notes: (typeof t.notifications.$inferInsert)[] = [];
  type Uuid = `${string}-${string}-${string}-${string}-${string}`;
  const openLeads = plans.filter((p) => p.stage === "contacted" || p.stage === "quoted");
  for (const p of openLeads.filter((x) => x.followUpAt && x.followUpAt <= NOW).slice(0, 4)) {
    notes.push({ orgId, profileId: owner.id, kind: "follow_up_due", title: `Follow up with ${p.contactName}`, body: `Follow-up was due ${p.followUpAt!.toLocaleDateString()}.`, link: `/leads/${p.id}`, sourceType: "lead", sourceId: p.id as Uuid, createdAt: addMs(NOW, -int(1, 20) * 3_600_000) });
  }
  for (const p of openLeads.filter((x) => NOW.getTime() - x.lastTouch.getTime() > 6 * DAY).slice(0, 3)) {
    notes.push({ orgId, profileId: owner.id, kind: "stale_lead", title: `${p.contactName} hasn't been touched in a while`, body: "No updates in 5+ days — give them a nudge.", link: `/leads/${p.id}`, sourceType: "lead", sourceId: p.id as Uuid, readAt: chance(0.4) ? NOW : null, createdAt: addMs(NOW, -int(20, 60) * 3_600_000) });
  }
  for (const s of stockRows.filter((s) => stockQty.get(s.id)! <= s.lowStockThreshold)) {
    notes.push({ orgId, profileId: owner.id, kind: "low_stock", title: `${s.name} is running low`, body: `${stockQty.get(s.id)} ${s.unit} left (alert threshold: ${s.lowStockThreshold}).`, link: `/inventory/${s.id}`, sourceType: "stock_item", sourceId: s.id as Uuid, createdAt: addMs(NOW, -int(2, 30) * 3_600_000) });
  }
  for (const m of invMeta.filter((m) => (m.status === "sent" || m.status === "partial") && NOW.getTime() - m.createdAt.getTime() > 8 * DAY).slice(0, 4)) {
    notes.push({ orgId, profileId: owner.id, kind: "invoice_overdue", title: `${m.number} is unpaid`, body: `${m.contactName} still owes ₹${round2(m.total - m.paid).toLocaleString("en-IN")}.`, link: `/invoices/${m.id}`, sourceType: "invoice", sourceId: m.id as Uuid, createdAt: addMs(NOW, -int(1, 40) * 3_600_000) });
  }
  const accepted = quoRows.find((q) => q.status === "accepted" && q.respondedAt && NOW.getTime() - q.respondedAt.getTime() < 10 * DAY);
  if (accepted) notes.push({ orgId, profileId: owner.id, kind: "system", title: `${accepted.contactName} accepted ${accepted.number}`, body: "No message.", link: `/quotations/${accepted.id}`, createdAt: accepted.respondedAt! });
  if (notes.length) await db.insert(t.notifications).values(notes);

  await db.insert(t.auditLog).values([
    { orgId, actorId: owner.id, actorName: owner.fullName, action: "team.invite", targetType: "profile", summary: "Invited Anjali Menon as staff", createdAt: at(100) },
    { orgId, actorId: owner.id, actorName: owner.fullName, action: "team.invite", targetType: "profile", summary: "Invited Rahul Nair as staff", createdAt: at(100) },
    { orgId, actorId: owner.id, actorName: owner.fullName, action: "invoice.void", targetType: "invoice", summary: "Voided an invoice", createdAt: at(21) },
    { orgId, actorId: owner.id, actorName: owner.fullName, action: "vehicle.delete", targetType: "vehicle", summary: "Deleted vehicle KL-07-XX-0001", createdAt: at(33) },
  ]);

  // ---------- vehicle statuses (after everything) ----------
  for (const v of vehicleRows) await db.update(t.vehicles).set({ status: v.status, notes: v.notes }).where(eq(t.vehicles.id, v.id));

  const paidTotal = payRows.reduce((s, p) => s + Number(p.amount), 0);
  console.log(
    [
      `Seeded "${"Malabar Drive & Care"}" (${email}):`,
      `  ${plans.length} leads · ${everyone.length} customers · ${vehicleRows.length} vehicles · ${stockRows.length} stock items`,
      `  ${quoRows.length} quotations · ${invRows.length} invoices · ${payRows.length} payments (₹${Math.round(paidTotal).toLocaleString("en-IN")} collected)`,
      `  ${linkRows.length} tracking links · ${clickRows.length} clicks · ${campaignDefs.length} campaigns · ${wa.length} WhatsApp log rows · ${notes.length} notifications`,
    ].join("\n"),
  );
}

main()
  .then(async () => {
    await dbClient.end();
    process.exit(0);
  })
  .catch(async (error) => {
    console.error(error);
    await dbClient.end().catch(() => {});
    process.exit(1);
  });
