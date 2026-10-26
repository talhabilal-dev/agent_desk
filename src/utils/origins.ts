/**
 * Origin normalisation shared by the dashboard (parsing textarea lines) and the
 * API (storing what will be compared against the `Origin` header).
 */

/** `"https://App.Acme.com/dashboard"` -> `"https://app.acme.com"`, else null. */
export function normalizeOrigin(value: string) {
  const trimmed = value.trim().toLowerCase();

  if (!trimmed) {
    return null;
  }

  // Bare hosts are the common case ("acme.com", "localhost:3000").
  const withScheme = /^[a-z][a-z0-9+.-]*:\/\//.test(trimmed)
    ? trimmed
    : `https://${trimmed}`;

  try {
    const url = new URL(withScheme);

    if (url.protocol !== "http:" && url.protocol !== "https:") {
      return null;
    }

    // Any path/query is dropped: an origin is scheme + host + port only.
    return url.origin;
  } catch {
    return null;
  }
}

export function normalizeOrigins(values: string[]) {
  const seen = new Set<string>();

  for (const value of values) {
    const origin = normalizeOrigin(value);

    if (origin) {
      seen.add(origin);
    }
  }

  return [...seen];
}

/** Splits a textarea value (newlines and/or commas) into unique origins. */
export function parseOriginLines(value: string) {
  return normalizeOrigins(value.split(/[\n,]/));
}
