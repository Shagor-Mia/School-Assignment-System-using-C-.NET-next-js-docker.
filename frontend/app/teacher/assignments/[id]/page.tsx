"use client";

import * as React from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  BarChart3,
  CheckCircle2,
  ClipboardCheck,
  Clock,
  Inbox,
  Save,
  Send,
  SlidersHorizontal,
  Users,
} from "lucide-react";
import {
  getAssignment,
  getAssignmentSubmissions,
  publishAssignment,
  updateAssignment,
} from "@/lib/api";
import { ApiClientError } from "@/lib/api-client";
import type { AssignmentDto, SubmissionDto } from "@/lib/types";
import { updateAssignmentSchema, type UpdateAssignmentFormValues } from "@/lib/schemas";
import { formatDateTime } from "@/lib/utils";
import { StatusBadge } from "@/components/status-badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Alert } from "@/components/ui/alert";
import { Avatar } from "@/components/ui/avatar";
import { Tabs } from "@/components/ui/tabs";
import { FieldError } from "@/components/ui/field-error";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageSpinner } from "@/components/ui/spinner";
import { Breadcrumbs } from "@/components/page-header";
import { StatCard } from "@/components/stat-card";
import { Table, TableWrap, Thead, Tbody, Tr, Th, Td, EmptyState } from "@/components/ui/table";

