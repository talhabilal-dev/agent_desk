import { and, eq, sql } from "drizzle-orm";

import { db, usage } from "@/db";

import { DocumentError } from "./errors";

/** Usage periods are calendar months in UTC, e.g. "2026-10". */
export function currentPeriod(date = new Date()) {
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`;
}

/** Pages already reserved in the current period (0 when nothing ran yet). */
export async function getUsedPages(referenceId: string) {
  const [row] = await db
    .select({ pages: usage.pages })
    .from(usage)
    .where(
      and(
        eq(usage.referenceId, referenceId),
        eq(usage.period, currentPeriod()),
      ),
    )
    .limit(1);

  return row?.pages ?? 0;
}

/**
 * Atomically reserves `pages` against the caller's monthly allowance.
 *
 * The increment happens first and is rolled back when it overflows, so two
 * documents processing concurrently can never both slip under the cap.
 */
export async function reservePages(
  referenceId: string,
  pages: number,
  limit: number,
) {
  if (pages <= 0) {
    return 0;
  }

  const period = currentPeriod();

  const [row] = await db
    .insert(usage)
    .values({ referenceId, period, pages })
    .onConflictDoUpdate({
      target: [usage.referenceId, usage.period],
      set: { pages: sql`${usage.pages} + ${pages}`, updatedAt: new Date() },
    })
    .returning({ pages: usage.pages });

  const total = row?.pages ?? pages;

  if (total > limit) {
    await db
      .update(usage)
      .set({
        pages: sql`greatest(${usage.pages} - ${pages}, 0)`,
        updatedAt: new Date(),
      })
      .where(and(eq(usage.referenceId, referenceId), eq(usage.period, period)));

    throw new DocumentError(
      "PAGE_LIMIT_REACHED",
      `Monthly page allowance reached (${limit} pages). Upgrade your plan to process more documents.`,
    );
  }

  return total;
}
