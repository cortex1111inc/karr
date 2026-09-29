"use client";

import { useActionState, useMemo, useState } from "react";
import type { SiteService } from "@/db/schema";
import { Input, Label, Select, Textarea } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useActionToast } from "@/components/ui/toast";
import { SITE_ACCENTS } from "@/lib/site-theme";
import { saveSite } from "./actions";

export type SiteFormValues = {
  published: boolean;
  headline: string;
  tagline: string;
  about: string;
  phone: string;
  whatsappNumber: string;
  address: string;
  hours: string;
  mapUrl: string;
  heroImageUrl: string;
  accent: keyof typeof SITE_ACCENTS;
  services: SiteService[];
};

type Row = { key: number; name: string; description: string; priceFrom: string };
let nextKey = 0;
const toRow = (s?: SiteService): Row => {
  nextKey += 1;
  return { key: nextKey, name: s?.name ?? "", description: s?.description ?? "", priceFrom: s?.priceFrom != null ? String(s.priceFrom) : "" };
};

const initialState: { error: string | null } = { error: null };

export function SiteForm({ values, canEdit }: { values: SiteFormValues; canEdit: boolean }) {
  const [state, formAction, pending] = useActionState(saveSite, initialState);
  useActionToast(state, pending, "Website saved");
  const [rows, setRows] = useState<Row[]>(() => (values.services.length ? values.services.map(toRow) : [toRow()]));
  const [published, setPublished] = useState(values.published);

  const servicesJson = useMemo(
    () =>
      JSON.stringify(
        rows
          .filter((r) => r.name.trim())
          .map((r) => ({
            name: r.name.trim(),
            description: r.description.trim() || undefined,
            priceFrom: r.priceFrom ? Number(r.priceFrom) : undefined,
          })),
      ),
    [rows],
  );

  const update = (key: number, patch: Partial<Row>) => setRows((prev) => prev.map((r) => (r.key === key ? { ...r, ...patch } : r)));
  const move = (index: number, delta: number) =>
    setRows((prev) => {
      const next = [...prev];
      const target = index + delta;
      if (target < 0 || target >= next.length) return prev;
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });

  return (
    <form action={formAction} className="flex flex-col gap-6">
      <input type="hidden" name="servicesJson" value={servicesJson} />
      <input type="hidden" name="published" value={String(published)} />
      <fieldset disabled={!canEdit} className="flex flex-col gap-6 disabled:opacity-60">
        <section className="flex flex-col gap-4">
          <h2 className="font-display text-sm font-bold">Headline</h2>
          <div>
            <Label htmlFor="headline">Headline</Label>
            <Input id="headline" name="headline" defaultValue={values.headline} placeholder="Kochi's cleanest self-drive cars" />
          </div>
          <div>
            <Label htmlFor="tagline">Tagline</Label>
            <Input id="tagline" name="tagline" defaultValue={values.tagline} placeholder="Doorstep delivery · Sanitised after every trip" />
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <Label htmlFor="heroImageUrl">Cover image URL (optional)</Label>
              <Input id="heroImageUrl" name="heroImageUrl" type="url" defaultValue={values.heroImageUrl} placeholder="https://…" />
            </div>
            <div>
              <Label htmlFor="accent">Accent colour</Label>
              <Select id="accent" name="accent" defaultValue={values.accent}>
                {Object.entries(SITE_ACCENTS).map(([k, v]) => (
                  <option key={k} value={k}>
                    {v.label}
                  </option>
                ))}
              </Select>
            </div>
          </div>
        </section>

        <section className="flex flex-col gap-3 border-t border-border pt-6">
          <div>
            <h2 className="font-display text-sm font-bold">Services</h2>
            <p className="text-sm text-muted">What you offer, with an optional starting price.</p>
          </div>
          {rows.map((row, i) => (
            <div key={row.key} className="grid grid-cols-1 gap-2 rounded-lg border border-border p-3 sm:grid-cols-[1fr_8rem_auto]">
              <div className="flex flex-col gap-2">
                <Input value={row.name} onChange={(e) => update(row.key, { name: e.target.value })} placeholder="Full car detailing" aria-label={`Service ${i + 1} name`} />
                <Input value={row.description} onChange={(e) => update(row.key, { description: e.target.value })} placeholder="Short description (optional)" aria-label={`Service ${i + 1} description`} />
              </div>
              <Input
                type="number"
                inputMode="decimal"
                min={0}
                value={row.priceFrom}
                onChange={(e) => update(row.key, { priceFrom: e.target.value })}
                placeholder="From ₹"
                aria-label={`Service ${i + 1} starting price`}
              />
              <div className="flex items-start gap-1">
                <button type="button" onClick={() => move(i, -1)} disabled={i === 0} aria-label={`Move service ${i + 1} up`} className="h-9 w-9 rounded-md text-muted hover:bg-surface-2 disabled:opacity-30">↑</button>
                <button type="button" onClick={() => move(i, 1)} disabled={i === rows.length - 1} aria-label={`Move service ${i + 1} down`} className="h-9 w-9 rounded-md text-muted hover:bg-surface-2 disabled:opacity-30">↓</button>
                <button type="button" onClick={() => setRows((p) => (p.length > 1 ? p.filter((r) => r.key !== row.key) : [toRow()]))} aria-label={`Remove service ${i + 1}`} className="h-9 w-9 rounded-md text-faint hover:bg-danger-soft hover:text-danger">✕</button>
              </div>
            </div>
          ))}
          {rows.length < 20 ? (
            <Button type="button" variant="ghost" size="sm" className="self-start" onClick={() => setRows((p) => [...p, toRow()])}>
              + Add service
            </Button>
          ) : null}
        </section>

        <section className="flex flex-col gap-4 border-t border-border pt-6">
          <h2 className="font-display text-sm font-bold">About &amp; contact</h2>
          <div>
            <Label htmlFor="about">About</Label>
            <Textarea id="about" name="about" rows={4} defaultValue={values.about} />
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <Label htmlFor="phone">Phone</Label>
              <Input id="phone" name="phone" type="tel" defaultValue={values.phone} />
            </div>
            <div>
              <Label htmlFor="whatsappNumber">WhatsApp number</Label>
              <Input id="whatsappNumber" name="whatsappNumber" type="tel" defaultValue={values.whatsappNumber} placeholder="+91 90000 00000" />
            </div>
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <Label htmlFor="address">Address</Label>
              <Textarea id="address" name="address" rows={2} defaultValue={values.address} />
            </div>
            <div>
              <Label htmlFor="hours">Opening hours</Label>
              <Textarea id="hours" name="hours" rows={2} defaultValue={values.hours} placeholder={"Mon–Sat 9am–7pm\nSun closed"} />
            </div>
          </div>
          <div>
            <Label htmlFor="mapUrl">Google Maps link (optional)</Label>
            <Input id="mapUrl" name="mapUrl" type="url" defaultValue={values.mapUrl} placeholder="https://maps.app.goo.gl/…" />
          </div>
        </section>
      </fieldset>

      {state.error ? (
        <p role="alert" className="text-sm text-danger">
          {state.error}
        </p>
      ) : null}

      {canEdit ? (
        <div className="flex flex-wrap items-center gap-4 border-t border-border pt-6">
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={published} onChange={(e) => setPublished(e.target.checked)} className="h-4 w-4 accent-[var(--accent)]" />
            Published — visible to anyone with the link
          </label>
          <Button type="submit" variant="accent" disabled={pending} className="ml-auto">
            {pending ? "Saving…" : "Save website"}
          </Button>
        </div>
      ) : (
        <p className="text-sm text-faint">Only the workspace owner can edit the website.</p>
      )}
    </form>
  );
}
