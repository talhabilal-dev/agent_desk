-- Neon supports pgvector, but the extension is created per database and
-- drizzle-kit does not emit it. This must run first: the vector column and its
-- HNSW index below depend on it.
CREATE EXTENSION IF NOT EXISTS vector;--> statement-breakpoint
CREATE TYPE "document_action" AS ENUM('ingest', 'embed', 'reindex', 'delete');--> statement-breakpoint
CREATE TYPE "document_status" AS ENUM('pending', 'processing', 'extracted', 'embedding', 'ready', 'failed');--> statement-breakpoint
CREATE TYPE "document_type" AS ENUM('raw_text', 'structured_text');--> statement-breakpoint
CREATE TYPE "processing_tier" AS ENUM('basic', 'advanced');--> statement-breakpoint
CREATE TYPE "widget_position" AS ENUM('bottom-right', 'bottom-left');--> statement-breakpoint
CREATE TABLE "account" (
	"id" text PRIMARY KEY,
	"account_id" text NOT NULL,
	"provider_id" text NOT NULL,
	"user_id" text NOT NULL,
	"access_token" text,
	"refresh_token" text,
	"id_token" text,
	"access_token_expires_at" timestamp,
	"refresh_token_expires_at" timestamp,
	"scope" text,
	"password" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE "session" (
	"id" text PRIMARY KEY,
	"expires_at" timestamp NOT NULL,
	"token" text NOT NULL UNIQUE,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp NOT NULL,
	"ip_address" text,
	"user_agent" text,
	"user_id" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "subscription" (
	"id" text PRIMARY KEY,
	"plan" text NOT NULL,
	"reference_id" text NOT NULL,
	"stripe_customer_id" text,
	"stripe_subscription_id" text,
	"status" text DEFAULT 'incomplete' NOT NULL,
	"period_start" timestamp,
	"period_end" timestamp,
	"trial_start" timestamp,
	"trial_end" timestamp,
	"cancel_at_period_end" boolean DEFAULT false,
	"cancel_at" timestamp,
	"canceled_at" timestamp,
	"ended_at" timestamp,
	"seats" integer,
	"billing_interval" text,
	"stripe_schedule_id" text
);
--> statement-breakpoint
CREATE TABLE "user" (
	"id" text PRIMARY KEY,
	"name" text NOT NULL,
	"email" text NOT NULL UNIQUE,
	"email_verified" boolean DEFAULT false NOT NULL,
	"image" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"stripe_customer_id" text
);
--> statement-breakpoint
CREATE TABLE "verification" (
	"id" text PRIMARY KEY,
	"identifier" text NOT NULL,
	"value" text NOT NULL,
	"expires_at" timestamp NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "chat_widget" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"organization_id" uuid NOT NULL,
	"name" text NOT NULL,
	"public_key" text NOT NULL UNIQUE,
	"primary_color" text DEFAULT '#4f46e5' NOT NULL,
	"background_color" text DEFAULT '#0b0b12' NOT NULL,
	"text_color" text DEFAULT '#f8fafc' NOT NULL,
	"position" "widget_position" DEFAULT 'bottom-right'::"widget_position" NOT NULL,
	"title" text DEFAULT 'Chat with us' NOT NULL,
	"welcome_message" text DEFAULT 'Hi! How can I help?' NOT NULL,
	"panel_width" integer DEFAULT 340 NOT NULL,
	"panel_height" integer DEFAULT 460 NOT NULL,
	"allowed_origins" text[] DEFAULT '{}'::text[] NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "document" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"organization_id" uuid NOT NULL,
	"content" text NOT NULL,
	"type" "document_type" NOT NULL,
	"action" "document_action" NOT NULL,
	"status" "document_status" DEFAULT 'pending'::"document_status" NOT NULL,
	"source_key" text,
	"file_name" text,
	"mime_type" text,
	"size_bytes" integer,
	"content_hash" text,
	"page_count" integer,
	"total_page_count" integer,
	"error_text" text,
	"processed_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "embedding" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"organization_id" uuid NOT NULL,
	"document_id" uuid NOT NULL,
	"content" text NOT NULL,
	"chunk_index" integer NOT NULL,
	"embedding" vector(1536) NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "llm_usage" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"organization_id" uuid NOT NULL,
	"widget_id" uuid,
	"model" text NOT NULL,
	"input_tokens" integer DEFAULT 0 NOT NULL,
	"output_tokens" integer DEFAULT 0 NOT NULL,
	"total_tokens" integer DEFAULT 0 NOT NULL,
	"cost_usd" numeric(14,8) DEFAULT '0' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "model_price" (
	"model" text PRIMARY KEY,
	"input_per_million" numeric(12,6) NOT NULL,
	"output_per_million" numeric(12,6) NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "organization" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"owner_id" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "plan" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"key" text NOT NULL UNIQUE,
	"name" text NOT NULL,
	"description" text,
	"monthly_price_cents" integer NOT NULL,
	"annual_monthly_price_cents" integer NOT NULL,
	"stripe_price_id_monthly" text,
	"stripe_price_id_annual" text,
	"organization_limit" integer,
	"page_limit" integer NOT NULL,
	"ocr_enabled" boolean DEFAULT false NOT NULL,
	"processing_tier" "processing_tier" NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "stripe_event" (
	"event_id" text PRIMARY KEY,
	"type" text NOT NULL,
	"processed_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "usage" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"reference_id" text NOT NULL,
	"period" text NOT NULL,
	"pages" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX "account_userId_idx" ON "account" ("user_id");--> statement-breakpoint
CREATE INDEX "session_userId_idx" ON "session" ("user_id");--> statement-breakpoint
CREATE INDEX "subscription_reference_id_idx" ON "subscription" ("reference_id");--> statement-breakpoint
CREATE INDEX "verification_identifier_idx" ON "verification" ("identifier");--> statement-breakpoint
CREATE INDEX "chat_widget_organization_id_idx" ON "chat_widget" ("organization_id");--> statement-breakpoint
CREATE INDEX "document_organization_created_idx" ON "document" ("organization_id","created_at");--> statement-breakpoint
CREATE INDEX "document_status_idx" ON "document" ("status");--> statement-breakpoint
CREATE UNIQUE INDEX "document_org_hash_idx" ON "document" ("organization_id","content_hash");--> statement-breakpoint
CREATE INDEX "embedding_organization_id_idx" ON "embedding" ("organization_id");--> statement-breakpoint
CREATE UNIQUE INDEX "embedding_document_chunk_idx" ON "embedding" ("document_id","chunk_index");--> statement-breakpoint
CREATE INDEX "embedding_vector_hnsw_idx" ON "embedding" USING hnsw ("embedding" vector_cosine_ops);--> statement-breakpoint
CREATE INDEX "llm_usage_organization_created_idx" ON "llm_usage" ("organization_id","created_at");--> statement-breakpoint
CREATE INDEX "organization_owner_id_idx" ON "organization" ("owner_id");--> statement-breakpoint
CREATE UNIQUE INDEX "organization_owner_slug_idx" ON "organization" ("owner_id","slug");--> statement-breakpoint
CREATE UNIQUE INDEX "usage_reference_period_idx" ON "usage" ("reference_id","period");--> statement-breakpoint
ALTER TABLE "account" ADD CONSTRAINT "account_user_id_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "session" ADD CONSTRAINT "session_user_id_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "chat_widget" ADD CONSTRAINT "chat_widget_organization_id_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organization"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "document" ADD CONSTRAINT "document_organization_id_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organization"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "embedding" ADD CONSTRAINT "embedding_organization_id_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organization"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "embedding" ADD CONSTRAINT "embedding_document_id_document_id_fkey" FOREIGN KEY ("document_id") REFERENCES "document"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "llm_usage" ADD CONSTRAINT "llm_usage_organization_id_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organization"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "llm_usage" ADD CONSTRAINT "llm_usage_widget_id_chat_widget_id_fkey" FOREIGN KEY ("widget_id") REFERENCES "chat_widget"("id") ON DELETE SET NULL;--> statement-breakpoint
ALTER TABLE "organization" ADD CONSTRAINT "organization_owner_id_user_id_fkey" FOREIGN KEY ("owner_id") REFERENCES "user"("id") ON DELETE CASCADE;