export type DocumentStatus =
  | "pending"
  | "processing"
  | "extracted"
  | "embedding"
  | "ready"
  | "failed";

/** A row in one of these states will not change on its own. */
export function isTerminal(status: DocumentStatus) {
  return status === "ready" || status === "failed";
}

/** A `processing`/`embedding` row older than this is treated as abandoned. */
export const STALE_AFTER_MS = 5 * 60 * 1000;

/**
 * True when a row claims to be mid-flight but nothing is moving it — e.g. the
 * worker died, or a run failed before the failure was recorded.
 */
export function isStalled(status: DocumentStatus, updatedAt: Date | string) {
  const at = updatedAt instanceof Date ? updatedAt : new Date(updatedAt);

  return (
    (status === "processing" || status === "embedding") &&
    Date.now() - at.getTime() > STALE_AFTER_MS
  );
}
