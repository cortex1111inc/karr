import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL is not set — copy .env.example to .env.local and fill it in.");
}

// Exported so scripts/tests can close the connection when they're done.
export const dbClient = postgres(process.env.DATABASE_URL, { prepare: false });

export const db = drizzle(dbClient, { schema });
