import { migrate } from "drizzle-orm/postgres-js/migrator";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";

function isErrorWithCause(error: Error): error is Error & { cause: unknown } {
  return "cause" in error;
}

function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    const causeMessage = isErrorWithCause(error)
      ? getCauseMessage(error.cause)
      : null;

    return causeMessage
      ? `${error.message}\nCaused by: ${causeMessage}`
      : error.message;
  }

  return String(error);
}

function getCauseMessage(cause: unknown): string | null {
  if (!cause) {
    return null;
  }

  if (cause instanceof Error) {
    return cause.message;
  }

  if (typeof cause === "string") {
    return cause;
  }

  return null;
}

async function main(): Promise<void> {
  const databaseUrl = process.env.DATABASE_URL;

  if (!databaseUrl) {
    console.error("DATABASE_URL is required to run database migrations.");
    process.exitCode = 1;
    return;
  }

  const client = postgres(databaseUrl, { max: 1 });
  const db = drizzle(client);

  try {
    await migrate(db, { migrationsFolder: "./drizzle" });
    console.log("Database migrations applied successfully.");
  } catch (error) {
    console.error("Database migration failed.");
    console.error(getErrorMessage(error));

    process.exitCode = 1;
  } finally {
    await client.end();
  }
}

void main();
