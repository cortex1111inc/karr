import { desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { customers } from "@/db/schema";
import { requireUser } from "@/lib/auth";
import { csvResponse, toCsv } from "@/lib/csv";

export async function GET() {
  const user = await requireUser();

  const rows = await db
    .select({
      fullName: customers.fullName,
      phone: customers.phone,
      email: customers.email,
      vehicleNumber: customers.vehicleNumber,
      lastServiceAt: customers.lastServiceAt,
      nextServiceDueAt: customers.nextServiceDueAt,
      createdAt: customers.createdAt,
    })
    .from(customers)
    .where(eq(customers.orgId, user.orgId))
    .orderBy(desc(customers.createdAt));

  const csv = toCsv(rows, [
    { key: "fullName", label: "Name" },
    { key: "phone", label: "Phone" },
    { key: "email", label: "Email" },
    { key: "vehicleNumber", label: "Vehicle number" },
    { key: "lastServiceAt", label: "Last service" },
    { key: "nextServiceDueAt", label: "Next due" },
    { key: "createdAt", label: "Customer since" },
  ]);

  return csvResponse("customers.csv", csv);
}
