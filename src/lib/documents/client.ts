"use client";

import type { DocumentSummary } from "./service";

async function readError(response: Response) {
  const body: unknown = await response.json().catch(() => null);

  if (body && typeof body === "object" && "error" in body) {
    return String((body as { error: unknown }).error);
  }

  return `Request failed (${response.status}).`;
}

export async function uploadDocument(input: {
  organizationId: string;
  file: File;
}) {
  const body = new FormData();
  body.append("organizationId", input.organizationId);
  body.append("file", input.file);

  const response = await fetch("/api/documents", { method: "POST", body });

  if (!response.ok) {
    throw new Error(await readError(response));
  }

  return (await response.json()) as {
    document: DocumentSummary;
    reused: boolean;
  };
}

export async function retryDocument(documentId: string) {
  const response = await fetch(`/api/documents/${documentId}/retry`, {
    method: "POST",
  });

  if (!response.ok) {
    throw new Error(await readError(response));
  }
}
