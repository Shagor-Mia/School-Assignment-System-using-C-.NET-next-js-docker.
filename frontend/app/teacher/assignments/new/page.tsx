"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowLeft, Lock, Send } from "lucide-react";
import { createAssignment, getMyTeacherAssignments } from "@/lib/api";
import { ApiClientError } from "@/lib/api-client";
import type { TeacherAssignmentDto } from "@/lib/types";
import { createAssignmentSchema, type CreateAssignmentFormValues } from "@/lib/schemas";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FieldHint, Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Alert } from "@/components/ui/alert";
import { FieldError } from "@/components/ui/field-error";
import { Card } from "@/components/ui/card";
import { PageSpinner } from "@/components/ui/spinner";
import { PageHeader } from "@/components/page-header";

export default function NewAssignmentPage() {
  const router = useRouter();
  const [mySubjects, setMySubjects] = React.useState<TeacherAssignmentDto[] | null>(null);
  const [serverError, setServerError] = React.useState<string | null>(null);

  React.useEffect(() => {
    getMyTeacherAssignments()
      .then(setMySubjects)
      .catch((err) => setServerError(err instanceof Error ? err.message : "Failed to load subjects."));
  }, []);

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<CreateAssignmentFormValues>({
    resolver: zodResolver(createAssignmentSchema),
    defaultValues: {
      title: "",
      description: "",
      subjectId: "",
      deadline: "",
      maxMarks: 100,
      allowLateSubmission: false,
      status: "Draft",
    },
  });

  async function onSubmit(values: CreateAssignmentFormValues, status: "Draft" | "Published") {
    setServerError(null);
    try {
      const created = await createAssignment({
        ...values,
        status,
        deadline: new Date(values.deadline).toISOString(),
      });
      router.push(`/teacher/assignments/${created.id}`);
    } catch (err) {
      if (err instanceof ApiClientError && err.errors) {
        for (const [field, messages] of Object.entries(err.errors)) {
          setError(field as keyof CreateAssignmentFormValues, { message: messages[0] });
        }
      }
      setServerError(err instanceof Error ? err.message : "Failed to create assignment.");
    }
  }

  if (!mySubjects) return <PageSpinner />;

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="space-y-3">
        <Link
          href="/teacher/assignments"
          className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-900"
        >
          <ArrowLeft className="h-4 w-4" /> Back to My Assignments
        </Link>
        <PageHeader
          title="New Assignment"
          description="Compose the details, set a deadline and configure marks for one of your classes."
        />
      </div>

      <Card className="space-y-5 p-6">
        <Alert variant="info">
          Assignments are visible to enrolled students as soon as they are <strong>Published</strong>. You can
          also save as Draft to refine later.
        </Alert>

        <form className="space-y-5" noValidate>
          {serverError && <Alert variant="error">{serverError}</Alert>}

          {mySubjects.length === 0 && (
            <Alert variant="info" title="No subjects assigned">
              You are not assigned to any subjects yet. Contact an administrator before creating an
              assignment.
            </Alert>
          )}

          <div>
            <Label htmlFor="title">Title</Label>
            <Input id="title" placeholder="e.g. Quarterly English Essay" {...register("title")} />
            <FieldError message={errors.title?.message} />
          </div>

          <div>
            <Label htmlFor="subjectId">Subject &amp; Class</Label>
            <Select id="subjectId" {...register("subjectId")}>
              <option value="">Select a subject</option>
              {mySubjects.map((s) => (
                <option key={s.subjectId} value={s.subjectId}>
                  {s.subjectName} ({s.className})
                </option>
              ))}
            </Select>
            <FieldHint className="flex items-center gap-1">
              <Lock className="h-3 w-3" /> Showing only the subjects you are allocated to.
            </FieldHint>
            <FieldError message={errors.subjectId?.message} />
          </div>

          <div>
            <Label htmlFor="description">Description &amp; guidelines</Label>
            <Textarea
              id="description"
              rows={5}
              placeholder="What should students do? Include word limits, chapters, rubric notes…"
              {...register("description")}
            />
            <FieldError message={errors.description?.message} />
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <Label htmlFor="deadline">Submission deadline</Label>
              <Input id="deadline" type="datetime-local" {...register("deadline")} />
              <FieldError message={errors.deadline?.message} />
            </div>
            <div>
              <Label htmlFor="maxMarks">Max marks</Label>
              <div className="relative">
                <Input
                  id="maxMarks"
                  type="number"
                  step="1"
                  min="1"
                  className="pr-12"
                  {...register("maxMarks", { valueAsNumber: true })}
                />
                <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-slate-500">
                  PTS
                </span>
              </div>
              <FieldError message={errors.maxMarks?.message} />
            </div>
          </div>

          <label
            htmlFor="allowLateSubmission"
            className="flex cursor-pointer items-start gap-3 rounded-xl bg-slate-50 p-4"
          >
            <input
              id="allowLateSubmission"
              type="checkbox"
              className="mt-0.5 h-4 w-4 cursor-pointer rounded accent-slate-900"
              {...register("allowLateSubmission")}
            />
            <span>
              <span className="block text-sm font-semibold text-slate-900">Allow late submissions</span>
              <span className="block text-xs text-slate-500">
                Submissions after the deadline are accepted and flagged as Late.
              </span>
            </span>
          </label>

          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-5">
            <Link href="/teacher/assignments">
              <Button variant="ghost" type="button">
                Cancel
              </Button>
            </Link>
            <div className="flex flex-wrap items-center gap-2">
              <Button
                type="button"
                variant="secondary"
                disabled={isSubmitting}
                onClick={handleSubmit((values) => onSubmit(values, "Draft"))}
              >
                Save as Draft
              </Button>
              <Button
                type="button"
                disabled={isSubmitting}
                onClick={handleSubmit((values) => onSubmit(values, "Published"))}
              >
                {isSubmitting ? (
                  "Saving..."
                ) : (
                  <>
                    <Send /> Publish Assignment
                  </>
                )}
              </Button>
            </div>
          </div>
        </form>
      </Card>
    </div>
  );
}
