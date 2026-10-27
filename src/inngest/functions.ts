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
    onFailure: async ({ event, error }) => {
      // Nothing to persist: the claim is only written on success (see below), so
      // a failed run leaves the event re-deliverable. Log loudly so an
      // unreconciled subscription is visible.
      const data =
        (event.data.event?.data as CheckoutCompletedData | undefined) ??
        undefined;

      console.error(
        "[billing] checkout verification failed permanently; the subscription may be unreconciled",
        {
          eventId: data?.eventId,
          sessionId: data?.sessionId,
          error: error.message,
        },
      );
    },
  },
  async ({ event, step }) => {
    const { eventId, sessionId } = event.data as CheckoutCompletedData;

    // Verify *first*, claim afterwards. Claiming before verification committed
    // the event id even when verification failed, so every later delivery of the
    // same event short-circuited on the claim and a subscription that failed to
    // reconcile could never be repaired.
    const result = await step.run("verify-session", () =>
      verifyCheckoutSession(sessionId),
    );

    await step.run("claim-event", () =>
      claimStripeEvent(eventId, "checkout.session.completed"),
    );

    return result;
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
      // Failure events nest the original trigger: event.data.event.data.
      // (FailureEventPayload.data = { function_id, run_id, error, event }.)
      const documentId = (event.data.event?.data as DocumentData | undefined)
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
      // No try/catch: a queue failure must fail the step so Inngest retries it.
      // Swallowing the error marked the step successful, stranding the document
      // at `extracted` with no automatic recovery.
      await step.run("enqueue-embeddings", () =>
        inngest.send({
          // Fresh id: Inngest dedupes sends for 24h, and retries (or a
          // manual retry later) must be able to re-enqueue.
          id: `document-embed-${documentId}-${Date.now()}`,
          name: "document/embed.requested",
          data: { documentId },
        }),
      );
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
      // Failure events nest the original trigger: event.data.event.data.
      // (FailureEventPayload.data = { function_id, run_id, error, event }.)
      const documentId = (event.data.event?.data as DocumentData | undefined)
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
