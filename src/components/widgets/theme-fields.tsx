"use client";

import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { PANEL_SIZE, type WidgetThemeInput } from "@/lib/validations/widget";

export const DEFAULT_THEME: WidgetThemeInput = {
  primaryColor: "#4f46e5",
  backgroundColor: "#0b0b12",
  textColor: "#f8fafc",
  position: "bottom-right",
  panelWidth: PANEL_SIZE.width.default,
  panelHeight: PANEL_SIZE.height.default,
  title: "Chat with us",
  welcomeMessage: "Hi! How can I help?",
};

function Section({
  title,
  hint,
  children,
}: {
  title: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <fieldset className="flex flex-col gap-4">
      <legend className="flex flex-col gap-0.5">
        <span className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
          {title}
        </span>
        {hint ? (
          <span className="text-xs text-muted-foreground/80">{hint}</span>
        ) : null}
      </legend>
      {children}
    </fieldset>
  );
}

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
          id={`${id}-hex`}
          aria-label={`${label} hex value`}
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

/** Slider plus a typed value, so a size can be dragged or entered exactly. */
function SizeField({
  id,
  label,
  value,
  min,
  max,
  disabled,
  onChange,
}: {
  id: string;
  label: string;
  value: number;
  min: number;
  max: number;
  disabled: boolean;
  onChange: (value: number) => void;
}) {
  return (
    <div className="flex flex-col gap-2">
      <label htmlFor={id} className="text-sm font-medium">
        {label}
      </label>
      <div className="flex items-center gap-3">
        <input
          id={id}
          type="range"
          min={min}
          max={max}
          step={10}
          value={value}
          disabled={disabled}
          onChange={(event) => onChange(Number(event.target.value))}
          className="h-1.5 min-w-0 flex-1 cursor-pointer appearance-none rounded-full bg-white/10 accent-indigo-500 disabled:opacity-50"
        />
        <Input
          id={`${id}-value`}
          aria-label={`${label} value`}
          type="number"
          min={min}
          max={max}
          step={10}
          value={value}
          disabled={disabled}
          onChange={(event) => {
            const next = Number(event.target.value);

            if (!Number.isNaN(next)) {
              onChange(next);
            }
          }}
          className="w-20 shrink-0 font-mono text-xs"
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
    <div className="flex flex-col gap-6">
      <Section title="Colours" hint="Accent drives the header and bubbles.">
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
      </Section>

      <Section
        title="Layout"
        hint="This sizes the chat panel. The launcher stays 56px, and both shrink on small screens."
      >
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

        <div className="grid gap-4 sm:grid-cols-2">
          <SizeField
            id="widget-width"
            label="Panel width (px)"
            value={theme.panelWidth}
            min={PANEL_SIZE.width.min}
            max={PANEL_SIZE.width.max}
            disabled={disabled}
            onChange={(panelWidth) => onChange({ ...theme, panelWidth })}
          />
          <SizeField
            id="widget-height"
            label="Panel height (px)"
            value={theme.panelHeight}
            min={PANEL_SIZE.height.min}
            max={PANEL_SIZE.height.max}
            disabled={disabled}
            onChange={(panelHeight) => onChange({ ...theme, panelHeight })}
          />
        </div>
      </Section>

      <Section title="Content">
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
      </Section>
    </div>
  );
}

/**
 * Scaled mock of the real panel. Proportions follow the configured size, so the
 * effect of the sliders is visible before saving.
 */
export function WidgetPreview({ theme }: { theme: WidgetThemeInput }) {
  const openLeft = theme.position === "bottom-left";
  const available = 128;
  const scale = Math.min(1, available / Math.max(theme.panelHeight, available));
  const width = Math.max(72, Math.round(theme.panelWidth * scale));
  const height = Math.max(56, Math.round(theme.panelHeight * scale));

  return (
    <div className="relative h-52 overflow-hidden rounded-xl border border-white/5 bg-[radial-gradient(circle_at_20%_20%,rgba(99,102,241,0.12),transparent_55%)]">
      <span className="absolute top-2 left-2 rounded bg-black/50 px-1.5 py-0.5 font-mono text-[10px] text-white/70">
        {theme.panelWidth} × {theme.panelHeight}
      </span>

      <div
        className="absolute bottom-3 flex flex-col gap-2"
        style={{
          [openLeft ? "left" : "right"]: "0.75rem",
          alignItems: openLeft ? "flex-start" : "flex-end",
        }}
      >
        <div
          className="flex flex-col overflow-hidden rounded-lg shadow-xl"
          style={{
            width,
            height,
            backgroundColor: theme.backgroundColor,
            color: theme.textColor,
          }}
        >
          <div
            className="truncate px-2 py-1 text-[10px] font-semibold"
            style={{ backgroundColor: theme.primaryColor, color: "#ffffff" }}
          >
            {theme.title}
          </div>
          <div className="flex flex-1 flex-col p-2">
            <span
              className="w-fit max-w-full rounded px-1.5 py-0.5 text-[9px] leading-snug"
              style={{ backgroundColor: theme.primaryColor, color: "#ffffff" }}
            >
              {theme.welcomeMessage}
            </span>
          </div>
        </div>

        <span
          className="size-8 rounded-full shadow-lg"
          style={{ backgroundColor: theme.primaryColor }}
        />
      </div>
    </div>
  );
}
