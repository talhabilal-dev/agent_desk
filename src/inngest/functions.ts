import { claimStripeEvent, verifyCheckoutSession } from "@/lib/billing/verify";
import {
  claimForEmbedding,
  embedExtractedDocument,
} from "@/lib/documents/embed";
import {
  claimDocument,
  failDocument,
  processClaimedDocument,
} from "@/lib/documents/process";

import { inngest } from "./client";

type CheckoutCompletedData = {
  eventId: string;
  sessionId: string;
};

type DocumentData = {
  documentId: string;
};

/**
 * Authoritative post-payment verification.
 *
 * Webhooks can be delivered more than once and the success redirect proves
 * nothing, so this re-reads the checkout from Stripe and reconciles the local
 * subscription. Idempotent at three levels: Inngest event dedupe, the
 * function-level `idempotency` key, and the `stripe_event` primary key.
 */
export const verifyStripeCheckout = inngest.createFunction(
  {
    id: "verify-stripe-checkout",
    name: "Verify Stripe checkout",
    triggers: [{ event: "stripe/checkout.completed" }],
    idempotency: "event.data.eventId",
    retries: 3,
  },
  async ({ event, step }) => {
    const { eventId, sessionId } = event.data as CheckoutCompletedData;

    const claimed = await step.run("claim-event", () =>
      claimStripeEvent(eventId, "checkout.session.completed"),
    );

    if (!claimed) {
      return { skipped: true, reason: "Event already processed." };
    }

    return step.run("verify-session", () => verifyCheckoutSession(sessionId));
  },
);

/**
 * Stage 1 — extraction. Produces the text (PDF text layer with coordinate
 * alignment, or OCR), stores it, then hands off to stage 2.
 *
 * No function-level `idempotency` key: it would block the manual retry for
 * 24h. Idempotency comes from the event id plus the `pending -> processing`
 * claim.
 */
export const processDocument = inngest.createFunction(
  {
    id: "process-document",
    name: "Process document (extract)",
    triggers: [{ event: "document/ingest.requested" }],
    retries: 2,
    // OCR is CPU-heavy; keep one large scan from starving everything else.
    concurrency: 2,
    onFailure: async ({ event, error }) => {
      const documentId = (event as unknown as { data?: DocumentData }).data
        ?.documentId;

      if (documentId) {
        await failDocument(documentId, error.message);
      }
    },
  },
  async ({ event, step }) => {
    const { documentId } = event.data as DocumentData;

    // Memoized per run, so a retry resumes after the claim instead of
    // re-claiming a row that is already `processing`. Only a boolean crosses
    // the step boundary — Inngest JSON-serializes step results.
    const claimed = await step.run("claim", async () =>
      Boolean(await claimDocument(documentId)),
    );

    if (!claimed) {
      return { skipped: true, reason: "Document is not pending." };
    }

    const result = await step.run("extract", () =>
      processClaimedDocument(documentId),
    );

    if (!("failed" in result)) {
      await step.run("enqueue-embeddings", async () => {
        try {
          await inngest.send({
            // Fresh id: Inngest dedupes sends for 24h, and retries (or a
            // manual retry later) must be able to re-enqueue.
            id: `document-embed-${documentId}-${Date.now()}`,
            name: "document/embed.requested",
            data: { documentId },
          });
        } catch (error) {
          // The text is safely stored; the row stays `extracted` and the UI
          // offers Retry. Never fail a document whose extraction succeeded.
          console.error("[documents] could not enqueue embeddings", error);
        }
      });
    }

    return result;
  },
);

/**
 * Stage 2 — embeddings. Separate so slow OCR extraction never blocks or
 * retries the embedding work, and so embeddings can be re-run alone (e.g.
 * after adding OPENAI_API_KEY) without re-extracting.
 */
export const embedDocument = inngest.createFunction(
  {
    id: "embed-document",
    name: "Embed document",
    triggers: [{ event: "document/embed.requested" }],
    retries: 2,
    concurrency: 2,
    onFailure: async ({ event, error }) => {
      const documentId = (event as unknown as { data?: DocumentData }).data
        ?.documentId;

      if (documentId) {
        await failDocument(documentId, error.message);
      }
    },
  },
  async ({ event, step }) => {
    const { documentId } = event.data as DocumentData;

    const claimed = await step.run("claim", () =>
      claimForEmbedding(documentId),
    );

    if (!claimed) {
      return { skipped: true, reason: "Document is not awaiting embeddings." };
    }

    return step.run("embed", () => embedExtractedDocument(documentId));
  },
);
