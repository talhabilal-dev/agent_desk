import {
  boolean,
  index,
  integer,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uuid,
  vector,
} from "drizzle-orm/pg-core";

import { user } from "./auth-schema";

/** Dimension of the embedding column. Changing this requires re-embedding. */
export const EMBEDDING_DIMENSIONS = 1536;

/** Distance metric used by the vector index. Queries must use the `<=>` operator. */
export const EMBEDDING_OPERATOR_CLASS = "vector_cosine_ops";

export const documentTypeEnum = pgEnum("document_type", [
  "raw_text",
  "structured_text",
]);

export const documentActionEnum = pgEnum("document_action", [
  "ingest",
  "embed",
  "reindex",
  "delete",
]);

export const documentStatusEnum = pgEnum("document_status", [
  "pending",
  "processing",
  "ready",
  "failed",
]);

export const processingTierEnum = pgEnum("processing_tier", [
  "basic",
  "advanced",
]);

/**
 * Subscription plan catalog. Kept in the database so plans and prices are
 * editable without a code change; the Stripe plugin reads it via
 * `getStripePlans()`. Deliberately no FK from `subscription.plan` so a plan can
 * be deactivated without orphaning existing subscribers.
 */
export const plan = pgTable("plan", {
  id: uuid("id").primaryKey().defaultRandom(),
  key: text("key").notNull().unique(),
  name: text("name").notNull(),
  description: text("description"),
  monthlyPriceCents: integer("monthly_price_cents").notNull(),
  /** Per-month price when billed yearly; the Stripe yearly price is ×12. */
  annualMonthlyPriceCents: integer("annual_monthly_price_cents").notNull(),
  stripePriceIdMonthly: text("stripe_price_id_monthly"),
  stripePriceIdAnnual: text("stripe_price_id_annual"),
  /** null = unlimited organizations. */
  organizationLimit: integer("organization_limit"),
  pageLimit: integer("page_limit").notNull(),
  ocrEnabled: boolean("ocr_enabled").notNull().default(false),
  processingTier: processingTierEnum("processing_tier").notNull(),
  sortOrder: integer("sort_order").notNull().default(0),
  active: boolean("active").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at")
    .defaultNow()
    .$onUpdate(() => new Date())
    .notNull(),
});

/**
 * Idempotency ledger for Stripe webhook events. The primary key is the Stripe
 * event id, so a replayed delivery can be claimed by exactly one run — unlike
 * an in-memory or 24h dedupe window, this is permanent.
 */
export const stripeEvent = pgTable("stripe_event", {
  eventId: text("event_id").primaryKey(),
  type: text("type").notNull(),
  processedAt: timestamp("processed_at").defaultNow().notNull(),
});

/**
 * Owned by this app (no longer by the better-auth organization plugin), so the
 * only relationship it models is its owner.
 */
export const organization = pgTable(
  "organization",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    name: text("name").notNull(),
    slug: text("slug").notNull().unique(),
    ownerId: text("owner_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [index("organization_owner_id_idx").on(table.ownerId)],
);

export const document = pgTable(
  "document",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organization.id, { onDelete: "cascade" }),
    content: text("content").notNull(),
    type: documentTypeEnum("type").notNull(),
    action: documentActionEnum("action").notNull(),
    status: documentStatusEnum("status").default("pending").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [
    index("document_organization_id_idx").on(table.organizationId),
    index("document_status_idx").on(table.status),
  ],
);

export const embedding = pgTable(
  "embedding",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organization.id, { onDelete: "cascade" }),
    documentId: uuid("document_id")
      .notNull()
      .references(() => document.id, { onDelete: "cascade" }),
    embedding: vector("embedding", {
      dimensions: EMBEDDING_DIMENSIONS,
    }).notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    index("embedding_organization_id_idx").on(table.organizationId),
    index("embedding_document_id_idx").on(table.documentId),
    // Approximate nearest-neighbour index. Cosine distance suits normalised
    // text embeddings; swapping to l2 / inner product means recreating this
    // index with another opclass and changing the query operator.
    index("embedding_vector_hnsw_idx").using(
      "hnsw",
      table.embedding.op(EMBEDDING_OPERATOR_CLASS),
    ),
  ],
);

export type DocumentType = (typeof documentTypeEnum.enumValues)[number];
export type DocumentAction = (typeof documentActionEnum.enumValues)[number];
export type DocumentStatus = (typeof documentStatusEnum.enumValues)[number];
export type ProcessingTier = (typeof processingTierEnum.enumValues)[number];
