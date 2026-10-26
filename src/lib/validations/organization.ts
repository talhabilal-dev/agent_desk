import { z } from "zod";

export const organizationSlugPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export const organizationIdSchema = z.uuid("Invalid organization id.");

export const organizationDetailsSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, "Name must be at least 2 characters.")
    .max(64, "Name must be 64 characters or fewer."),
  slug: z
    .string()
    .trim()
    .min(2, "Slug must be at least 2 characters.")
    .max(64, "Slug must be 64 characters or fewer.")
    .regex(
      organizationSlugPattern,
      "Use lowercase letters, numbers and single dashes.",
    ),
});

export type OrganizationDetails = z.infer<typeof organizationDetailsSchema>;
