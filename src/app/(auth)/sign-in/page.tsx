import { Suspense } from "react";

import { SignInForm } from "@/components/sign-in-form";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export const metadata = {
  title: "Sign in",
};

export default function SignInPage() {
  return (
    <Card className="border border-white/10 bg-white/[0.04] shadow-2xl shadow-black/50 ring-0 backdrop-blur-xl">
      <CardHeader>
        <CardTitle className="text-lg">Welcome back</CardTitle>
        <CardDescription>
          Sign in to continue to your agents dashboard.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Suspense
          fallback={
            <div className="flex flex-col gap-4">
              <Skeleton className="h-16 w-full" />
              <Skeleton className="h-16 w-full" />
              <Skeleton className="h-8 w-full" />
            </div>
          }
        >
          <SignInForm />
        </Suspense>
      </CardContent>
    </Card>
  );
}
