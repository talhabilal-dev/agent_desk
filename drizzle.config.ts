import { defineConfig } from "drizzle-kit";

/**
 * Migrations and DDL must run against the *direct* connection. Neon's pooled
 * endpoint sits in front of a transaction pooler, which is not a safe place to
 * run schema changes. Locally there is no pooler, so DATABASE_URL is the
 * fallback.
 */
const databaseUrl = process.env.DIRECT_DATABASE_URL ?? process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error(
    "DIRECT_DATABASE_URL (or DATABASE_URL) is not set. Add it to your .env file.",
  );
}

export default defineConfig({
  dialect: "postgresql",
  schema: ["./src/db/auth-schema.ts", "./src/db/app-schema.ts"],
  out: "./drizzle",
  dbCredentials: {
    url: databaseUrl,
  },
});
