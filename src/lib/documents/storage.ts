import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import {
  DeleteObjectCommand,
  GetObjectCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";

/**
 * Durable object storage: Neon Object Storage, reached through the S3 API.
 *
 * Neon implements a *subset* of S3, and three details matter here:
 * - path-style addressing only, so `forcePathStyle` is mandatory;
 * - SigV4 only;
 * - ACL/policy writes return 501 — the bucket's access level (`private`) is set
 *   in Neon, never from this code.
 *
 * The endpoint and bucket are branch-scoped, so a preview branch reads and
 * writes its own files.
 */
/**
 * `S3_*` is this app's own naming; `AWS_*` is what `neon deploy` injects, so both
 * are accepted rather than duplicating the same values in .env.
 */
const bucket = process.env.S3_BUCKET;
const endpoint =
  process.env.S3_ENDPOINT ?? process.env.AWS_ENDPOINT_URL_S3 ?? undefined;
const region = process.env.S3_REGION ?? process.env.AWS_REGION ?? "auto";

/** Development convenience only: a bucket is required in production. */
const useLocalDisk = !bucket && process.env.NODE_ENV !== "production";

const LOCAL_ROOT = process.env.UPLOAD_DIR ?? ".uploads";

const client = bucket
  ? new S3Client({
      region,
      endpoint,
      // Neon serves path-style paths only; virtual-hosted-style 404s.
      forcePathStyle: true,
    })
  : null;

/**
 * Checked at call time, not at import time, so a production build (which
 * evaluates this module with NODE_ENV=production) cannot fail before the
 * deployment has any configuration to read.
 */
function requireClient() {
  if (!client) {
    throw new Error(
      "S3_BUCKET is not set. Object storage is required in production (Neon Object Storage).",
    );
  }

  return client;
}

/** The object genuinely does not exist, as opposed to a transport failure. */
export class StorageObjectMissingError extends Error {
  constructor(key: string) {
    super(`Object not found: ${key}`);
    this.name = "StorageObjectMissingError";
  }
}

function pathFor(key: string) {
  // Keys are generated server-side, but validate anyway so a crafted key can
  // never escape the upload root.
  if (!/^[a-zA-Z0-9_-]+$/.test(key)) {
    throw new Error("Invalid storage key.");
  }

  return join(LOCAL_ROOT, key);
}

function assertKey(key: string) {
  if (!/^[a-zA-Z0-9_-]+$/.test(key)) {
    throw new Error("Invalid storage key.");
  }
}

/** S3 reports a missing object as 404 / NoSuchKey; anything else is transient. */
function isMissingObject(error: unknown) {
  const status = (error as { $metadata?: { httpStatusCode?: number } })
    .$metadata?.httpStatusCode;
  const name = (error as { name?: string }).name;

  // Note: `NoSuchBucket` is deliberately NOT included. A missing bucket is a
  // configuration error and must surface as a retryable failure, not as
  // "this document's file is gone", which would fail it permanently.
  return status === 404 || name === "NoSuchKey" || name === "NotFound";
}

export async function putFile(key: string, bytes: Uint8Array) {
  assertKey(key);

  if (useLocalDisk) {
    await mkdir(LOCAL_ROOT, { recursive: true });
    await writeFile(pathFor(key), bytes);

    return key;
  }

  await requireClient().send(
    new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      Body: bytes,
      ContentType: "application/octet-stream",
    }),
  );

  return key;
}

export async function getFile(key: string) {
  assertKey(key);

  if (useLocalDisk) {
    try {
      return await readFile(pathFor(key));
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === "ENOENT") {
        throw new StorageObjectMissingError(key);
      }

      throw error;
    }
  }

  try {
    const response = await requireClient().send(
      new GetObjectCommand({ Bucket: bucket, Key: key }),
    );

    if (!response.Body) {
      throw new Error(`Empty object body for ${key}.`);
    }

    return Buffer.from(await response.Body.transformToByteArray());
  } catch (error) {
    if (isMissingObject(error)) {
      throw new StorageObjectMissingError(key);
    }

    // Throttling (`503 SlowDown`) and network failures must stay retryable.
    throw error;
  }
}

/** Idempotent: a missing object is not an error. */
export async function removeFile(key: string) {
  assertKey(key);

  if (useLocalDisk) {
    try {
      await rm(pathFor(key));
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "ENOENT") {
        throw error;
      }
    }

    return;
  }

  try {
    await requireClient().send(
      new DeleteObjectCommand({ Bucket: bucket, Key: key }),
    );
  } catch (error) {
    if (!isMissingObject(error)) {
      throw error;
    }
  }
}
