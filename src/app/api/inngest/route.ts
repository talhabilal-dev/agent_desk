import { serve } from "inngest/next";

import { inngest } from "../../../inngest/client";
import {
  embedDocument,
  processDocument,
  verifyStripeCheckout,
} from "../../../inngest/functions";

export const { GET, POST, PUT } = serve({
  client: inngest,
  functions: [verifyStripeCheckout, processDocument, embedDocument],
});

/**
 * OCR (rasterise + tesseract over up to 10 pages) runs inside one step, so the
 * function needs a long budget. On Vercel's hobby tier (60s) a 10-page scan is
 * unrealistic — use Pro or lower MAX_PAGES_PER_DOCUMENT.
 */
export const maxDuration = 300;
