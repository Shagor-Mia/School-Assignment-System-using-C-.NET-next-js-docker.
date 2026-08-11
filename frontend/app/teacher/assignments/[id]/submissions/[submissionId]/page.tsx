"use client";

import * as React from "react";
import { useParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { gradeSubmission, getSubmission, updateSubmissionStatus } from "@/lib/api";
import { ApiClientError } from "@/lib/api-client";
import type { SubmissionDto, SubmissionStatusType } from "@/lib/types";
import { makeGradeSubmissionSchema, type GradeSubmissionFormValues } from "@/lib/schemas";
import { StatusBadge } from "@/components/status-badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Alert } from "@/components/ui/alert";
import { FieldError } from "@/components/ui/field-error";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageSpinner } from "@/components/ui/spinner";

const STATUS_OPTIONS: SubmissionStatusType[] = [
  "Submitted",
  "Late",
  "UnderReview",
  "Graded",
  "ReturnedForRevision",
];

function formatDate(value: string) {
  return new Date(value).toLocaleString();
}

export default function GradeSubmissionPage() {
  const params = useParams<{ id: string; submissionId: string }>();
  const { submissionId } = params;

  const [submission, setSubmission] = React.useState<SubmissionDto | null>(null);
  const [loadError, setLoadError] = React.useState<string | null>(null);
  const [gradeServerError, setGradeServerError] = React.useState<string | null>(null);
  const [gradeSuccess, setGradeSuccess] = React.useState(false);
  const [statusValue, setStatusValue] = React.useState<SubmissionStatusType>("Submitted");
  const [statusSaving, setStatusSaving] = React.useState(false);
  const [statusError, setStatusError] = React.useState<string | null>(null);
  const [statusSuccess, setStatusSuccess] = React.useState(false);

  const load = React.useCallback(async () => {
    setLoadError(null);
    try {
      const s = await getSubmission(submissionId);
      setSubmission(s);
      setStatusValue(s.status);
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : "Failed to load submission.");
    }
  }, [submissionId]);

  React.useEffect(() => {
    load();
  }, [load]);

  const gradeSchema = React.useMemo(
    () => makeGradeSubmissionSchema(submission?.maxMarks ?? 100),
    [submission?.maxMarks]
  );

  const {
    register,
    handleSubmit,
    reset,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<GradeSubmissionFormValues>({
    resolver: zodResolver(gradeSchema),
    defaultValues: { marks: 0, feedback: "" },
  });

  React.useEffect(() => {
    if (submission) {
      reset({ marks: submission.marks ?? 0, feedback: submission.feedback ?? "" });
    }
  }, [submission, reset]);

  async function onGradeSubmit(values: GradeSubmissionFormValues) {
    setGradeServerError(null);
    setGradeSuccess(false);
    try {
      const updated = await gradeSubmission(submissionId, {
        marks: values.marks,
        feedback: values.feedback || null,
      });
      setSubmission(updated);
      setStatusValue(updated.status);
      setGradeSuccess(true);
    } catch (err) {
      if (err instanceof ApiClientError && err.errors) {
        for (const [field, messages] of Object.entries(err.errors)) {
          setError(field as keyof GradeSubmissionFormValues, { message: messages[0] });
        }
      }
      setGradeServerError(err instanceof Error ? err.message : "Failed to save grade.");
    }
  }

  async function handleStatusSave() {
    setStatusSaving(true);
    setStatusError(null);
    setStatusSuccess(false);
    try {
      const updated = await updateSubmissionStatus(submissionId, { status: statusValue });
      setSubmission(updated);
      setStatusSuccess(true);
    } catch (err) {
      setStatusError(err instanceof Error ? err.message : "Failed to update status.");
    } finally {
      setStatusSaving(false);
    }
  }

  if (loadError) return <Alert variant="error">{loadError}</Alert>;
  if (!submission) return <PageSpinner />;

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <div className="flex items-center gap-2">
          <h1 className="text-2xl font-semibold text-slate-900">{submission.studentName}</h1>
          <StatusBadge status={submission.status} />
        </div>
        <p className="text-sm text-slate-500">
          {submission.assignmentTitle} &middot; submitted {formatDate(submission.submittedAt)}
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Submission</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div>
            <p className="mb-1 text-xs font-medium uppercase tracking-wide text-slate-500">
              Answer
            </p>
            <p className="whitespace-pre-wrap text-sm text-slate-800">
              {submission.answerText || <span className="text-slate-400">No answer text provided.</span>}
            </p>
          </div>
          {submission.fileUrl && (
            <div>
              <p className="mb-1 text-xs font-medium uppercase tracking-wide text-slate-500">
                Attached file
              </p>
              <a
                href={submission.fileUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-900 underline underline-offset-2"
              >
                {submission.fileName ?? "Download file"}
              </a>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Grade</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onGradeSubmit)} className="space-y-4" noValidate>
            {gradeServerError && <Alert variant="error">{gradeServerError}</Alert>}
            {gradeSuccess && <Alert variant="success">Grade saved.</Alert>}

            <div>
              <Label htmlFor="marks">Marks (out of {submission.maxMarks})</Label>
              <Input
                id="marks"
                type="number"
                step="0.5"
                min="0"
                max={submission.maxMarks}
                {...register("marks", { valueAsNumber: true })}
              />
              <FieldError message={errors.marks?.message} />
            </div>

            <div>
              <Label htmlFor="feedback">Feedback</Label>
              <Textarea id="feedback" rows={4} {...register("feedback")} />
              <FieldError message={errors.feedback?.message} />
            </div>

            <div className="flex justify-end">
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? "Saving..." : "Save Grade"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Status</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {statusError && <Alert variant="error">{statusError}</Alert>}
          {statusSuccess && <Alert variant="success">Status updated.</Alert>}
          <div className="flex flex-wrap items-end gap-3">
            <div>
              <Label htmlFor="status">Submission status</Label>
              <Select
                id="status"
                value={statusValue}
                onChange={(e) => setStatusValue(e.target.value as SubmissionStatusType)}
                className="w-56"
              >
                {STATUS_OPTIONS.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </Select>
            </div>
            <Button variant="outline" onClick={handleStatusSave} disabled={statusSaving}>
              {statusSaving ? "Saving..." : "Update Status"}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
