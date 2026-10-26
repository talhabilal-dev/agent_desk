import { z } from "zod";

export const profileSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, "Name must be at least 2 characters.")
    .max(64, "Name must be 64 characters or fewer."),
  /** Empty string clears the avatar. */
  image: z
    .string()
    .trim()
    .max(2048, "Image URL is too long.")
    .refine(
      (value) => value === "" || /^https?:\/\/\S+$/i.test(value),
      "Enter a valid http(s) image URL.",
    ),
});

export type ProfileInput = z.infer<typeof profileSchema>;
