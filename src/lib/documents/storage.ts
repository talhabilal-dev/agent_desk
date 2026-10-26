import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";

/**
 * Ephemeral storage: uploads live on disk only until the document is
 * processed, then they are deleted. Swap this module for S3 to go durable.
 */
const ROOT = process.env.UPLOAD_DIR ?? ".uploads";

function pathFor(key: string) {
  // Keys are generated server-side, but validate anyway so a crafted key can
  // never escape the upload root.
  if (!/^[a-zA-Z0-9_-]+$/.test(key)) {
    throw new Error("Invalid storage key.");
  }

  return join(ROOT, key);
}

export async function putFile(key: string, bytes: Uint8Array) {
  await mkdir(ROOT, { recursive: true });
  await writeFile(pathFor(key), bytes);
  return key;
}

export async function getFile(key: string) {
  return readFile(pathFor(key));
}

/** Idempotent: a missing file is not an error. */
export async function removeFile(key: string) {
  try {
    await rm(pathFor(key));
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") {
      throw error;
    }
  }
}
