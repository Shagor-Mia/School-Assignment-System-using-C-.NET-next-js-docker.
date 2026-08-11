"use client";

import * as React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Plus, Trash2 } from "lucide-react";
import {
  createTeacherAssignment,
  deleteTeacherAssignment,
  getSubjects,
  getTeacherAssignments,
  getUsers,
} from "@/lib/api";
import { ApiClientError } from "@/lib/api-client";
import type { PagedResult, SubjectDto, TeacherAssignmentDto, UserDto } from "@/lib/types";
import { teacherAssignmentSchema, type TeacherAssignmentFormValues } from "@/lib/schemas";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Modal } from "@/components/ui/modal";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { Alert } from "@/components/ui/alert";
import { FieldError } from "@/components/ui/field-error";
import { PageSpinner } from "@/components/ui/spinner";
import { Table, TableWrap, Thead, Tbody, Tr, Th, Td, EmptyState } from "@/components/ui/table";

const PAGE_SIZE = 10;

export default function AdminTeacherAssignmentsPage() {
  const [data, setData] = React.useState<PagedResult<TeacherAssignmentDto> | null>(null);
  const [teachers, setTeachers] = React.useState<UserDto[]>([]);
  const [subjects, setSubjects] = React.useState<SubjectDto[]>([]);
  const [page, setPage] = React.useState(1);
  const [error, setError] = React.useState<string | null>(null);
  const [creating, setCreating] = React.useState(false);
  const [deleting, setDeleting] = React.useState<TeacherAssignmentDto | null>(null);
  const [actionLoading, setActionLoading] = React.useState(false);

  const load = React.useCallback(async () => {
    setError(null);
    try {
      setData(await getTeacherAssignments({ page, pageSize: PAGE_SIZE }));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load teacher assignments.");
    }
  }, [page]);

  React.useEffect(() => {
    load();
  }, [load]);

  React.useEffect(() => {
    getUsers({ role: "Teacher", page: 1, pageSize: 500 })
      .then((r) => setTeachers(r.items))
      .catch(() => {});
    getSubjects({ page: 1, pageSize: 500 })
      .then((r) => setSubjects(r.items))
      .catch(() => {});
  }, []);

  const rows = data?.items ?? null;
  const totalPages = data ? Math.max(1, Math.ceil(data.totalCount / data.pageSize)) : 1;

  async function handleDelete() {
    if (!deleting) return;
    setActionLoading(true);
    try {
      await deleteTeacherAssignment(deleting.id);
      setDeleting(null);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to remove assignment.");
      setDeleting(null);
    } finally {
      setActionLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Teacher Assignments</h1>
          <p className="text-sm text-slate-500">Assign teachers to subjects</p>
        </div>
        <Button onClick={() => setCreating(true)} className="gap-2">
          <Plus className="h-4 w-4" /> New Assignment
        </Button>
      </div>

      {error && <Alert variant="error">{error}</Alert>}

      {!rows ? (
        <PageSpinner />
      ) : (
        <TableWrap>
          <Table>
            <Thead>
              <tr>
                <Th>Teacher</Th>
                <Th>Subject</Th>
                <Th>Class</Th>
                <Th className="text-right">Actions</Th>
              </tr>
            </Thead>
            <Tbody>
              {rows.length === 0 && <EmptyState colSpan={4} message="No teacher assignments yet." />}
              {rows.map((r) => (
                <Tr key={r.id}>
                  <Td className="font-medium text-slate-900">{r.teacherName}</Td>
                  <Td>{r.subjectName}</Td>
                  <Td>{r.className}</Td>
                  <Td>
                    <div className="flex justify-end">
                      <Button variant="ghost" size="sm" onClick={() => setDeleting(r)}>
                        <Trash2 className="h-4 w-4 text-red-600" />
                      </Button>
                    </div>
                  </Td>
                </Tr>
              ))}
            </Tbody>
          </Table>
        </TableWrap>
      )}

      {data && (
        <div className="flex items-center justify-between text-sm text-slate-600">
          <span>
            Page {data.page} of {totalPages} &middot; {data.totalCount} total
          </span>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
            >
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={page >= totalPages}
              onClick={() => setPage((p) => p + 1)}
            >
              Next
            </Button>
          </div>
        </div>
      )}

      <CreateAssignmentModal
        open={creating}
        teachers={teachers}
        subjects={subjects}
        onClose={() => setCreating(false)}
        onCreated={() => {
          setCreating(false);
          load();
        }}
      />

      <ConfirmDialog
        open={!!deleting}
        title="Remove assignment"
        description={`Remove ${deleting?.teacherName} from ${deleting?.subjectName}?`}
        confirmLabel="Remove"
        loading={actionLoading}
        onConfirm={handleDelete}
        onCancel={() => setDeleting(null)}
      />
    </div>
  );
}

function CreateAssignmentModal({
  open,
  teachers,
  subjects,
  onClose,
  onCreated,
}: {
  open: boolean;
  teachers: UserDto[];
  subjects: SubjectDto[];
  onClose: () => void;
  onCreated: () => void;
}) {
  const [serverError, setServerError] = React.useState<string | null>(null);
  const {
    register,
    handleSubmit,
    reset,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<TeacherAssignmentFormValues>({
    resolver: zodResolver(teacherAssignmentSchema),
    defaultValues: { teacherId: "", subjectId: "" },
  });

  React.useEffect(() => {
    if (open) {
      reset({ teacherId: teachers[0]?.id ?? "", subjectId: subjects[0]?.id ?? "" });
      setServerError(null);
    }
  }, [open, teachers, subjects, reset]);

  async function onSubmit(values: TeacherAssignmentFormValues) {
    setServerError(null);
    try {
      await createTeacherAssignment(values);
      onCreated();
    } catch (err) {
      if (err instanceof ApiClientError && err.errors) {
        for (const [field, messages] of Object.entries(err.errors)) {
          setError(field as keyof TeacherAssignmentFormValues, { message: messages[0] });
        }
      }
      setServerError(err instanceof Error ? err.message : "Failed to create assignment.");
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="New Teacher Assignment">
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
        {serverError && <Alert variant="error">{serverError}</Alert>}
        <div>
          <Label htmlFor="ta-teacherId">Teacher</Label>
          <Select id="ta-teacherId" {...register("teacherId")}>
            {teachers.length === 0 && <option value="">No teachers available</option>}
            {teachers.map((t) => (
              <option key={t.id} value={t.id}>
                {t.fullName}
              </option>
            ))}
          </Select>
          <FieldError message={errors.teacherId?.message} />
        </div>
        <div>
          <Label htmlFor="ta-subjectId">Subject</Label>
          <Select id="ta-subjectId" {...register("subjectId")}>
            {subjects.length === 0 && <option value="">No subjects available</option>}
            {subjects.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name} ({s.className})
              </option>
            ))}
          </Select>
          <FieldError message={errors.subjectId?.message} />
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? "Creating..." : "Create"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
