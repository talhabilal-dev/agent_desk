import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";

import { relations } from "./relation";

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error("DATABASE_URL is not set. Add it to your .env file.");
}

const globalForDb = globalThis as unknown as { pool?: Pool };

const pool =
  globalForDb.pool ??
  new Pool({
    connectionString,
    // Serverless: every instance keeps its own small pool and Neon's pooler
    // multiplexes them, so a large `max` just burns connections.
    max: 2,
    idleTimeoutMillis: 30_000,
    connectionTimeoutMillis: 10_000,
  });

/**
 * Without this handler, an error on an *idle* client (database restart, network
 * reset, admin termination) is emitted as an unhandled `error` event and takes
 * the process down.
 */
pool.on("error", (error) => {
  console.error("[db] idle client error", error);
});

if (process.env.NODE_ENV !== "production") {
  globalForDb.pool = pool;
}

export const db = drizzle({ client: pool, relations });

/**
 * Either the pool-backed client or a transaction started from it. Lets a
 * helper run inside the caller's transaction instead of committing on its own.
 */
export type DbClient =
  | typeof db
  | Parameters<Parameters<typeof db.transaction>[0]>[0];

export * from "./app-schema";
export * from "./auth-schema";
