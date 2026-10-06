"use client";

import * as React from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  ArrowRight,
  AtSign,
  Eye,
  EyeOff,
  GraduationCap,
  Lock,
  ShieldCheck,
  User,
} from "lucide-react";
import { loginSchema, type LoginFormValues } from "@/lib/schemas";
import { fieldBase, IconInput } from "@/components/ui/input";
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
  { role: "Admin", icon: ShieldCheck, email: "admin@synoslms.local", password: "Admin@12345" },
  { role: "Teacher", icon: GraduationCap, email: "teacher001@bulk.local", password: "Teacher@12345" },
  { role: "Student", icon: User, email: "student0729@bulk.local", password: "Student@12345" },
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
  const [showPassword, setShowPassword] = React.useState(false);

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
    <div className="flex flex-1 items-center justify-center bg-slate-50 px-4 py-12">
      <div className="w-full max-w-[420px] rounded-xl border border-slate-200 bg-white p-6 shadow-popover sm:p-8">
        <div className="mb-6 flex flex-col items-center gap-2 text-center">
          <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-slate-900 text-white">
            <GraduationCap className="h-6 w-6" />
          </span>
          <h1 className="text-xl font-semibold tracking-tight text-slate-900">
            Assignment &amp; Submission System
          </h1>
          <p className="text-sm text-slate-500">Sign in to continue to school portal</p>
        </div>

        <div className="mb-5 rounded-xl bg-slate-50 p-3">
          <p className="mb-2 text-center text-[11px] font-semibold uppercase tracking-wider text-slate-500">
            Quick fill demo account
          </p>
          <div className="grid grid-cols-3 gap-2">
            {DEMO_ACCOUNTS.map((account) => (
              <Button
                key={account.role}
                type="button"
                variant="outline"
                size="sm"
                onClick={() => fillDemoAccount(account)}
                className="gap-1.5 px-2"
              >
                <account.icon />
                {account.role}
              </Button>
            ))}
          </div>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
          {serverError && (
            <Alert variant="error" onDismiss={() => setServerError(null)}>
              {serverError}
            </Alert>
          )}

          <div>
            <Label htmlFor="email">Email address</Label>
            <IconInput
              id="email"
              type="email"
              autoComplete="email"
              placeholder="you@school.edu"
              icon={<AtSign />}
              aria-invalid={errors.email ? true : undefined}
              {...register("email")}
            />
            <FieldError message={errors.email?.message} />
          </div>

          <div>
            <Label htmlFor="password">Password</Label>
            <div className="relative">
              <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                id="password"
                type={showPassword ? "text" : "password"}
                autoComplete="current-password"
                placeholder="********"
                aria-invalid={errors.password ? true : undefined}
                className={`${fieldBase} h-10 pl-9 pr-10`}
                {...register("password")}
              />
              <button
                type="button"
                onClick={() => setShowPassword((s) => !s)}
                aria-label={showPassword ? "Hide password" : "Show password"}
                className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-slate-500 hover:text-slate-900"
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            <FieldError message={errors.password?.message} />
          </div>

          <Button type="submit" size="lg" className="w-full" disabled={submitting}>
            {submitting ? (
              "Signing in..."
            ) : (
              <>
                Sign in to Dashboard <ArrowRight />
              </>
            )}
          </Button>
        </form>
      </div>
    </div>
  );
}
