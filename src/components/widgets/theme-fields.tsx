"use client";

import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import type { WidgetThemeInput } from "@/lib/validations/widget";

export const DEFAULT_THEME: WidgetThemeInput = {
  primaryColor: "#4f46e5",
  backgroundColor: "#0b0b12",
  textColor: "#f8fafc",
  position: "bottom-right",
  title: "Chat with us",
  welcomeMessage: "Hi! How can I help?",
};

function ColorField({
  id,
  label,
  value,
  disabled,
  onChange,
}: {
  id: string;
  label: string;
  value: string;
  disabled: boolean;
  onChange: (value: string) => void;
}) {
  return (
    <div className="flex flex-col gap-2">
      <label htmlFor={id} className="text-sm font-medium">
        {label}
      </label>
      <div className="flex items-center gap-2">
        {/* Native colour input: no picker dependency, still keyboard accessible. */}
        <input
          id={id}
          type="color"
          value={value}
          disabled={disabled}
          onChange={(event) => onChange(event.target.value)}
          className="size-8 shrink-0 cursor-pointer rounded-lg border border-white/10 bg-transparent p-0.5 disabled:opacity-50"
        />
        <Input
          value={value}
          disabled={disabled}
          spellCheck={false}
          onChange={(event) => onChange(event.target.value)}
          className="font-mono text-xs"
        />
      </div>
    </div>
  );
}

export function ThemeFields({
  theme,
  disabled,
  onChange,
}: {
  theme: WidgetThemeInput;
  disabled: boolean;
  onChange: (theme: WidgetThemeInput) => void;
}) {
  return (
    <div className="flex flex-col gap-4">
      <div className="grid gap-4 sm:grid-cols-3">
        <ColorField
          id="widget-primary"
          label="Accent"
          value={theme.primaryColor}
          disabled={disabled}
          onChange={(primaryColor) => onChange({ ...theme, primaryColor })}
        />
        <ColorField
          id="widget-background"
          label="Background"
          value={theme.backgroundColor}
          disabled={disabled}
          onChange={(backgroundColor) =>
            onChange({ ...theme, backgroundColor })
          }
        />
        <ColorField
          id="widget-text"
          label="Text"
          value={theme.textColor}
          disabled={disabled}
          onChange={(textColor) => onChange({ ...theme, textColor })}
        />
      </div>

      <div className="flex flex-col gap-2">
        <label htmlFor="widget-position" className="text-sm font-medium">
          Open on
        </label>
        <Select
          id="widget-position"
          value={theme.position}
          disabled={disabled}
          onChange={(event) =>
            onChange({
              ...theme,
              position: event.target.value as WidgetThemeInput["position"],
            })
          }
        >
          <option value="bottom-right">Bottom right</option>
          <option value="bottom-left">Bottom left</option>
        </Select>
        <p className="text-xs text-muted-foreground">
          The launcher sits in that corner and the panel opens inward from it.
        </p>
      </div>

      <div className="flex flex-col gap-2">
        <label htmlFor="widget-title" className="text-sm font-medium">
          Title
        </label>
        <Input
          id="widget-title"
          value={theme.title}
          disabled={disabled}
          maxLength={60}
          onChange={(event) =>
            onChange({ ...theme, title: event.target.value })
          }
        />
      </div>

      <div className="flex flex-col gap-2">
        <label htmlFor="widget-welcome" className="text-sm font-medium">
          Welcome message
        </label>
        <Input
          id="widget-welcome"
          value={theme.welcomeMessage}
          disabled={disabled}
          maxLength={200}
          onChange={(event) =>
            onChange({ ...theme, welcomeMessage: event.target.value })
          }
        />
      </div>
    </div>
  );
}

/** Mirrors the real embed: panel above the launcher, opening inward. */
export function WidgetPreview({ theme }: { theme: WidgetThemeInput }) {
  const openLeft = theme.position === "bottom-left";

  return (
    <div className="relative h-48 overflow-hidden rounded-xl border border-white/5 bg-[radial-gradient(circle_at_20%_20%,rgba(99,102,241,0.12),transparent_55%)]">
      <div
        className="absolute bottom-3 flex w-40 flex-col gap-2"
        style={{
          [openLeft ? "left" : "right"]: "0.75rem",
          alignItems: openLeft ? "flex-start" : "flex-end",
        }}
      >
        <div
          className="w-full rounded-xl p-3 shadow-xl"
          style={{
            backgroundColor: theme.backgroundColor,
            color: theme.textColor,
          }}
        >
          <span className="text-xs font-semibold">{theme.title}</span>
          <span
            className="mt-2 block w-fit rounded-lg px-2 py-1 text-[11px]"
            style={{ backgroundColor: theme.primaryColor, color: "#ffffff" }}
          >
            {theme.welcomeMessage}
          </span>
        </div>
        <span
          className="size-9 rounded-full shadow-lg"
          style={{ backgroundColor: theme.primaryColor }}
        />
      </div>
    </div>
  );
}
