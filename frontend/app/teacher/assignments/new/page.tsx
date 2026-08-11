"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { createAssignment, getMyTeacherAssignments } from "@/lib/api";
import { ApiClientError } from "@/lib/api-client";
import type { TeacherAssignmentDto } from "@/lib/types";
import { createAssignmentSchema, type CreateAssignmentFormValues } from "@/lib/schemas";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Alert } from "@/components/ui/alert";
import { FieldError } from "@/components/ui/field-error";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageSpinner } from "@/components/ui/spinner";

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
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">New Assignment</h1>
        <p className="text-sm text-slate-500">Create a new assignment for one of your subjects</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Details</CardTitle>
        </CardHeader>
        <CardContent>
          <form className="space-y-4" noValidate>
            {serverError && <Alert variant="error">{serverError}</Alert>}

            {mySubjects.length === 0 && (
              <Alert variant="info">
                You are not assigned to any subjects yet. Contact an administrator before creating
                an assignment.
              </Alert>
            )}

            <div>
              <Label htmlFor="title">Title</Label>
              <Input id="title" {...register("title")} />
              <FieldError message={errors.title?.message} />
            </div>

            <div>
              <Label htmlFor="description">Description</Label>
              <Textarea id="description" rows={5} {...register("description")} />
              <FieldError message={errors.description?.message} />
            </div>

            <div>
              <Label htmlFor="subjectId">Subject</Label>
              <Select id="subjectId" {...register("subjectId")}>
                <option value="">Select a subject</option>
                {mySubjects.map((s) => (
                  <option key={s.subjectId} value={s.subjectId}>
                    {s.subjectName} ({s.className})
                  </option>
                ))}
              </Select>
              <FieldError message={errors.subjectId?.message} />
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <Label htmlFor="deadline">Deadline</Label>
                <Input id="deadline" type="datetime-local" {...register("deadline")} />
                <FieldError message={errors.deadline?.message} />
              </div>
              <div>
                <Label htmlFor="maxMarks">Max marks</Label>
                <Input
                  id="maxMarks"
                  type="number"
                  step="1"
                  min="1"
                  {...register("maxMarks", { valueAsNumber: true })}
                />
                <FieldError message={errors.maxMarks?.message} />
              </div>
            </div>

            <div className="flex items-center gap-2">
              <input
                id="allowLateSubmission"
                type="checkbox"
                className="h-4 w-4"
                {...register("allowLateSubmission")}
              />
              <Label htmlFor="allowLateSubmission" className="mb-0">
                Allow late submissions
              </Label>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button
                type="button"
                variant="outline"
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
                {isSubmitting ? "Saving..." : "Publish"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
