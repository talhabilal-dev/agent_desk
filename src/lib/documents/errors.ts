export type DocumentErrorCode =
  | "FILE_MISSING"
  | "UNSUPPORTED_TYPE"
  | "OCR_NOT_IN_PLAN"
  | "PAGE_LIMIT_REACHED"
  | "IMAGE_TOO_SMALL"
  | "IMAGE_TOO_BLURRY"
  | "EMPTY_DOCUMENT"
  | "EMBEDDINGS_NOT_CONFIGURED"
  | "PROCESSING_FAILED";

/**
 * `retryable` distinguishes "try again might work" (network/Stripe/OpenAI
 * hiccup) from a permanent rejection (blurry image, OCR not in plan), so the
 * pipeline can stop retrying and record the message immediately.
 */
export class DocumentError extends Error {
  readonly code: DocumentErrorCode;
  readonly retryable: boolean;

  constructor(code: DocumentErrorCode, message: string, retryable = false) {
    super(message);
    this.name = "DocumentError";
    this.code = code;
    this.retryable = retryable;
  }
}
