import { and, asc, count, eq, sql } from "drizzle-orm";

import { db, organization } from "@/db";
import { postgresErrorCode } from "@/utils/error";

export type Organization = typeof organization.$inferSelect;

export class OrganizationSlugTakenError extends Error {
  constructor() {
    super("That slug is already taken.");
    this.name = "OrganizationSlugTakenError";
  }
}

export class OrganizationLimitReachedError extends Error {
  constructor(readonly limit: number) {
    super(
      limit === 0
        ? "Subscribe to a plan to create organizations."
        : `Your plan is limited to ${limit} organization${
            limit === 1 ? "" : "s"
          }. Upgrade to add more.`,
    );
    this.name = "OrganizationLimitReachedError";
  }
}

/** Postgres error code, walking drizzle's error `cause` chain. */
function rethrowSlugConflict(error: unknown): never {
  if (postgresErrorCode(error) === "23505") {
    throw new OrganizationSlugTakenError();
  }

  throw error;
}

export async function listOrganizations(ownerId: string) {
  return db
    .select()
    .from(organization)
    .where(eq(organization.ownerId, ownerId))
    .orderBy(asc(organization.createdAt));
}

/**
 * Creates an organization, enforcing the plan allowance *inside* the
 * transaction. The count used to happen in a separate request-scoped query, so
 * two simultaneous creates could both pass the check and exceed the plan.
 */
export async function createOrganization(
  ownerId: string,
  input: { name: string; slug: string },
  /** null = no cap (billing unconfigured, or an unlimited plan). */
  limit: number | null,
) {
  try {
    return await db.transaction(async (tx) => {
      // Serializes concurrent creates for this owner; released at commit.
      await tx.execute(sql`select pg_advisory_xact_lock(hashtext(${ownerId}))`);

      if (limit !== null) {
        const [owned] = await tx
          .select({ value: count() })
          .from(organization)
          .where(eq(organization.ownerId, ownerId));

        if ((owned?.value ?? 0) >= limit) {
          throw new OrganizationLimitReachedError(limit);
        }
      }

      const [created] = await tx
        .insert(organization)
        .values({ ...input, ownerId })
        .returning();

      return created;
    });
  } catch (error) {
    rethrowSlugConflict(error);
  }
}

/** Returns `null` when the organization does not exist or is not owned by `ownerId`. */
export async function renameOrganization(
  ownerId: string,
  organizationId: string,
  input: { name: string; slug: string },
) {
  try {
    const [updated] = await db
      .update(organization)
      .set(input)
      .where(
        and(
          eq(organization.id, organizationId),
          eq(organization.ownerId, ownerId),
        ),
      )
      .returning();

    return updated ?? null;
  } catch (error) {
    rethrowSlugConflict(error);
  }
}

/** Returns `null` when the organization does not exist or is not owned by `ownerId`. */
export async function deleteOrganization(
  ownerId: string,
  organizationId: string,
) {
  const [deleted] = await db
    .delete(organization)
    .where(
      and(
        eq(organization.id, organizationId),
        eq(organization.ownerId, ownerId),
      ),
    )
    .returning();

  return deleted ?? null;
}
