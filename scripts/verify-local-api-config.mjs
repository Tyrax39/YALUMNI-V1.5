import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const envPath = join(root, "apps", "api", ".env");
const envDatabaseUrl = process.env.DATABASE_URL?.trim();
const envFileDatabaseUrl = existsSync(envPath)
  ? readFileSync(envPath, "utf8")
      .split(/\r?\n/)
      .find((line) => line.startsWith("DATABASE_URL="))
      ?.slice("DATABASE_URL=".length)
      .trim()
  : "";

if (!envDatabaseUrl && !envFileDatabaseUrl) {
  throw new Error(
    "DATABASE_URL is required to start the local API. Set it in the environment or apps/api/.env."
  );
}

console.log("Local API configuration includes an explicit database URL.");
