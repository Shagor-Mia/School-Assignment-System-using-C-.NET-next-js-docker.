"use client";

import * as React from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowLeft, Award, Download, FileText, Paperclip, Quote, Send } from "lucide-react";
import { getAssignment, getMySubmission, submitAssignment, updateSubmission } from "@/lib/api";
import { ApiClientError } from "@/lib/api-client";
import type { AssignmentDto, SubmissionDto } from "@/lib/types";
import { submissionSchema, type SubmissionFormValues } from "@/lib/schemas";
import { formatDateTime, formatDuration } from "@/lib/utils";
import { StatusBadge } from "@/components/status-badge";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Alert } from "@/components/ui/alert";
import { FieldError } from "@/components/ui/field-error";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageSpinner } from "@/components/ui/spinner";
import { Breadcrumbs } from "@/components/page-header";

function formatCountdown(deadline: string, now: number): { text: string; overdue: boolean } {
  const diffMs = new Date(deadline).getTime() - now;
  const overdue = diffMs <= 0;
  const duration = formatDuration(diffMs);
  return {
    text: overdue ? `Overdue by ${duration}` : `${duration} remaining`,
    overdue,
  };
}

function Metric({ label, children, tone }: { label: string; children: React.ReactNode; tone?: string }) {
  return (
    <div className="space-y-0.5">
      <dt className="text-xs text-slate-500">{label}</dt>
      <dd className={`tnum text-sm font-semibold ${tone ?? "text-slate-900"}`}>{children}</dd>
    </div>
  );
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
  const graded = submission?.status === "Graded";
  const percent =
    graded && submission.marks !== null && submission.maxMarks > 0
      ? Math.round((submission.marks / submission.maxMarks) * 1000) / 10
      : null;

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div className="space-y-3">
        <Breadcrumbs items={[{ label: "My Assignments", href: "/student" }, { label: assignment.title }]} />
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0 space-y-1.5">
            <div className="flex flex-wrap items-center gap-2.5">
              <h1 className="text-2xl font-semibold tracking-tight text-slate-900">{assignment.title}</h1>
              {submission && <StatusBadge status={submission.status} />}
            </div>
            <p className="text-sm text-slate-500">
              {assignment.subjectName} &middot; {assignment.className} &middot; Teacher:{" "}
              {assignment.createdByTeacherName}
            </p>
          </div>
          <Link href="/student">
            <Button variant="secondary">
              <ArrowLeft /> Back to Dashboard
            </Button>
          </Link>
        </div>
      </div>

      {graded && submission.marks !== null && (
        <Alert variant="info">
          Submission saved and evaluated. You scored <strong className="tnum">{submission.marks}</strong> out
          of <strong className="tnum">{submission.maxMarks}</strong>.
        </Alert>
      )}

      <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-12">
        <div className="space-y-6 lg:col-span-7">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-4 w-4 text-slate-500" /> Details
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="whitespace-pre-wrap text-sm leading-relaxed text-slate-800">
                {assignment.description}
              </p>
              <dl className="grid grid-cols-1 gap-4 rounded-xl bg-slate-50 p-4 sm:grid-cols-2">
                <Metric label="Deadline">{formatDateTime(assignment.deadline)}</Metric>
                <Metric label="Time left" tone={countdown.overdue ? "text-rose-600" : undefined}>
                  {countdown.text}
                </Metric>
                <Metric label="Max marks">{assignment.maxMarks}</Metric>
                <Metric label="Late submissions">
                  {assignment.allowLateSubmission ? "Allowed" : "Not allowed"}
                </Metric>
              </dl>
            </CardContent>
          </Card>

          {graded && submission && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Award className="h-4 w-4 text-slate-500" /> Grade
                </CardTitle>
                {percent !== null && (
                  <span className="tnum rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-0.5 text-xs font-semibold text-emerald-700">
                    {percent}%
                  </span>
                )}
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="tnum flex items-baseline gap-2">
                  <span className="text-4xl font-semibold tracking-tight text-slate-900">{submission.marks}</span>
                  <span className="text-lg text-slate-500">/ {submission.maxMarks}</span>
                </p>
                {submission.feedback && (
                  <div className="rounded-xl bg-slate-50 p-4">
                    <p className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-slate-500">
                      <Quote className="h-3.5 w-3.5" /> Feedback
                    </p>
                    <p className="whitespace-pre-wrap text-sm italic leading-relaxed text-slate-800">
                      {submission.feedback}
                    </p>
                    {submission.gradedByTeacherName && (
                      <p className="mt-2 text-right text-xs text-slate-500">
                        <span className="font-semibold text-slate-700">{submission.gradedByTeacherName}</span>
                        {submission.gradedAt && <> &middot; {formatDateTime(submission.gradedAt)}</>}
                      </p>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>

        <div className="lg:col-span-5">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Send className="h-4 w-4 text-slate-500" />
                {submission ? "Your Submission" : "Submit"}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {formDisabled && (
                <Alert variant="info" className="mb-4">
                  The deadline has passed and late submissions are not allowed for this assignment.
                  {submission ? "" : " You can no longer submit."}
                </Alert>
              )}
              {isReturnedForRevision && (
                <Alert variant="info" title="Returned for revision" className="mb-4">
                  Your teacher asked for changes. Update your answer and resubmit.
                </Alert>
              )}
              <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
                {serverError && <Alert variant="error">{serverError}</Alert>}
                {success && (
                  <Alert variant="success" onDismiss={() => setSuccess(false)}>
                    Submission saved.
                  </Alert>
                )}

                <div>
                  <Label htmlFor="answerText">Answer</Label>
                  <Textarea
                    id="answerText"
                    rows={8}
                    disabled={formDisabled}
                    placeholder="Write your answer here…"
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
                        className="block w-full rounded-lg bg-slate-100 p-1.5 text-sm text-slate-700 file:mr-3 file:cursor-pointer file:rounded-md file:border-0 file:bg-white file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-slate-900 file:shadow-sm hover:file:bg-slate-50"
                        onChange={(e) => onChange(e.target.files?.[0] ?? null)}
                      />
                    )}
                  />
                  {submission?.fileName && (
                    <p className="mt-2 flex items-center gap-1.5 text-xs text-slate-500">
                      <Paperclip className="h-3.5 w-3.5" />
                      Current file:{" "}
                      {submission.fileUrl ? (
                        <a
                          href={submission.fileUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 font-medium text-slate-900 underline underline-offset-2"
                        >
                          {submission.fileName} <Download className="h-3 w-3" />
                        </a>
                      ) : (
                        submission.fileName
                      )}
                    </p>
                  )}
                  <FieldError message={errors.file?.message as string | undefined} />
                </div>

                {!formDisabled && (
                  <Button type="submit" size="lg" className="w-full" disabled={isSubmitting}>
                    {isSubmitting ? "Saving..." : submission ? "Update Submission" : "Submit"}
                  </Button>
                )}
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
