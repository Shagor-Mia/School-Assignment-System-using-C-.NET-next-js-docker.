"use client";

import * as React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { BookOpen, GraduationCap, Plus, UserCheck, UserMinus } from "lucide-react";
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
import { Avatar } from "@/components/ui/avatar";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { Alert } from "@/components/ui/alert";
import { FieldError } from "@/components/ui/field-error";
import { PageSpinner } from "@/components/ui/spinner";
import { PageHeader } from "@/components/page-header";
import { Pagination } from "@/components/pagination";
import { StatCard } from "@/components/stat-card";
import { StatusPill } from "@/components/status-badge";
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
      <PageHeader
        title="Teacher Assignments"
        description="Assign qualified teachers to the subjects they teach."
        actions={
          <Button onClick={() => setCreating(true)}>
            <Plus /> New Assignment
          </Button>
        }
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard label="Teaching assignments" value={data?.totalCount ?? "—"} icon={UserCheck} accent="blue" />
        <StatCard label="Teachers" value={teachers.length} icon={GraduationCap} accent="amber" />
        <StatCard label="Subjects" value={subjects.length} icon={BookOpen} accent="indigo" />
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
              {rows.length === 0 && (
                <EmptyState colSpan={4} message="No teacher assignments yet." icon={<UserCheck />} />
              )}
              {rows.map((r) => (
                <Tr key={r.id}>
                  <Td>
                    <div className="flex items-center gap-3">
                      <Avatar name={r.teacherName} />
                      <span className="font-medium text-slate-900">{r.teacherName}</span>
                    </div>
                  </Td>
                  <Td>{r.subjectName}</Td>
                  <Td>
                    <StatusPill tone="neutral">{r.className}</StatusPill>
                  </Td>
                  <Td>
                    <div className="flex justify-end">
                      <Button
                        variant="ghost"
                        size="sm"
                        aria-label={`Remove ${r.teacherName} from ${r.subjectName}`}
                        onClick={() => setDeleting(r)}
                        className="text-red-600 hover:bg-red-50 hover:text-red-700"
                      >
                        <UserMinus /> Remove
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
        <Pagination
          page={page}
          pageSize={data.pageSize}
          totalCount={data.totalCount}
          noun="teacher assignments"
          onPageChange={setPage}
        />
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
        description={`Remove ${deleting?.teacherName} from ${deleting?.subjectName} (${deleting?.className})?`}
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
    <Modal
      open={open}
      onClose={onClose}
      title="New Teacher Assignment"
      subtitle="Link a teacher to a subject"
      icon={<UserCheck />}
    >
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
        {serverError && (
          <Alert variant="error" title="Could not assign teacher">
            {serverError}
          </Alert>
        )}
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
          <Button type="button" variant="secondary" onClick={onClose}>
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
