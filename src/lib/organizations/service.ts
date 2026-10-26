import { and, asc, eq } from "drizzle-orm";

import { db, organization } from "@/db";

export type Organization = typeof organization.$inferSelect;

export class OrganizationSlugTakenError extends Error {
  constructor() {
    super("That slug is already taken.");
    this.name = "OrganizationSlugTakenError";
  }
}

/** Postgres error code, walking drizzle's error `cause` chain. */
function postgresErrorCode(error: unknown): string | undefined {
  let current: unknown = error;

  for (let depth = 0; current && depth < 5; depth += 1) {
    if (typeof current === "object" && "code" in current) {
      const { code } = current as { code?: unknown };
      if (typeof code === "string") {
        return code;
      }
    }

    current =
      typeof current === "object" && current !== null
        ? (current as { cause?: unknown }).cause
        : undefined;
  }

  return undefined;
}

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

export async function createOrganization(
  ownerId: string,
  input: { name: string; slug: string },
) {
  try {
    const [created] = await db
      .insert(organization)
      .values({ ...input, ownerId })
      .returning();

    return created;
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
