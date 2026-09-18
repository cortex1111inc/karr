export type LineItemInput = {
  description: string;
  quantity: number;
  unitPrice: number;
};

export type Totals = {
  subtotal: number;
  taxAmount: number;
  total: number;
};

// All amounts round to 2 decimal places (paise/cents) at each step so
// stored totals always match what line items sum to — avoids floating
// point drift accumulating across many rows.
function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

export function calculateTotals(items: LineItemInput[], gstEnabled: boolean, gstRate: number): Totals {
  const subtotal = round2(items.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0));
  const taxAmount = gstEnabled ? round2((subtotal * gstRate) / 100) : 0;
  const total = round2(subtotal + taxAmount);
  return { subtotal, taxAmount, total };
}

export function formatCurrency(amount: number | string): string {
  const value = typeof amount === "string" ? Number(amount) : amount;
  return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 2 }).format(value);
}
