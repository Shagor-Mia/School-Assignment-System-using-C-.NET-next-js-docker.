"use client";

import * as React from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  getAssignment,
  getAssignmentSubmissions,
  publishAssignment,
  updateAssignment,
} from "@/lib/api";
import { ApiClientError } from "@/lib/api-client";
import type { AssignmentDto, SubmissionDto } from "@/lib/types";
import { updateAssignmentSchema, type UpdateAssignmentFormValues } from "@/lib/schemas";
import { StatusBadge } from "@/components/status-badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Alert } from "@/components/ui/alert";
import { FieldError } from "@/components/ui/field-error";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageSpinner } from "@/components/ui/spinner";
import { Table, TableWrap, Thead, Tbody, Tr, Th, Td, EmptyState } from "@/components/ui/table";

function toDatetimeLocal(iso: string) {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(
    d.getMinutes()
  )}`;
}

export default function TeacherAssignmentDetailPage() {
  const params = useParams<{ id: string }>();
  const assignmentId = params.id;

  const [assignment, setAssignment] = React.useState<AssignmentDto | null>(null);
  const [submissions, setSubmissions] = React.useState<SubmissionDto[] | null>(null);
  const [loadError, setLoadError] = React.useState<string | null>(null);
  const [serverError, setServerError] = React.useState<string | null>(null);
  const [publishing, setPublishing] = React.useState(false);

  const {
    register,
    handleSubmit,
    reset,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<UpdateAssignmentFormValues>({
    resolver: zodResolver(updateAssignmentSchema),
    defaultValues: {
      title: "",
      description: "",
      deadline: "",
      maxMarks: 100,
      allowLateSubmission: false,
      status: "Draft",
    },
  });

  const load = React.useCallback(async () => {
    setLoadError(null);
    try {
      const a = await getAssignment(assignmentId);
      setAssignment(a);
      reset({
        title: a.title,
        description: a.description,
        deadline: toDatetimeLocal(a.deadline),
        maxMarks: a.maxMarks,
        allowLateSubmission: a.allowLateSubmission,
        status: a.status,
      });
      const subs = await getAssignmentSubmissions(assignmentId);
      setSubmissions(subs);
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : "Failed to load assignment.");
    }
  }, [assignmentId, reset]);

  React.useEffect(() => {
    load();
  }, [load]);

  async function onSubmit(values: UpdateAssignmentFormValues) {
    setServerError(null);
    try {
      const updated = await updateAssignment(assignmentId, {
        ...values,
        deadline: new Date(values.deadline).toISOString(),
      });
      setAssignment(updated);
    } catch (err) {
      if (err instanceof ApiClientError && err.errors) {
        for (const [field, messages] of Object.entries(err.errors)) {
          setError(field as keyof UpdateAssignmentFormValues, { message: messages[0] });
        }
      }
      setServerError(err instanceof Error ? err.message : "Failed to update assignment.");
    }
  }

  async function handlePublish() {
    setPublishing(true);
    setServerError(null);
    try {
      const updated = await publishAssignment(assignmentId);
      setAssignment(updated);
      reset((prev) => ({ ...prev, status: "Published" }));
    } catch (err) {
      setServerError(err instanceof Error ? err.message : "Failed to publish assignment.");
    } finally {
      setPublishing(false);
    }
  }

  if (loadError) return <Alert variant="error">{loadError}</Alert>;
  if (!assignment) return <PageSpinner />;

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-semibold text-slate-900">{assignment.title}</h1>
            <StatusBadge status={assignment.status} />
          </div>
          <p className="text-sm text-slate-500">
            {assignment.subjectName} &middot; {assignment.className}
          </p>
        </div>
        {assignment.status === "Draft" && (
          <Button onClick={handlePublish} disabled={publishing}>
            {publishing ? "Publishing..." : "Publish"}
          </Button>
        )}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Edit Assignment</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
            {serverError && <Alert variant="error">{serverError}</Alert>}

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

            <div>
              <Label htmlFor="status">Status</Label>
              <select
                id="status"
                {...register("status")}
                className="flex h-9 w-full rounded-md border border-slate-300 bg-white px-3 py-1 text-sm shadow-sm"
              >
                <option value="Draft">Draft</option>
                <option value="Published">Published</option>
              </select>
            </div>

            <div className="flex justify-end pt-2">
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? "Saving..." : "Save Changes"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Submissions ({submissions?.length ?? 0})</CardTitle>
        </CardHeader>
        <CardContent>
          {!submissions ? (
            <PageSpinner />
          ) : (
            <TableWrap>
              <Table>
                <Thead>
                  <tr>
                    <Th>Student</Th>
                    <Th>Status</Th>
                    <Th>Marks</Th>
                    <Th className="text-right">Actions</Th>
                  </tr>
                </Thead>
                <Tbody>
                  {submissions.length === 0 && (
                    <EmptyState colSpan={4} message="No submissions yet." />
                  )}
                  {submissions.map((s) => (
                    <Tr key={s.id}>
                      <Td className="font-medium text-slate-900">{s.studentName}</Td>
                      <Td>
                        <StatusBadge status={s.status} />
                      </Td>
                      <Td>{s.marks !== null ? `${s.marks} / ${s.maxMarks}` : "--"}</Td>
                      <Td>
                        <div className="flex justify-end">
                          <Link
                            href={`/teacher/assignments/${assignmentId}/submissions/${s.id}`}
                            className="text-sm font-medium text-slate-900 underline underline-offset-2"
                          >
                            Grade
                          </Link>
                        </div>
                      </Td>
                    </Tr>
                  ))}
                </Tbody>
              </Table>
            </TableWrap>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
