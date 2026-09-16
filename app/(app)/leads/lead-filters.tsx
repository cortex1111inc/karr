import { Input, Select } from "@/components/ui/input";
import { Button, ButtonLink } from "@/components/ui/button";

type Filters = {
  q?: string;
  source?: string;
  assignee?: string;
  from?: string;
  to?: string;
};

export function LeadFilters({
  profiles,
  initial,
}: {
  profiles: { id: string; fullName: string }[];
  initial: Filters;
}) {
  const hasFilters = Object.values(initial).some(Boolean);

  return (
    <form className="flex flex-wrap items-end gap-3" method="get">
      <div className="min-w-[180px] flex-1">
        <label htmlFor="q" className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-faint">
          Search
        </label>
        <Input id="q" name="q" defaultValue={initial.q} placeholder="Name, phone, enquiry…" />
      </div>
      <div>
        <label htmlFor="source" className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-faint">
          Source
        </label>
        <Select id="source" name="source" defaultValue={initial.source ?? ""} className="w-36">
          <option value="">Any source</option>
          <option value="whatsapp">WhatsApp</option>
          <option value="instagram">Instagram</option>
          <option value="call">Call</option>
          <option value="website">Website</option>
          <option value="walk_in">Walk-in</option>
          <option value="referral">Referral</option>
          <option value="other">Other</option>
        </Select>
      </div>
      <div>
        <label htmlFor="assignee" className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-faint">
          Assignee
        </label>
        <Select id="assignee" name="assignee" defaultValue={initial.assignee ?? ""} className="w-40">
          <option value="">Anyone</option>
          <option value="unassigned">Unassigned</option>
          {profiles.map((profile) => (
            <option key={profile.id} value={profile.id}>
              {profile.fullName}
            </option>
          ))}
        </Select>
      </div>
      <div>
        <label htmlFor="from" className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-faint">
          From
        </label>
        <Input id="from" name="from" type="date" defaultValue={initial.from} className="w-36" />
      </div>
      <div>
        <label htmlFor="to" className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-faint">
          To
        </label>
        <Input id="to" name="to" type="date" defaultValue={initial.to} className="w-36" />
      </div>
      <Button type="submit" variant="ghost" size="sm">
        Filter
      </Button>
      {hasFilters ? (
        <ButtonLink href="/leads" variant="ghost" size="sm">
          Clear
        </ButtonLink>
      ) : null}
    </form>
  );
}
