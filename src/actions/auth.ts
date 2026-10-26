"use server";

import { isAPIError } from "better-auth/api";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import type { ZodError } from "zod";

import { auth } from "@/lib/auth";
import { signInSchema, signUpSchema } from "@/lib/validations/auth";
import { getSafeRedirect } from "@/utils/url";

export type AuthFormState = { error: string } | null;

function firstError(error: ZodError) {
  return error.issues[0]?.message ?? "Please check the form and try again.";
}

export async function signInAction(
  _previousState: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  const parsed = signInSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });

  if (!parsed.success) {
    return { error: firstError(parsed.error) };
  }

  try {
    await auth.api.signInEmail({ body: parsed.data });
  } catch (error) {
    if (isAPIError(error)) {
      return { error: error.message || "Invalid email or password." };
    }
    throw error;
  }

  redirect(getSafeRedirect(formData.get("redirect")));
}

export async function signUpAction(
  _previousState: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  const parsed = signUpSchema.safeParse({
    name: formData.get("name"),
    email: formData.get("email"),
    password: formData.get("password"),
  });

  if (!parsed.success) {
    return { error: firstError(parsed.error) };
  }

  try {
    await auth.api.signUpEmail({ body: parsed.data });
  } catch (error) {
    if (isAPIError(error)) {
      return { error: error.message || "Unable to create your account." };
    }
    throw error;
  }

  redirect("/dashboard");
}

export async function signOutAction() {
  await auth.api.signOut({ headers: await headers() });
  redirect("/sign-in");
}
