"use client";

import { Button } from "@/components/ui/button";

// The browser's print dialog doubles as "Save as PDF".
export function PrintButton() {
  return (
    <Button type="button" variant="ghost" size="sm" onClick={() => window.print()}>
      Print / save PDF
    </Button>
  );
}
