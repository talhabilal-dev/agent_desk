/** Accepted upload types. */
export const ALLOWED_DOCUMENT_TYPES = [
  "application/pdf",
  "image/png",
  "image/jpeg",
  "image/webp",
] as const;

/**
 * The upload is proxied through a serverless function, and Vercel caps request
 * bodies at ~4.5 MB. Keep this below that or large scans 413 at the edge with a
 * confusing error. Raising it needs presigned direct-to-bucket uploads.
 */
export const MAX_UPLOAD_BYTES = 4 * 1024 * 1024;

/** Human-readable cap, so error messages cannot drift from the value. */
export const MAX_UPLOAD_MB = Math.floor(MAX_UPLOAD_BYTES / (1024 * 1024));
