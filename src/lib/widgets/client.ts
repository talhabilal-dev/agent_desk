"use client";

import type {
  CreateWidgetInput,
  UpdateWidgetInput,
} from "@/lib/validations/widget";

async function readError(response: Response) {
  const body: unknown = await response.json().catch(() => null);

  if (body && typeof body === "object" && "error" in body) {
    return String((body as { error: unknown }).error);
  }

  return `Request failed (${response.status}).`;
}

async function send<T>(url: string, method: string, body?: unknown) {
  const response = await fetch(url, {
    method,
    headers: body ? { "Content-Type": "application/json" } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });

  if (!response.ok) {
    throw new Error(await readError(response));
  }

  return (await response.json().catch(() => null)) as T;
}

export function createWidget(input: CreateWidgetInput) {
  return send("/api/widgets", "POST", input);
}

export function updateWidget(id: string, input: UpdateWidgetInput) {
  return send(`/api/widgets/${id}`, "PATCH", input);
}

export function deleteWidget(id: string) {
  return send(`/api/widgets/${id}`, "DELETE");
}

export function rotateWidgetKey(id: string) {
  return send<{ publicKey: string }>(`/api/widgets/${id}/rotate`, "POST");
}
