"use client";

import * as React from "react";
import { useParams } from "next/navigation";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { getAssignment, getMySubmission, submitAssignment, updateSubmission } from "@/lib/api";
import { ApiClientError } from "@/lib/api-client";
import type { AssignmentDto, SubmissionDto } from "@/lib/types";
import { submissionSchema, type SubmissionFormValues } from "@/lib/schemas";
import { StatusBadge } from "@/components/status-badge";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Alert } from "@/components/ui/alert";
import { FieldError } from "@/components/ui/field-error";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageSpinner } from "@/components/ui/spinner";

function formatDate(value: string) {
  return new Date(value).toLocaleString();
}

function formatCountdown(deadline: string, now: number): { text: string; overdue: boolean } {
  const diffMs = new Date(deadline).getTime() - now;
  const overdue = diffMs <= 0;
  const abs = Math.abs(diffMs);
  const days = Math.floor(abs / (1000 * 60 * 60 * 24));
  const hours = Math.floor((abs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const minutes = Math.floor((abs % (1000 * 60 * 60)) / (1000 * 60));
  const parts: string[] = [];
  if (days > 0) parts.push(`${days}d`);
  if (hours > 0 || days > 0) parts.push(`${hours}h`);
  parts.push(`${minutes}m`);
  const duration = parts.join(" ");
  return {
    text: overdue ? `Overdue by ${duration}` : `${duration} remaining`,
    overdue,
  };
}

export default function StudentAssignmentDetailPage() {
  const params = useParams<{ id: string }>();
  const assignmentId = params.id;

  const [assignment, setAssignment] = React.useState<AssignmentDto | null>(null);
  const [submission, setSubmission] = React.useState<SubmissionDto | null>(null);
  const [loadError, setLoadError] = React.useState<string | null>(null);
  const [serverError, setServerError] = React.useState<string | null>(null);
  const [success, setSuccess] = React.useState(false);
  // Kept null until mount so the deadline countdown never differs between
  // the server-rendered pass and client hydration (see `formatCountdown`).
  const [now, setNow] = React.useState<number | null>(null);

  const load = React.useCallback(async () => {
    setLoadError(null);
    try {
      const [a, s] = await Promise.all([
        getAssignment(assignmentId),
        getMySubmission(assignmentId),
      ]);
      setAssignment(a);
      setSubmission(s);
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : "Failed to load assignment.");
    }
  }, [assignmentId]);

  React.useEffect(() => {
    load();
  }, [load]);

  // Keep the countdown/overdue indicator ticking (client-only).
  React.useEffect(() => {
    setNow(Date.now());
    const interval = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(interval);
  }, []);

  const {
    register,
    control,
    handleSubmit,
    reset,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<SubmissionFormValues>({
    resolver: zodResolver(submissionSchema),
    defaultValues: { answerText: "", file: null },
  });

  React.useEffect(() => {
    if (submission) {
      reset({ answerText: submission.answerText, file: null });
    }
  }, [submission, reset]);

  async function onSubmit(values: SubmissionFormValues) {
    setServerError(null);
    setSuccess(false);
    try {
      const formData = new FormData();
      formData.set("answerText", values.answerText);
      if (values.file) formData.set("file", values.file);

      const result = submission
        ? await updateSubmission(submission.id, formData)
        : await submitAssignment(assignmentId, formData);

      setSubmission(result);
      setSuccess(true);
    } catch (err) {
      if (err instanceof ApiClientError && err.errors) {
        for (const [field, messages] of Object.entries(err.errors)) {
          setError(field as keyof SubmissionFormValues, { message: messages[0] });
        }
      }
      setServerError(err instanceof Error ? err.message : "Failed to submit.");
    }
  }

  if (loadError) return <Alert variant="error">{loadError}</Alert>;
  if (!assignment || now === null) return <PageSpinner />;

  const countdown = formatCountdown(assignment.deadline, now);
  const isPastDeadline = new Date(assignment.deadline).getTime() <= now;
  const isReturnedForRevision = submission?.status === "ReturnedForRevision";
  const formDisabled = isPastDeadline && !assignment.allowLateSubmission && !isReturnedForRevision;

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <div className="flex flex-wrap items-center gap-2">
          <h1 className="text-2xl font-semibold text-slate-900">{assignment.title}</h1>
          {submission && <StatusBadge status={submission.status} />}
        </div>
        <p className="text-sm text-slate-500">
          {assignment.subjectName} &middot; {assignment.className}
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="whitespace-pre-wrap text-sm text-slate-800">{assignment.description}</p>
          <dl className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-3">
            <div>
              <dt className="text-xs uppercase tracking-wide text-slate-500">Deadline</dt>
              <dd className="text-slate-800">{formatDate(assignment.deadline)}</dd>
            </div>
            <div>
              <dt className="text-xs uppercase tracking-wide text-slate-500">Time left</dt>
              <dd className={countdown.overdue ? "font-medium text-red-600" : "text-slate-800"}>
                {countdown.text}
              </dd>
            </div>
            <div>
              <dt className="text-xs uppercase tracking-wide text-slate-500">Max marks</dt>
              <dd className="text-slate-800">{assignment.maxMarks}</dd>
            </div>
            <div>
              <dt className="text-xs uppercase tracking-wide text-slate-500">Late submissions</dt>
              <dd className="text-slate-800">{assignment.allowLateSubmission ? "Allowed" : "Not allowed"}</dd>
            </div>
          </dl>
        </CardContent>
      </Card>

      {submission?.status === "Graded" && (
        <Card>
          <CardHeader>
            <CardTitle>Grade</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <p className="text-lg font-semibold text-slate-900">
              {submission.marks} / {submission.maxMarks}
            </p>
            {submission.feedback && (
              <div>
                <p className="mb-1 text-xs font-medium uppercase tracking-wide text-slate-500">
                  Feedback
                </p>
                <p className="whitespace-pre-wrap text-sm text-slate-800">{submission.feedback}</p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>{submission ? "Your Submission" : "Submit"}</CardTitle>
        </CardHeader>
        <CardContent>
          {formDisabled && (
            <Alert variant="info" className="mb-4">
              The deadline has passed and late submissions are not allowed for this assignment.
              {submission ? "" : " You can no longer submit."}
            </Alert>
          )}
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
            {serverError && <Alert variant="error">{serverError}</Alert>}
            {success && <Alert variant="success">Submission saved.</Alert>}

            <div>
              <Label htmlFor="answerText">Answer</Label>
              <Textarea
                id="answerText"
                rows={6}
                disabled={formDisabled}
                {...register("answerText")}
              />
              <FieldError message={errors.answerText?.message} />
            </div>

            <div>
              <Label htmlFor="file">Attachment (optional, max 5MB)</Label>
              <Controller
                control={control}
                name="file"
                render={({ field: { onChange, name, ref } }) => (
                  <input
                    id="file"
                    name={name}
                    ref={ref}
                    type="file"
                    disabled={formDisabled}
                    className="block w-full text-sm text-slate-700 file:mr-3 file:rounded-md file:border-0 file:bg-slate-100 file:px-3 file:py-1.5 file:text-sm file:font-medium hover:file:bg-slate-200"
                    onChange={(e) => onChange(e.target.files?.[0] ?? null)}
                  />
                )}
              />
              {submission?.fileName && (
                <p className="mt-1 text-xs text-slate-500">
                  Current file:{" "}
                  {submission.fileUrl ? (
                    <a
                      href={submission.fileUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="underline underline-offset-2"
                    >
                      {submission.fileName}
                    </a>
                  ) : (
                    submission.fileName
                  )}
                </p>
              )}
              <FieldError message={errors.file?.message as string | undefined} />
            </div>

            {!formDisabled && (
              <div className="flex justify-end">
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting ? "Saving..." : submission ? "Update Submission" : "Submit"}
                </Button>
              </div>
            )}
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
