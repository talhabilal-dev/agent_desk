/**
 * Only allow same-origin, relative redirect targets so a crafted
 * `?redirect=` value can't bounce a user off-site.
 */
export function getSafeRedirect(value: unknown, fallback = "/dashboard") {
  if (typeof value !== "string") {
    return fallback;
  }

  if (!value.startsWith("/") || value.startsWith("//")) {
    return fallback;
  }

  return value;
}
