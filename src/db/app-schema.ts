import { sql } from "drizzle-orm";
import {
  boolean,
  index,
  integer,
  numeric,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
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
  "extracted",
  "embedding",
  "ready",
  "failed",
]);

export const processingTierEnum = pgEnum("processing_tier", [
  "basic",
  "advanced",
]);

export const widgetPositionEnum = pgEnum("widget_position", [
  "bottom-right",
  "bottom-left",
]);

/**
 * An embeddable chat widget. `publicKey` is deliberately publishable — it ships
 * in the customer's HTML — so it must only ever authorize read-only config and
 * new chat turns for this one widget, never account actions.
 */
export const chatWidget = pgTable(
  "chat_widget",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organization.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    publicKey: text("public_key").notNull().unique(),
    primaryColor: text("primary_color").notNull().default("#4f46e5"),
    backgroundColor: text("background_color").notNull().default("#0b0b12"),
    textColor: text("text_color").notNull().default("#f8fafc"),
    position: widgetPositionEnum("position").notNull().default("bottom-right"),
    title: text("title").notNull().default("Chat with us"),
    welcomeMessage: text("welcome_message")
      .notNull()
      .default("Hi! How can I help?"),
    /** Panel size in px. Clamped to the viewport by the loader. */
    panelWidth: integer("panel_width").notNull().default(340),
    panelHeight: integer("panel_height").notNull().default(460),
    /**
     * Origins allowed to call the public widget endpoints, e.g.
     * `https://app.acme.com`. Empty means "any origin": the key is publishable
     * anyway, so this is browser-side defence in depth, not a security boundary.
     */
    allowedOrigins: text("allowed_origins")
      .array()
      .notNull()
      .default(sql`'{}'::text[]`),
    active: boolean("active").notNull().default(true),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [
    index("chat_widget_organization_id_idx").on(table.organizationId),
  ],
);

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
  /**
   * Calendar-month model spend ceiling in USD. The widget key is publishable,
   * so this is the only thing standing between a scraped key and unlimited
   * cost; enforced in the public chat route before every model call.
   */
  monthlyCostCeilingUsd: numeric("monthly_cost_ceiling_usd", {
    precision: 10,
    scale: 2,
  })
    .notNull()
    .default("5"),
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
    slug: text("slug").notNull(),
    ownerId: text("owner_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [
    index("organization_owner_id_idx").on(table.ownerId),
    // Scoped per owner, not globally: slugs are user-facing, and a global unique
    // constraint turned the 409 into a cross-tenant existence oracle.
    uniqueIndex("organization_owner_slug_idx").on(table.ownerId, table.slug),
  ],
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
    /** Temp upload path; nulled once the source file has been deleted. */
    sourceKey: text("source_key"),
    fileName: text("file_name"),
    mimeType: text("mime_type"),
    sizeBytes: integer("size_bytes"),
    /** sha-256 of the uploaded bytes; used to dedupe re-uploads. */
    contentHash: text("content_hash"),
    pageCount: integer("page_count"),
    /** Real page count, so a truncated document can say how much was skipped. */
    totalPageCount: integer("total_page_count"),
    /** Failure reason shown in the UI. */
    errorText: text("error_text"),
    processedAt: timestamp("processed_at"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [
    // Serves the list query's filter *and* its sort, so the single-column
    // organization index it replaces is redundant.
    index("document_organization_created_idx").on(
      table.organizationId,
      table.createdAt,
    ),
    index("document_status_idx").on(table.status),
    // Idempotency layer 1: identical bytes in the same org reuse one row.
    // Postgres treats NULLs as distinct, so legacy rows without a hash are fine.
    uniqueIndex("document_org_hash_idx").on(
      table.organizationId,
      table.contentHash,
    ),
  ],
);

/**
 * Monthly page usage, keyed by the subscription reference (the organization
 * owner). The allowance resets when the calendar month rolls over because the
 * period forms part of the key.
 */
export const usage = pgTable(
  "usage",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    referenceId: text("reference_id").notNull(),
    /** `YYYY-MM` in UTC. */
    period: text("period").notNull(),
    pages: integer("pages").notNull().default(0),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [
    uniqueIndex("usage_reference_period_idx").on(
      table.referenceId,
      table.period,
    ),
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
    /** Chunk text, kept so retrieved passages can be quoted as citations. */
    content: text("content").notNull(),
    chunkIndex: integer("chunk_index").notNull(),
    embedding: vector("embedding", {
      dimensions: EMBEDDING_DIMENSIONS,
    }).notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    index("embedding_organization_id_idx").on(table.organizationId),
    // Unique so a re-embed can never duplicate vectors, independently of the
    // delete-then-insert the application performs.
    uniqueIndex("embedding_document_chunk_idx").on(
      table.documentId,
      table.chunkIndex,
    ),
    // Approximate nearest-neighbour index. Cosine distance suits normalised
    // text embeddings; swapping to l2 / inner product means recreating this
    // index with another opclass and changing the query operator.
    index("embedding_vector_hnsw_idx").using(
      "hnsw",
      table.embedding.op(EMBEDDING_OPERATOR_CLASS),
    ),
  ],
);

/**
 * Rate card. Kept in the database so prices can be corrected without a deploy;
 * each usage row stores the cost it computed, so historical totals never move
 * when a rate changes.
 */
export const modelPrice = pgTable("model_price", {
  model: text("model").primaryKey(),
  inputPerMillion: numeric("input_per_million", {
    precision: 12,
    scale: 6,
  }).notNull(),
  outputPerMillion: numeric("output_per_million", {
    precision: 12,
    scale: 6,
  }).notNull(),
  updatedAt: timestamp("updated_at")
    .defaultNow()
    .$onUpdate(() => new Date())
    .notNull(),
});

/** One row per model call, attributed to the workspace that caused it. */
export const llmUsage = pgTable(
  "llm_usage",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organization.id, { onDelete: "cascade" }),
    widgetId: uuid("widget_id").references(() => chatWidget.id, {
      onDelete: "set null",
    }),
    model: text("model").notNull(),
    inputTokens: integer("input_tokens").notNull().default(0),
    outputTokens: integer("output_tokens").notNull().default(0),
    totalTokens: integer("total_tokens").notNull().default(0),
    costUsd: numeric("cost_usd", { precision: 14, scale: 8 })
      .notNull()
      .default("0"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    // The usage card aggregates one organization over a date range, so one
    // composite index serves both predicates.
    index("llm_usage_organization_created_idx").on(
      table.organizationId,
      table.createdAt,
    ),
  ],
);

export type DocumentType = (typeof documentTypeEnum.enumValues)[number];
export type DocumentAction = (typeof documentActionEnum.enumValues)[number];
export type DocumentStatus = (typeof documentStatusEnum.enumValues)[number];
export type ProcessingTier = (typeof processingTierEnum.enumValues)[number];
