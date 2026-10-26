/** Formats an integer amount of cents as a USD string, e.g. 1000 -> "$10". */
export function formatUsd(cents: number) {
  const dollars = cents / 100;

  return Number.isInteger(dollars) ? `$${dollars}` : `$${dollars.toFixed(2)}`;
}

/** Compact byte size, e.g. 1536 -> "1.5 KB". */
export function formatBytes(bytes: number) {
  if (bytes < 1024) {
    return `${bytes} B`;
  }

  const units = ["KB", "MB", "GB"];
  let value = bytes / 1024;
  let unit = 0;

  while (value >= 1024 && unit < units.length - 1) {
    value /= 1024;
    unit += 1;
  }

  return `${value.toFixed(1)} ${units[unit]}`;
}
