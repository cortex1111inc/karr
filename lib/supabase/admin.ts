import "server-only";
import { createClient } from "@supabase/supabase-js";

// Service-role client — bypasses RLS and can manage auth users. Only ever
// import this from Server Actions/Route Handlers, never from client code.
// Used for staff invites (see app/(app)/settings/team/actions.ts).
export function createAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } },
  );
}
