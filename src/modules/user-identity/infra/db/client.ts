import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";

import * as schema from "@/db/schema";

let db: ReturnType<typeof drizzle<typeof schema>> | null = null;

export function getUserIdentityDb(): ReturnType<typeof drizzle<typeof schema>> {
  const databaseUrl = process.env.DATABASE_URL;

  if (!databaseUrl) {
    throw new Error("DATABASE_URL is required for authentication persistence.");
  }

  db ??= drizzle(postgres(databaseUrl), { schema });

  return db;
}
