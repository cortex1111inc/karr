import { redirect } from "next/navigation";

// /app on its own just opens the dashboard.
export default function AppIndex() {
  redirect("/app/dashboard");
}