function toDatetimeLocal(iso: string) {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(
    d.getMinutes()
  )}`;
}

type SubFilter = "all" | "graded" | "pending" | "returned";

const FILTERS: Record<SubFilter, (s: SubmissionDto) => boolean> = {
  all: () => true,
  graded: (s) => s.status === "Graded",
  pending: (s) => s.status === "Submitted" || s.status === "UnderReview" || s.status === "Late",
  returned: (s) => s.status === "ReturnedForRevision",
};

export default function TeacherAssignmentDetailPage() {
  const params = useParams<{ id: string }>();
  const assignmentId = params.id;

  const [assignment, setAssignment] = React.useState<AssignmentDto | null>(null);
  const [submissions, setSubmissions] = React.useState<SubmissionDto[] | null>(null);
  const [loadError, setLoadError] = React.useState<string | null>(null);
  const [serverError, setServerError] = React.useState<string | null>(null);
  const [saved, setSaved] = React.useState(false);
  const [publishing, setPublishing] = React.useState(false);
  const [filter, setFilter] = React.useState<SubFilter>("all");

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
    setSaved(false);
    try {
      const updated = await updateAssignment(assignmentId, {
        ...values,
        deadline: new Date(values.deadline).toISOString(),
      });
      setAssignment(updated);
      setSaved(true);
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

  const stats = React.useMemo(() => {
    const subs = submissions ?? [];
    const graded = subs.filter((s) => s.status === "Graded");
    const marked = graded.filter((s) => s.marks !== null);
    return {
      total: subs.length,
      graded: graded.length,
      pending: subs.filter(FILTERS.pending).length,
      average: marked.length
        ? marked.reduce((sum, s) => sum + (s.marks ?? 0), 0) / marked.length
        : null,
    };
  }, [submissions]);

  if (loadError) return <Alert variant="error">{loadError}</Alert>;
  if (!assignment) return <PageSpinner />;

  const visibleSubs = (submissions ?? []).filter(FILTERS[filter]);

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div className="space-y-3">
        <Breadcrumbs
          items={[{ label: "My Assignments", href: "/teacher/assignments" }, { label: assignment.title }]}
        />
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0 space-y-1.5">
            <div className="flex flex-wrap items-center gap-2.5">
              <h1 className="text-2xl font-semibold tracking-tight text-slate-900">{assignment.title}</h1>
              <StatusBadge status={assignment.status} />
            </div>
            <p className="tnum flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-slate-500">
              <span>{assignment.subjectName}</span>
              <span className="text-slate-300">·</span>
              <span>{assignment.className}</span>
              <span className="text-slate-300">·</span>
              <span className="inline-flex items-center gap-1">
                <Clock className="h-3.5 w-3.5" /> Due {formatDateTime(assignment.deadline)}
              </span>
              <span className="text-slate-300">·</span>
              <span>Max marks: {assignment.maxMarks}</span>
            </p>
          </div>
          {assignment.status === "Draft" && (
            <Button onClick={handlePublish} disabled={publishing}>
              {publishing ? (
                "Publishing..."
              ) : (
                <>
                  <Send /> Publish
                </>
              )}
            </Button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Submissions" value={stats.total} icon={Users} accent="blue" />
        <StatCard
          label="Graded"
          value={stats.graded}
          icon={CheckCircle2}
          accent="emerald"
          progress={stats.total ? (stats.graded / stats.total) * 100 : 0}
        />
        <StatCard label="Pending evaluation" value={stats.pending} icon={ClipboardCheck} accent="amber" />
        <StatCard
          label="Average grade"
          value={stats.average === null ? "—" : stats.average.toFixed(1)}
          unit={stats.average === null ? undefined : `/ ${assignment.maxMarks}`}
          icon={BarChart3}
          accent="indigo"
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <SlidersHorizontal className="h-4 w-4 text-slate-500" /> Edit Assignment
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
            {serverError && <Alert variant="error">{serverError}</Alert>}
            {saved && (
              <Alert variant="success" onDismiss={() => setSaved(false)}>
                Changes saved.
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

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <div>
                <Label htmlFor="status">Status</Label>
                <Select id="status" {...register("status")}>
                  <option value="Draft">Draft</option>
                  <option value="Published">Published</option>
                </Select>
              </div>
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

            <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
              <label htmlFor="allowLateSubmission" className="flex cursor-pointer items-center gap-2.5">
                <input
                  id="allowLateSubmission"
                  type="checkbox"
                  className="h-4 w-4 cursor-pointer rounded accent-slate-900"
                  {...register("allowLateSubmission")}
                />
                <span className="text-sm text-slate-700">Allow late submissions (flagged as Late)</span>
              </label>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? (
                  "Saving..."
                ) : (
                  <>
                    <Save /> Save Changes
                  </>
                )}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card className="overflow-hidden">
        <CardHeader className="flex-wrap">
          <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
            <CardTitle>Submissions ({submissions?.length ?? 0})</CardTitle>
            <span className="tnum text-xs text-slate-500">
              {stats.graded} graded · {stats.pending} pending
            </span>
          </div>
          <Tabs
            value={filter}
            onChange={setFilter}
            tabs={[
              { key: "all", label: "All", count: stats.total },
              { key: "graded", label: "Graded", count: stats.graded },
              { key: "pending", label: "Pending", count: stats.pending },
              {
                key: "returned",
                label: "Returned",
                count: (submissions ?? []).filter(FILTERS.returned).length,
              },
            ]}
          />
        </CardHeader>
        {!submissions ? (
          <PageSpinner />
        ) : (
          <TableWrap className="rounded-none border-0 shadow-none">
            <Table>
              <Thead>
                <tr>
                  <Th>Student</Th>
                  <Th>Submitted</Th>
                  <Th>Status</Th>
                  <Th className="text-right">Marks</Th>
                  <Th className="text-right">Actions</Th>
                </tr>
              </Thead>
              <Tbody>
                {visibleSubs.length === 0 && (
                  <EmptyState
                    colSpan={5}
                    message={submissions.length === 0 ? "No submissions yet." : "No submissions in this view."}
                    hint={
                      submissions.length === 0
                        ? "Once students submit their work it will appear here for grading."
                        : undefined
                    }
                    icon={<Inbox />}
                  />
                )}
                {visibleSubs.map((s) => (
                  <Tr key={s.id}>
                    <Td>
                      <div className="flex items-center gap-3">
                        <Avatar name={s.studentName} />
                        <span className="font-medium text-slate-900">{s.studentName}</span>
                      </div>
                    </Td>
                    <Td className="tnum whitespace-nowrap text-slate-600">{formatDateTime(s.submittedAt)}</Td>
                    <Td>
                      <StatusBadge status={s.status} />
                    </Td>
                    <Td className="tnum text-right">
                      {s.marks !== null ? (
                        <span>
                          <span className="font-semibold text-slate-900">{s.marks}</span>
                          <span className="text-slate-500"> / {s.maxMarks}</span>
                        </span>
                      ) : (
                        <span className="text-slate-400">--</span>
                      )}
                    </Td>
                    <Td>
                      <div className="flex justify-end">
                        <Link
                          href={`/teacher/assignments/${assignmentId}/submissions/${s.id}`}
                          className="text-sm font-medium text-slate-900 underline underline-offset-2 hover:text-slate-600"
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
      </Card>
    </div>
  );
}
