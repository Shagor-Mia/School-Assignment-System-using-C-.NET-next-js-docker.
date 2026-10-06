"use client";

import * as React from "react";
import { useParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Clock, Download, FileText, Info, ListChecks, Paperclip, RefreshCw, Save } from "lucide-react";
import { gradeSubmission, getSubmission, updateSubmissionStatus } from "@/lib/api";
import { ApiClientError } from "@/lib/api-client";
import type { SubmissionDto, SubmissionStatusType } from "@/lib/types";
import { makeGradeSubmissionSchema, type GradeSubmissionFormValues } from "@/lib/schemas";
import { formatDateTime } from "@/lib/utils";
import { StatusBadge, StatusPill } from "@/components/status-badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Alert } from "@/components/ui/alert";
import { FieldError } from "@/components/ui/field-error";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageSpinner } from "@/components/ui/spinner";
import { Breadcrumbs } from "@/components/page-header";

const STATUS_OPTIONS: SubmissionStatusType[] = [
  "Submitted",
  "Late",
  "UnderReview",
  "Graded",
  "ReturnedForRevision",
];

const STATUS_LABELS: Record<SubmissionStatusType, string> = {
  Submitted: "Submitted",
  Late: "Late",
  UnderReview: "Under Review",
  Graded: "Graded",
  ReturnedForRevision: "Returned for Revision",
};

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
    setValue,
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

  const max = submission.maxMarks;
  const wordCount = submission.answerText.trim() ? submission.answerText.trim().split(/\s+/).length : 0;
  const presets = [
    { label: "Full", value: max },
    { label: "90%", value: Math.round(max * 0.9 * 2) / 2 },
    { label: "75%", value: Math.round(max * 0.75 * 2) / 2 },
    { label: "60%", value: Math.round(max * 0.6 * 2) / 2 },
  ];

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div className="space-y-3">
        <Breadcrumbs
          items={[
            { label: "My Assignments", href: "/teacher/assignments" },
            { label: submission.assignmentTitle, href: `/teacher/assignments/${submission.assignmentId}` },
            { label: submission.studentName },
          ]}
        />
        <div className="space-y-1.5">
          <div className="flex flex-wrap items-center gap-2.5">
            <h1 className="text-2xl font-semibold tracking-tight text-slate-900">{submission.studentName}</h1>
            <StatusBadge status={submission.status} />
          </div>
          <p className="tnum text-sm text-slate-500">
            {submission.assignmentTitle} &middot; submitted {formatDateTime(submission.submittedAt)}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-12">
        <div className="space-y-6 lg:col-span-7">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-4 w-4 text-slate-500" /> Submission
              </CardTitle>
              <StatusPill tone="neutral">{wordCount} words</StatusPill>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-slate-50 p-4">
                <div className="flex items-center gap-3">
                  <Clock className="h-4 w-4 text-slate-500" />
                  <div>
                    <p className="text-xs text-slate-500">Submitted</p>
                    <p className="tnum text-sm font-semibold text-slate-900">
                      {formatDateTime(submission.submittedAt)}
                    </p>
                  </div>
                </div>
                {submission.fileUrl && (
                  <a
                    href={submission.fileUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-900 shadow-sm hover:bg-slate-50"
                  >
                    <Paperclip className="h-4 w-4 text-slate-500" />
                    <span className="max-w-[200px] truncate">{submission.fileName ?? "Download file"}</span>
                    <Download className="h-4 w-4 text-slate-500" />
                  </a>
                )}
              </div>

              <div>
                <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-500">Answer</p>
                <div className="whitespace-pre-wrap rounded-xl border-l-4 border-slate-300 bg-slate-50 p-4 text-sm leading-relaxed text-slate-800">
                  {submission.answerText || (
                    <span className="text-slate-400">No answer text provided.</span>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6 lg:col-span-5">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ListChecks className="h-4 w-4 text-slate-500" /> Grade &amp; Feedback
              </CardTitle>
              <span className="tnum text-xs text-slate-500">Max: {max} pts</span>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit(onGradeSubmit)} className="space-y-4" noValidate>
                {gradeServerError && <Alert variant="error">{gradeServerError}</Alert>}
                {gradeSuccess && (
                  <Alert variant="success" onDismiss={() => setGradeSuccess(false)}>
                    Grade saved.
                  </Alert>
                )}

                <div>
                  <Label htmlFor="marks">Marks (out of {max})</Label>
                  <div className="relative">
                    <Input
                      id="marks"
                      type="number"
                      step="0.5"
                      min="0"
                      max={max}
                      aria-invalid={errors.marks ? true : undefined}
                      className="pr-14 text-lg font-semibold"
                      {...register("marks", { valueAsNumber: true })}
                    />
                    <span className="tnum pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-sm text-slate-500">
                      / {max}
                    </span>
                  </div>
                  <p className="mt-1.5 flex items-start gap-1.5 text-xs text-slate-500">
                    <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                    Valid range 0 to {max}. Marks above {max} or negative values are rejected.
                  </p>
                  <FieldError message={errors.marks?.message} />
                </div>

                <div>
                  <p className="mb-1.5 text-xs font-semibold uppercase tracking-wider text-slate-500">
                    Quick presets
                  </p>
                  <div className="grid grid-cols-4 gap-2">
                    {presets.map((p) => (
                      <Button
                        key={p.label}
                        type="button"
                        variant="secondary"
                        size="sm"
                        className="tnum px-1"
                        onClick={() => setValue("marks", p.value, { shouldValidate: true, shouldDirty: true })}
                        title={`${p.value} / ${max}`}
                      >
                        {p.label}
                      </Button>
                    ))}
                  </div>
                </div>

                <div>
                  <Label htmlFor="feedback">Feedback</Label>
                  <Textarea id="feedback" rows={5} {...register("feedback")} />
                  <FieldError message={errors.feedback?.message} />
                </div>

                <Button type="submit" size="lg" className="w-full" disabled={isSubmitting}>
                  {isSubmitting ? (
                    "Saving..."
                  ) : (
                    <>
                      <Save /> Save Grade
                    </>
                  )}
                </Button>
              </form>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <RefreshCw className="h-4 w-4 text-slate-500" /> Status
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {statusError && <Alert variant="error">{statusError}</Alert>}
              {statusSuccess && (
                <Alert variant="success" onDismiss={() => setStatusSuccess(false)}>
                  Status updated.
                </Alert>
              )}
              <div>
                <Label htmlFor="status">Submission status</Label>
                <Select
                  id="status"
                  value={statusValue}
                  onChange={(e) => setStatusValue(e.target.value as SubmissionStatusType)}
                >
                  {STATUS_OPTIONS.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </Select>
                <p className="mt-1.5 text-xs text-slate-500">
                  Currently <strong>{STATUS_LABELS[submission.status]}</strong>. &ldquo;Returned for Revision&rdquo;
                  lets the student resubmit.
                </p>
              </div>
              <Button variant="secondary" className="w-full" onClick={handleStatusSave} disabled={statusSaving}>
                {statusSaving ? "Saving..." : "Update Status"}
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
