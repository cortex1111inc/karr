"use client";

import { useActionState } from "react";
import type { InferSelectModel } from "drizzle-orm";
import type { customers } from "@/db/schema";
import { Input, Label, Textarea } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { updateCustomer } from "../actions";

type Customer = InferSelectModel<typeof customers>;

const initialState: { error: string | null } = { error: null };

export function EditCustomerForm({ customer }: { customer: Customer }) {
  const [state, formAction, pending] = useActionState(updateCustomer.bind(null, customer.id), initialState);

  return (
    <form action={formAction} className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
      <div>
        <Label htmlFor="fullName">Name</Label>
        <Input id="fullName" name="fullName" defaultValue={customer.fullName} required />
      </div>
      <div>
        <Label htmlFor="phone">Phone</Label>
        <Input id="phone" name="phone" defaultValue={customer.phone} required />
      </div>
      <div>
        <Label htmlFor="email">Email</Label>
        <Input id="email" name="email" type="email" defaultValue={customer.email ?? ""} />
      </div>
      <div>
        <Label htmlFor="vehicleNumber">Vehicle number</Label>
        <Input id="vehicleNumber" name="vehicleNumber" defaultValue={customer.vehicleNumber ?? ""} />
      </div>
      <div className="sm:col-span-2">
        <Label htmlFor="notes">Notes</Label>
        <Textarea id="notes" name="notes" rows={3} defaultValue={customer.notes ?? ""} />
      </div>

      {state.error ? (
        <p role="alert" className="text-sm text-danger sm:col-span-2">
          {state.error}
        </p>
      ) : null}

      <div className="sm:col-span-2">
        <Button type="submit" variant="accent" size="sm" disabled={pending}>
          {pending ? "Saving…" : "Save changes"}
        </Button>
      </div>
    </form>
  );
}
