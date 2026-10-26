/** Formats an integer amount of cents as a USD string, e.g. 1000 -> "$10". */
export function formatUsd(cents: number) {
  const dollars = cents / 100;

  return Number.isInteger(dollars) ? `$${dollars}` : `$${dollars.toFixed(2)}`;
}
