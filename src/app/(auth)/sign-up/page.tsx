import { SignUpForm } from "@/components/sign-up-form";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export const metadata = {
  title: "Create account",
};

export default function SignUpPage() {
  return (
    <Card className="border border-white/10 bg-white/[0.04] shadow-2xl shadow-black/50 ring-0 backdrop-blur-xl">
      <CardHeader>
        <CardTitle className="text-lg">Create your account</CardTitle>
        <CardDescription>
          Start orchestrating your agents in a few seconds.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <SignUpForm />
      </CardContent>
    </Card>
  );
}
