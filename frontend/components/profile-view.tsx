"use client";

import * as React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { ApiClientError } from "@/lib/api-client";
import { changePassword, getMe } from "@/lib/api";
import { changePasswordSchema, type ChangePasswordFormValues } from "@/lib/schemas";
import type { UserDto } from "@/lib/types";
import { formatDate } from "@/lib/utils";
import { Alert } from "@/components/ui/alert";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FieldError } from "@/components/ui/field-error";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PageSpinner } from "@/components/ui/spinner";
import { PageHeader } from "@/components/page-header";

function Detail({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <dt className="text-xs font-semibold uppercase tracking-wider text-slate-500">{label}</dt>
      <dd className="mt-1 text-sm text-slate-900">{value}</dd>
    </div>
  );
}

/** Shared "My Profile" page for all roles: account details + change-password form. */
export function ProfileView() {
  const [profile, setProfile] = React.useState<UserDto | null>(null);
  const [loadError, setLoadError] = React.useState<string | null>(null);

  React.useEffect(() => {
    getMe()
      .then(setProfile)
      .catch((err) => setLoadError(err instanceof Error ? err.message : "Failed to load profile."));
  }, []);

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <PageHeader title="My Profile" description="Your account details and password." />

      {loadError && <Alert variant="error">{loadError}</Alert>}
      {!profile && !loadError && <PageSpinner />}

      {profile && (
        <Card>
          <CardHeader>
            <CardTitle>Account details</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-4">
              <Avatar name={profile.fullName} tone="dark" size="lg" />
              <div className="min-w-0">
                <p className="truncate text-base font-semibold text-slate-900">{profile.fullName}</p>
                <p className="truncate text-sm text-slate-500">{profile.email}</p>
              </div>
            </div>
            <dl className="mt-5 grid gap-4 sm:grid-cols-2">
              <Detail label="Role" value={profile.role} />
              <Detail label="Status" value={profile.isActive ? "Active" : "Inactive"} />
              {profile.role === "Student" && <Detail label="Class" value={profile.className ?? "—"} />}
              <Detail label="Member since" value={formatDate(profile.createdAt)} />
            </dl>
          </CardContent>
        </Card>
      )}

      <ChangePasswordCard />
    </div>
  );
}

function ChangePasswordCard() {
  const [serverError, setServerError] = React.useState<string | null>(null);
  const [success, setSuccess] = React.useState(false);
  const [submitting, setSubmitting] = React.useState(false);

  const {
    register,
    handleSubmit,
    reset,
    setError,
    formState: { errors },
  } = useForm<ChangePasswordFormValues>({
    resolver: zodResolver(changePasswordSchema),
    defaultValues: { currentPassword: "", newPassword: "", confirmPassword: "" },
  });

  async function onSubmit(values: ChangePasswordFormValues) {
    setServerError(null);
    setSuccess(false);
    setSubmitting(true);
    try {
      await changePassword({
        currentPassword: values.currentPassword,
        newPassword: values.newPassword,
      });
      reset();
      setSuccess(true);
    } catch (err) {
      if (err instanceof ApiClientError && err.errors?.currentPassword?.[0]) {
        setError("currentPassword", { message: err.errors.currentPassword[0] });
      } else {
        setServerError(err instanceof Error ? err.message : "Failed to change password.");
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Change password</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
          {serverError && (
            <Alert variant="error" onDismiss={() => setServerError(null)}>
              {serverError}
            </Alert>
          )}
          {success && (
            <Alert variant="success" onDismiss={() => setSuccess(false)}>
              Password updated successfully.
            </Alert>
          )}

          <div>
            <Label htmlFor="currentPassword">Current password</Label>
            <Input
              id="currentPassword"
              type="password"
              autoComplete="current-password"
              aria-invalid={errors.currentPassword ? true : undefined}
              {...register("currentPassword")}
            />
            <FieldError message={errors.currentPassword?.message} />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label htmlFor="newPassword">New password</Label>
              <Input
                id="newPassword"
                type="password"
                autoComplete="new-password"
                aria-invalid={errors.newPassword ? true : undefined}
                {...register("newPassword")}
              />
              <FieldError message={errors.newPassword?.message} />
            </div>
            <div>
              <Label htmlFor="confirmPassword">Confirm new password</Label>
              <Input
                id="confirmPassword"
                type="password"
                autoComplete="new-password"
                aria-invalid={errors.confirmPassword ? true : undefined}
                {...register("confirmPassword")}
              />
              <FieldError message={errors.confirmPassword?.message} />
            </div>
          </div>

          <div className="flex justify-end">
            <Button type="submit" disabled={submitting}>
              {submitting ? "Updating..." : "Update password"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
