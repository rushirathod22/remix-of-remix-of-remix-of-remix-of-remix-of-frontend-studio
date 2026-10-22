import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { CircleCheck, Loader2, Mail } from "lucide-react";
import { services } from "@/lib/services";
import { AuthShell } from "@/components/auth-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export const Route = createFileRoute("/forgot-password")({
  head: () => ({
    meta: [
      { title: "Reset password — APIShield" },
      { name: "description", content: "Request a password reset for your APIShield account." },
      { property: "og:title", content: "Reset password — APIShield" },
      { property: "og:description", content: "Request a password reset for your APIShield account." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: ForgotPasswordPage,
});

const schema = z.object({
  email: z.string().min(1, "Email is required").email("Enter a valid email address"),
});
type FormValues = z.infer<typeof schema>;

function ForgotPasswordPage() {
  const [sentTo, setSentTo] = useState<string | null>(null);
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { email: "" },
  });

  const onSubmit = async (values: FormValues) => {
    await services.auth.requestReset(values.email);
    setSentTo(values.email);
  };

  return (
    <AuthShell
      title="Reset password"
      description="We'll send a reset link to your email."
      footer={<span>Remembered it? <Link to="/login" className="font-medium text-primary underline-offset-4 hover:underline">Back to sign in</Link></span>}
    >
      {sentTo ? (
        <div className="flex flex-col items-center gap-3 py-4 text-center">
          <CircleCheck className="size-8 text-success" aria-hidden />
          <p className="text-sm font-medium">Reset link sent to {sentTo}</p>
          <p className="text-xs text-muted-foreground">
            Demonstration mode — no email is actually sent, and no reset link exists. Sign in with any credentials on the sign-in page.
          </p>
          <Button asChild variant="outline" size="sm">
            <Link to="/login">Back to sign in</Link>
          </Button>
        </div>
      ) : (
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
          <div className="space-y-1.5">
            <Label htmlFor="email">Email</Label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
              <Input id="email" type="email" autoComplete="email" placeholder="you@example.com" className="pl-9" aria-invalid={!!errors.email} {...register("email")} />
            </div>
            {errors.email && <p className="text-xs text-danger">{errors.email.message}</p>}
          </div>
          <Button type="submit" className="w-full" disabled={isSubmitting}>
            {isSubmitting && <Loader2 className="size-4 animate-spin" aria-hidden />}
            Send reset link
          </Button>
          <p className="text-center text-xs text-muted-foreground">In demonstration mode nothing is sent — this flow is wired for the future backend.</p>
        </form>
      )}
    </AuthShell>
  );
}
