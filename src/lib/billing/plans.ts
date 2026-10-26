import type { StripePlan } from "@better-auth/stripe";
import { asc, eq } from "drizzle-orm";

import { db, plan } from "@/db";

export type PlanRow = typeof plan.$inferSelect;

/** Plan shape safe to hand to the client (no Stripe price IDs). */
export type PlanView = {
  key: string;
  name: string;
  description: string | null;
  monthlyPriceCents: number;
  annualMonthlyPriceCents: number;
  organizationLimit: number | null;
  pageLimit: number;
  ocrEnabled: boolean;
  processingTier: string;
  canPayMonthly: boolean;
  canPayAnnually: boolean;
};

export async function listPlanRows() {
  return db
    .select()
    .from(plan)
    .where(eq(plan.active, true))
    .orderBy(asc(plan.sortOrder));
}

export async function getPlanByKey(key: string) {
  const [row] = await db.select().from(plan).where(eq(plan.key, key)).limit(1);

  return row ?? null;
}

export async function listPlans(): Promise<PlanView[]> {
  const rows = await listPlanRows();

  return rows.map((row) => ({
    key: row.key,
    name: row.name,
    description: row.description,
    monthlyPriceCents: row.monthlyPriceCents,
    annualMonthlyPriceCents: row.annualMonthlyPriceCents,
    organizationLimit: row.organizationLimit,
    pageLimit: row.pageLimit,
    ocrEnabled: row.ocrEnabled,
    processingTier: row.processingTier,
    canPayMonthly: Boolean(row.stripePriceIdMonthly),
    canPayAnnually: Boolean(
      row.stripePriceIdMonthly && row.stripePriceIdAnnual,
    ),
  }));
}

/**
 * Adapter for the Stripe plugin's `plans` option, which accepts an async
 * function — this is what makes the catalog dynamic without a sync step.
 * Plans without a monthly price ID are skipped: the plugin could not check
 * them out.
 */
export async function getStripePlans(): Promise<StripePlan[]> {
  const rows = await listPlanRows();

  return rows.flatMap((row) => {
    if (!row.stripePriceIdMonthly) {
      return [];
    }

    return [
      {
        name: row.key,
        priceId: row.stripePriceIdMonthly,
        annualDiscountPriceId: row.stripePriceIdAnnual ?? undefined,
        limits: {
          organizations: row.organizationLimit,
          pages: row.pageLimit,
          ocr: row.ocrEnabled,
          processing: row.processingTier,
        },
      },
    ];
  });
}
