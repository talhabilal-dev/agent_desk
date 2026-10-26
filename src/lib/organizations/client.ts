"use client";

export type OrganizationSummary = {
  id: string;
  name: string;
  slug: string;
};

async function request<T>(input: string, init?: RequestInit): Promise<T> {
  const response = await fetch(input, {
    ...init,
    headers: { "Content-Type": "application/json", ...init?.headers },
  });

  const body: unknown = await response.json().catch(() => null);

  if (!response.ok) {
    const message =
      body && typeof body === "object" && "error" in body
        ? String((body as { error: unknown }).error)
        : "Something went wrong.";

    throw new Error(message);
  }

  return body as T;
}

export function createOrganization(input: { name: string; slug: string }) {
  return request<OrganizationSummary>("/api/organizations", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export function renameOrganization(
  organizationId: string,
  input: { name: string; slug: string },
) {
  return request<OrganizationSummary>(`/api/organizations/${organizationId}`, {
    method: "PATCH",
    body: JSON.stringify(input),
  });
}

export function deleteOrganization(organizationId: string) {
  return request<OrganizationSummary>(`/api/organizations/${organizationId}`, {
    method: "DELETE",
  });
}
