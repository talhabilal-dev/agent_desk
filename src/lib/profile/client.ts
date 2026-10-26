"use client";

import {
  changePassword as changePasswordRequest,
  updateUser,
} from "@/lib/auth-client";
import {
  type PasswordChangeInput,
  type ProfileInput,
  passwordChangeSchema,
  profileSchema,
} from "@/lib/validations/profile";

/**
 * Updates the signed-in user's profile.
 *
 * `/update-user` accepts an open record (`z.record(z.string(), z.any())`), so
 * only the validated, allowlisted fields are ever sent — forwarding raw form
 * values would let a caller write arbitrary user columns.
 *
 * The client SDK also broadcasts a session update, so `useSession` consumers
 * (sidebar, header badge) re-render without a reload.
 */
export async function updateProfile(input: ProfileInput) {
  const parsed = profileSchema.safeParse(input);

  if (!parsed.success) {
    throw new Error(parsed.error.issues[0]?.message ?? "Invalid input.");
  }

  const { error } = await updateUser({
    name: parsed.data.name,
    image: parsed.data.image === "" ? null : parsed.data.image,
  });

  if (error) {
    throw new Error(error.message ?? "Could not update your profile.");
  }
}

/**
 * Changes the password. `confirmPassword` is a form-only field and never leaves
 * the client; other sessions are revoked so a stolen session can't outlive a
 * password change.
 */
export async function changePassword(input: PasswordChangeInput) {
  const parsed = passwordChangeSchema.safeParse(input);

  if (!parsed.success) {
    throw new Error(parsed.error.issues[0]?.message ?? "Invalid input.");
  }

  const { error } = await changePasswordRequest({
    currentPassword: parsed.data.currentPassword,
    newPassword: parsed.data.newPassword,
    revokeOtherSessions: true,
  });

  if (error) {
    throw new Error(error.message ?? "Could not change your password.");
  }
}
