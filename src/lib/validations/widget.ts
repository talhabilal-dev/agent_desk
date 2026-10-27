import { z } from "zod";

const hexColor = z
  .string()
  .trim()
  .regex(/^#[0-9a-fA-F]{6}$/, "Use a 6-digit hex colour like #4f46e5.");

export const widgetPositions = ["bottom-right", "bottom-left"] as const;

/** Panel size, in px. The loader clamps both to the viewport. */
export const PANEL_SIZE = {
  width: { min: 280, max: 560, default: 340 },
  height: { min: 320, max: 720, default: 460 },
} as const;

/** Theme fields shared by create and update. */
export const widgetThemeSchema = z.object({
  primaryColor: hexColor,
  backgroundColor: hexColor,
  textColor: hexColor,
  position: z.enum(widgetPositions),
  panelWidth: z
    .number()
    .int()
    .min(
      PANEL_SIZE.width.min,
      `Width must be at least ${PANEL_SIZE.width.min}px.`,
    )
    .max(
      PANEL_SIZE.width.max,
      `Width must be ${PANEL_SIZE.width.max}px or less.`,
    ),
  panelHeight: z
    .number()
    .int()
    .min(
      PANEL_SIZE.height.min,
      `Height must be at least ${PANEL_SIZE.height.min}px.`,
    )
    .max(
      PANEL_SIZE.height.max,
      `Height must be ${PANEL_SIZE.height.max}px or less.`,
    ),
  title: z
    .string()
    .trim()
    .min(1, "Title is required.")
    .max(60, "Title must be 60 characters or fewer."),
  welcomeMessage: z
    .string()
    .trim()
    .min(1, "Welcome message is required.")
    .max(200, "Welcome message must be 200 characters or fewer."),
});

const originList = z
  .array(z.string().trim().min(1, "Origin cannot be empty.").max(253))
  .max(20, "Up to 20 origins.");

export const createWidgetSchema = widgetThemeSchema.extend({
  organizationId: z.uuid("Choose an organization."),
  allowedOrigins: originList.default([]),
  name: z
    .string()
    .trim()
    .min(2, "Name must be at least 2 characters.")
    .max(60, "Name must be 60 characters or fewer."),
});

export const updateWidgetSchema = widgetThemeSchema.partial().extend({
  allowedOrigins: originList.optional(),
  name: z
    .string()
    .trim()
    .min(2, "Name must be at least 2 characters.")
    .max(60, "Name must be 60 characters or fewer.")
    .optional(),
  active: z.boolean().optional(),
});

export type WidgetThemeInput = z.infer<typeof widgetThemeSchema>;
export type CreateWidgetInput = z.infer<typeof createWidgetSchema>;
export type UpdateWidgetInput = z.infer<typeof updateWidgetSchema>;

/** Public chat payload. Stateless: the embed replays the turns it wants kept. */
export const widgetChatSchema = z.object({
  message: z
    .string()
    .trim()
    .min(1, "Message is required.")
    .max(2000, "Message must be 2000 characters or fewer."),
  history: z
    .array(
      z.object({
        role: z.enum(["user", "assistant"]),
        content: z.string().trim().min(1).max(2000),
      }),
    )
    .max(20, "History is limited to 20 turns.")
    .default([]),
});

export type WidgetChatInput = z.infer<typeof widgetChatSchema>;
