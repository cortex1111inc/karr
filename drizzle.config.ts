import "dotenv/config";
import { defineConfig } from "drizzle-kit";

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL is not set — copy .env.example to .env.local and fill it in.");
}

export default defineConfig({
  schema: "./db/schema.ts",
  out: "./db/migrations",
  dialect: "postgresql",
  dbCredentials: { url: process.env.DATABASE_URL },
  // Supabase provisions its own schemas (auth, storage, realtime, vault…)
  // with check constraints that crash drizzle-kit's introspection — scope
  // push/pull to the app's own schema.
  schemaFilter: ["public"],
});
