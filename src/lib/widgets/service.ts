import { randomBytes } from "node:crypto";
import { and, desc, eq } from "drizzle-orm";

import { chatWidget, db, organization } from "@/db";
import type {
  CreateWidgetInput,
  UpdateWidgetInput,
} from "@/lib/validations/widget";
import { normalizeOrigins } from "@/utils/origins";

export type Widget = typeof chatWidget.$inferSelect;

/** `wgt_` + 24 hex chars. Publishable, so it is stored in plain text. */
export function createPublicKey() {
  return `wgt_${randomBytes(12).toString("hex")}`;
}

/** Widgets across every organization owned by `ownerId`. */
export async function listWidgets(ownerId: string) {
  return db
    .select({
      id: chatWidget.id,
      organizationId: chatWidget.organizationId,
      organizationName: organization.name,
      name: chatWidget.name,
      publicKey: chatWidget.publicKey,
      primaryColor: chatWidget.primaryColor,
      backgroundColor: chatWidget.backgroundColor,
      textColor: chatWidget.textColor,
      position: chatWidget.position,
      title: chatWidget.title,
      welcomeMessage: chatWidget.welcomeMessage,
      allowedOrigins: chatWidget.allowedOrigins,
      active: chatWidget.active,
      createdAt: chatWidget.createdAt,
    })
    .from(chatWidget)
    .innerJoin(organization, eq(chatWidget.organizationId, organization.id))
    .where(eq(organization.ownerId, ownerId))
    .orderBy(desc(chatWidget.createdAt));
}

async function assertOrganizationOwned(
  ownerId: string,
  organizationId: string,
) {
  const [row] = await db
    .select({ id: organization.id })
    .from(organization)
    .where(
      and(
        eq(organization.id, organizationId),
        eq(organization.ownerId, ownerId),
      ),
    )
    .limit(1);

  return Boolean(row);
}

export async function createWidget(ownerId: string, input: CreateWidgetInput) {
  if (!(await assertOrganizationOwned(ownerId, input.organizationId))) {
    throw new Error("Organization not found.");
  }

  const [created] = await db
    .insert(chatWidget)
    .values({
      organizationId: input.organizationId,
      name: input.name,
      publicKey: createPublicKey(),
      primaryColor: input.primaryColor,
      backgroundColor: input.backgroundColor,
      textColor: input.textColor,
      position: input.position,
      title: input.title,
      welcomeMessage: input.welcomeMessage,
      allowedOrigins: normalizeOrigins(input.allowedOrigins),
    })
    .returning();

  return created;
}

/** Owner-scoped: returns null when the widget isn't the caller's. */
export async function updateWidget(
  ownerId: string,
  widgetId: string,
  input: UpdateWidgetInput,
) {
  const owned = await db
    .select({ id: chatWidget.id })
    .from(chatWidget)
    .innerJoin(organization, eq(chatWidget.organizationId, organization.id))
    .where(and(eq(chatWidget.id, widgetId), eq(organization.ownerId, ownerId)))
    .limit(1);

  if (owned.length === 0) {
    return null;
  }

  const { allowedOrigins, ...patch } = input;

  const [updated] = await db
    .update(chatWidget)
    .set({
      ...patch,
      ...(allowedOrigins
        ? { allowedOrigins: normalizeOrigins(allowedOrigins) }
        : {}),
    })
    .where(eq(chatWidget.id, widgetId))
    .returning();

  return updated;
}

export async function deleteWidget(ownerId: string, widgetId: string) {
  const owned = await db
    .select({ id: chatWidget.id })
    .from(chatWidget)
    .innerJoin(organization, eq(chatWidget.organizationId, organization.id))
    .where(and(eq(chatWidget.id, widgetId), eq(organization.ownerId, ownerId)))
    .limit(1);

  if (owned.length === 0) {
    return null;
  }

  const [deleted] = await db
    .delete(chatWidget)
    .where(eq(chatWidget.id, widgetId))
    .returning();

  return deleted;
}

/** Issues a fresh key and invalidates the old one (e.g. after a leak). */
export async function rotateWidgetKey(ownerId: string, widgetId: string) {
  const owned = await db
    .select({ id: chatWidget.id })
    .from(chatWidget)
    .innerJoin(organization, eq(chatWidget.organizationId, organization.id))
    .where(and(eq(chatWidget.id, widgetId), eq(organization.ownerId, ownerId)))
    .limit(1);

  if (owned.length === 0) {
    return null;
  }

  const [rotated] = await db
    .update(chatWidget)
    .set({ publicKey: createPublicKey() })
    .where(eq(chatWidget.id, widgetId))
    .returning();

  return rotated;
}

/** Public lookup used by the embed script. No session required. */
export async function getWidgetByPublicKey(publicKey: string) {
  const [row] = await db
    .select({
      id: chatWidget.id,
      name: chatWidget.name,
      primaryColor: chatWidget.primaryColor,
      backgroundColor: chatWidget.backgroundColor,
      textColor: chatWidget.textColor,
      position: chatWidget.position,
      title: chatWidget.title,
      welcomeMessage: chatWidget.welcomeMessage,
      allowedOrigins: chatWidget.allowedOrigins,
      active: chatWidget.active,
    })
    .from(chatWidget)
    .where(eq(chatWidget.publicKey, publicKey))
    .limit(1);

  return row ?? null;
}
