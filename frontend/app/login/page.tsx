"use client";

import * as React from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { GraduationCap } from "lucide-react";
import { loginSchema, type LoginFormValues } from "@/lib/schemas";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Alert } from "@/components/ui/alert";
import { FieldError } from "@/components/ui/field-error";
import { useAuth } from "@/components/auth-provider";
import { roleHomePath } from "@/lib/auth";
import type { AuthUser } from "@/lib/types";

/** Only ever follow same-origin, relative paths — an unvalidated `next`
 * query param would otherwise be an open-redirect vector. */
function safeNextPath(next: string | null): string | null {
  if (!next || !next.startsWith("/") || next.startsWith("//")) return null;
  return next;
}

// Teacher/Student point at bulk-seeded accounts with the most assignments/submissions
// (see backend/Database/seed-large.sql) so the demo actually has data to look at.
const DEMO_ACCOUNTS = [
  { role: "Admin", email: "admin@synoslms.local", password: "Admin@12345" },
  { role: "Teacher", email: "teacher001@bulk.local", password: "Teacher@12345" },
  { role: "Student", email: "student0729@bulk.local", password: "Student@12345" },
] as const;

export default function LoginPage() {
  return (
    <React.Suspense>
      <LoginForm />
    </React.Suspense>
  );
}

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { refresh } = useAuth();
  const [serverError, setServerError] = React.useState<string | null>(null);
  const [submitting, setSubmitting] = React.useState(false);

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "" },
  });

  function fillDemoAccount(account: (typeof DEMO_ACCOUNTS)[number]) {
    setValue("email", account.email, { shouldValidate: true });
    setValue("password", account.password, { shouldValidate: true });
  }

  async function onSubmit(values: LoginFormValues) {
    setServerError(null);
    setSubmitting(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });
      const data = await res.json();
      if (!res.ok) {
        setServerError(data?.message ?? "Login failed. Please check your credentials.");
        return;
      }
      const user = data.user as AuthUser;
      await refresh();
      router.push(safeNextPath(searchParams.get("next")) ?? roleHomePath(user.role));
      router.refresh();
    } catch {
      setServerError("Unable to reach the server. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="flex flex-1 items-center justify-center px-4 py-16">
      <div className="w-full max-w-sm">
        <div className="mb-6 flex flex-col items-center gap-2 text-center">
          <GraduationCap className="h-10 w-10 text-slate-900" />
          <h1 className="text-xl font-semibold text-slate-900">
            Assignment &amp; Submission System
          </h1>
          <p className="text-sm text-slate-500">Sign in to continue</p>
        </div>

        <div className="mb-4">
          <p className="mb-2 text-center text-xs font-medium text-slate-500">
            Quick fill a demo account
          </p>
          <div className="flex justify-center gap-2">
            {DEMO_ACCOUNTS.map((account) => (
              <Button
                key={account.role}
                type="button"
                variant="outline"
                size="sm"
                onClick={() => fillDemoAccount(account)}
              >
                {account.role}
              </Button>
            ))}
          </div>
        </div>

        <form
          onSubmit={handleSubmit(onSubmit)}
          className="space-y-4 rounded-lg border border-slate-200 bg-white p-6 shadow-sm"
          noValidate
        >
          {serverError && <Alert variant="error">{serverError}</Alert>}

          <div>
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              autoComplete="email"
              placeholder="you@school.edu"
              {...register("email")}
            />
            <FieldError message={errors.email?.message} />
          </div>

          <div>
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              type="password"
              autoComplete="current-password"
              placeholder="********"
              {...register("password")}
            />
            <FieldError message={errors.password?.message} />
          </div>

          <Button type="submit" className="w-full" disabled={submitting}>
            {submitting ? "Signing in..." : "Sign in"}
          </Button>
        </form>
      </div>
    </div>
  );
}
