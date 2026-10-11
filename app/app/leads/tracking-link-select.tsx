import { Label, Select } from "@/components/ui/input";

export type LinkOption = { id: string; name: string };

// Manual attribution: e.g. a walk-in who says "I saw Rahul's reel".
export function TrackingLinkSelect({ links, defaultValue }: { links: LinkOption[]; defaultValue?: string | null }) {
  if (links.length === 0) return null;
  return (
    <div>
      <Label htmlFor="trackingLinkId">Came from (optional)</Label>
      <Select id="trackingLinkId" name="trackingLinkId" defaultValue={defaultValue ?? ""}>
        <option value="">— Not from a tracking link —</option>
        {links.map((l) => (
          <option key={l.id} value={l.id}>
            {l.name}
          </option>
        ))}
      </Select>
    </div>
  );
}
