import "dotenv/config";
import { createClient } from "@supabase/supabase-js";
import { db } from "./index";
import { organizations, profiles } from "./schema";
import { uniqueSlug } from "../lib/slug";

// One-time dev setup: links an existing Supabase auth user (create one via
// the Supabase dashboard → Authentication → Users first) to a fresh
// organization + profile row, so they can sign in to the app.
//
// Usage: npm run db:seed -- you@business.com "Your Name" "Your Business"

async function main() {
  const [email, fullName, orgName] = process.argv.slice(2);

  if (!email || !fullName || !orgName) {
    console.error('Usage: npm run db:seed -- "you@business.com" "Your Name" "Your Business"');
    process.exit(1);
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    console.error(
      "NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set to look up the auth user (service role key is only ever used here, server-side, never in app code).",
    );
    process.exit(1);
  }

  const admin = createClient(supabaseUrl, serviceRoleKey);

  const { data: userList, error: lookupError } = await admin.auth.admin.listUsers();
  if (lookupError) throw lookupError;

  const authUser = userList.users.find((u) => u.email === email);
  if (!authUser) {
    console.error(`No Supabase auth user found for ${email}. Create one in the dashboard first.`);
    process.exit(1);
  }

  const [org] = await db
    .insert(organizations)
    .values({ name: orgName, slug: uniqueSlug(orgName) })
    .returning();

  await db.insert(profiles).values({
    id: authUser.id,
    orgId: org.id,
    fullName,
    email,
    role: "owner",
  });

  console.log(`Linked ${email} to organization "${orgName}" (${org.id}).`);
  process.exit(0);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
