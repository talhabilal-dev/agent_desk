import { and, eq, inArray, lt, or, sql } from "drizzle-orm";

import { db, document, organization } from "@/db";
import { inngest } from "@/inngest/client";
import { requireApiSession } from "@/lib/organizations/guard";
import { organizationIdSchema } from "@/lib/validations/organization";
import { STALE_AFTER_MS } from "@/utils/documents";

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(request: Request, context: RouteContext) {
  const auth = await requireApiSession(request);

  if (!auth.ok) {
    return auth.response;
  }

  const id = organizationIdSchema.safeParse((await context.params).id);

  if (!id.success) {
    return Response.json({ error: "Invalid document id." }, { status: 400 });
  }

  const ownerId = auth.session.user.id;
  const staleBefore = new Date(Date.now() - STALE_AFTER_MS);

  /**
   * One atomic statement decides *and* performs the retry, so two concurrent
   * clicks (or a click during a slow OCR run) can never start a second worker.
   * The previous version read the row, then updated it — a check-then-act race
   * that duplicated extraction, embeddings and page charges.
   *
   * A run older than the staleness window is assumed dead; anything younger is
   * left alone. `pending` is included so a row whose event was never picked up
   * is recoverable rather than stuck forever.
   */
  const [claimed] = await db
    .update(document)
    .set({
      // Text already present means only the embedding stage needs re-running.
      status: sql`case when length(trim(${document.content})) > 0 then 'extracted' else 'pending' end`,
      errorText: null,
    })
    .where(
      and(
        eq(document.id, id.data),
        inArray(
          document.organizationId,
          db
            .select({ id: organization.id })
            .from(organization)
            .where(eq(organization.ownerId, ownerId)),
        ),
        or(
          inArray(document.status, ["failed", "extracted"]),
          and(
            inArray(document.status, ["pending", "processing", "embedding"]),
            lt(document.updatedAt, staleBefore),
          ),
        ),
      ),
    )
    .returning({ id: document.id, status: document.status });

  if (!claimed) {
    // Distinguish "not yours / not found" from "still running" for the caller.
    const [existing] = await db
      .select({ id: document.id })
      .from(document)
      .innerJoin(organization, eq(document.organizationId, organization.id))
      .where(and(eq(document.id, id.data), eq(organization.ownerId, ownerId)))
      .limit(1);

    return existing
      ? Response.json(
          { error: "This document is still processing. Try again shortly." },
          { status: 409 },
        )
      : Response.json({ error: "Document not found." }, { status: 404 });
  }

  const stage = claimed.status === "extracted" ? "embed" : "extract";

  try {
    await inngest.send({
      // A fresh event id so Inngest's 24h dedupe doesn't swallow the retry.
      id: `document-${claimed.id}-${Date.now()}`,
      name:
        stage === "embed"
          ? "document/embed.requested"
          : "document/ingest.requested",
      data: { documentId: claimed.id },
    });
  } catch (error) {
    console.error("[documents] failed to enqueue retry", error);

    // Put the row back where it was: leaving it `pending` with no event queued
    // would be worse than the state the user started from.
    await db
      .update(document)
      .set({ status: "failed", errorText: "Could not queue processing." })
      .where(eq(document.id, claimed.id));

    return Response.json(
      {
        error: "Could not queue processing. Is the Inngest dev server running?",
      },
      { status: 503 },
    );
  }

  return Response.json({ retried: true, stage });
}
