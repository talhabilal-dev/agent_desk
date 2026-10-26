"use client";

import { parseOriginLines } from "@/utils/origins";

/**
 * One origin per line (commas work too). Whatever is typed is normalised as it
 * is previewed, so what the user sees is exactly what gets stored.
 */
export function OriginsField({
  value,
  disabled,
  onChange,
}: {
  value: string;
  disabled: boolean;
  onChange: (value: string) => void;
}) {
  const origins = parseOriginLines(value);

  return (
    <div className="flex flex-col gap-2">
      <label htmlFor="widget-origins" className="text-sm font-medium">
        Allowed origins
      </label>
      <textarea
        id="widget-origins"
        rows={3}
        value={value}
        disabled={disabled}
        spellCheck={false}
        placeholder={"https://acme.com\nhttp://localhost:3000"}
        onChange={(event) => onChange(event.target.value)}
        className="min-h-20 w-full resize-y rounded-lg border border-input bg-transparent px-2.5 py-2 font-mono text-xs transition-colors outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-input/30"
      />
      <p className="text-xs text-muted-foreground">
        {origins.length === 0
          ? "Empty means any site may embed this widget. Add one origin per line to restrict it."
          : `${origins.length} origin${
              origins.length === 1 ? "" : "s"
            }: ${origins.join(", ")}`}
      </p>
    </div>
  );
}
