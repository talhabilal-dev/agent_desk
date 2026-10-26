"use client";

import { stripeClient } from "@better-auth/stripe/client";
import { createAuthClient } from "better-auth/react";

const authClient = createAuthClient({
  plugins: [stripeClient({ subscription: true })],
});

export const { subscription, updateUser, useSession } = authClient;
