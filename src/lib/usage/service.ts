import { and, eq, gte, sql } from "drizzle-orm";

import { db, llmUsage, modelPrice, organization } from "@/db";
import type { LlmUsage } from "@/lib/ai/llm";

export type OrganizationUsage = {
  organizationId: string;
  organizationName: string;
  requests: number;
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
  costUsd: number;
};

/** The rate card. Returns null for an unpriced model, which costs nothing. */
export async function getModelPrice(model: string) {
  const [row] = await db
    .select({
      inputPerMillion: modelPrice.inputPerMillion,
      outputPerMillion: modelPrice.outputPerMillion,
    })
    .from(modelPrice)
    .where(eq(modelPrice.model, model))
    .limit(1);

  if (!row) {
    return null;
  }

  return {
    inputPerMillion: Number(row.inputPerMillion),
    outputPerMillion: Number(row.outputPerMillion),
  };
}

/**
 * Records one model call. The cost is computed now and stored on the row, so
 * correcting a rate later never rewrites historical totals.
 */
export async function recordLlmUsage(input: {
  organizationId: string;
  widgetId?: string | null;
  usage: LlmUsage;
}) {
  // A skipped call (no context, no model) produces nothing worth billing.
  if (input.usage.totalTokens <= 0) {
    return null;
  }

  const price = await getModelPrice(input.usage.model);
  const cost =
    (input.usage.inputTokens / 1_000_000) * (price?.inputPerMillion ?? 0) +
    (input.usage.outputTokens / 1_000_000) * (price?.outputPerMillion ?? 0);

  const [row] = await db
    .insert(llmUsage)
    .values({
      organizationId: input.organizationId,
      widgetId: input.widgetId ?? null,
      model: input.usage.model,
      inputTokens: input.usage.inputTokens,
      outputTokens: input.usage.outputTokens,
      totalTokens: input.usage.totalTokens,
      costUsd: cost.toFixed(8),
    })
    .returning({ id: llmUsage.id });

  return row ?? null;
}

/** First instant of the current UTC month, matching the usage period buckets. */
export function startOfMonth(date = new Date()) {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1));
}

/** Model spend for the current calendar month, in USD. */
export async function getMonthlyCost(organizationId: string) {
  const [row] = await db
    .select({ cost: sql<string>`coalesce(sum(${llmUsage.costUsd}), 0)` })
    .from(llmUsage)
    .where(
      and(
        eq(llmUsage.organizationId, organizationId),
        gte(llmUsage.createdAt, startOfMonth()),
      ),
    );

  return Number(row?.cost ?? 0);
}

/** Totals for every workspace `ownerId` owns, including the untouched ones. */
export async function getOrganizationUsage(
  ownerId: string,
): Promise<OrganizationUsage[]> {
  const rows = await db
    .select({
      organizationId: organization.id,
      organizationName: organization.name,
      requests: sql<number>`count(${llmUsage.id})::int`,
      inputTokens: sql<number>`coalesce(sum(${llmUsage.inputTokens}), 0)::int`,
      outputTokens: sql<number>`coalesce(sum(${llmUsage.outputTokens}), 0)::int`,
      totalTokens: sql<number>`coalesce(sum(${llmUsage.totalTokens}), 0)::int`,
      costUsd: sql<string>`coalesce(sum(${llmUsage.costUsd}), 0)`,
    })
    .from(organization)
    // Left join so an organization with no usage still appears with zeros.
    .leftJoin(llmUsage, eq(llmUsage.organizationId, organization.id))
    .where(eq(organization.ownerId, ownerId))
    .groupBy(organization.id, organization.name)
    .orderBy(organization.name);

  return rows.map((row) => ({
    ...row,
    costUsd: Number(row.costUsd),
  }));
}
