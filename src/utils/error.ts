export function errorMessage(
  error: unknown,
  fallback = "Something went wrong.",
) {
  return error instanceof Error && error.message ? error.message : fallback;
}

/**
 * Postgres error code (e.g. `23505` for a unique violation), walking drizzle's
 * error `cause` chain because the driver error is wrapped.
 */
export function postgresErrorCode(error: unknown): string | undefined {
  let current: unknown = error;

  for (let depth = 0; current && depth < 5; depth += 1) {
    if (typeof current === "object" && "code" in current) {
      const { code } = current as { code?: unknown };

      if (typeof code === "string") {
        return code;
      }
    }

    current =
      typeof current === "object" && current !== null
        ? (current as { cause?: unknown }).cause
        : undefined;
  }

  return undefined;
}
