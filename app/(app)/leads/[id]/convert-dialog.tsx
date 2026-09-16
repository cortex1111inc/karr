"use client";

import { useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import { convertLeadToCustomer } from "../actions";

export function ConvertDialog({
  leadId,
  contactName,
  contactPhone,
}: {
  leadId: string;
  contactName: string;
  contactPhone: string;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);

  return (
    <>
      <Button variant="accent" size="sm" onClick={() => dialogRef.current?.showModal()}>
        Convert to customer
      </Button>
      <dialog
        ref={dialogRef}
        className="w-full max-w-md rounded-xl border border-border bg-surface p-0 shadow-[0_30px_70px_-24px_rgba(30,26,10,0.24)] backdrop:bg-black/30"
      >
        <form action={convertLeadToCustomer.bind(null, leadId)} className="flex flex-col gap-4 p-6">
          <div>
            <h2 className="font-display text-base font-bold">Convert to customer</h2>
            <p className="mt-0.5 text-sm text-muted">
              Creates a customer record for {contactName} ({contactPhone}) and marks this lead booked.
            </p>
          </div>
          <div>
            <Label htmlFor="vehicleNumber">Vehicle number (optional)</Label>
            <Input id="vehicleNumber" name="vehicleNumber" placeholder="KL-07-AB-1234" />
          </div>
          <div>
            <Label htmlFor="email">Email (optional)</Label>
            <Input id="email" name="email" type="email" placeholder="customer@email.com" />
          </div>
          <div className="mt-1 flex justify-end gap-2">
            <Button type="button" variant="ghost" size="sm" onClick={() => dialogRef.current?.close()}>
              Cancel
            </Button>
            <Button type="submit" variant="accent" size="sm">
              Convert
            </Button>
          </div>
        </form>
      </dialog>
    </>
  );
}
