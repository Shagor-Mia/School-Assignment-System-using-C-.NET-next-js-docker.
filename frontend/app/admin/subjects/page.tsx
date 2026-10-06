"use client";

import * as React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { BookOpen, Filter, Library, Pencil, Plus, School, Trash2 } from "lucide-react";
import { createSubject, deleteSubject, getClasses, getSubjects, updateSubject } from "@/lib/api";
import { ApiClientError } from "@/lib/api-client";
import type { ClassDto, PagedResult, SubjectDto } from "@/lib/types";
import {
  subjectCreateSchema,
  subjectUpdateSchema,
  type SubjectCreateFormValues,
  type SubjectUpdateFormValues,
} from "@/lib/schemas";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Modal } from "@/components/ui/modal";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { Alert } from "@/components/ui/alert";
import { FieldError } from "@/components/ui/field-error";
import { PageSpinner } from "@/components/ui/spinner";
import { PageHeader } from "@/components/page-header";
import { Pagination } from "@/components/pagination";
import { StatCard } from "@/components/stat-card";
import { Table, TableWrap, Thead, Tbody, Tr, Th, Td, EmptyState } from "@/components/ui/table";

const PAGE_SIZE = 10;

export default function AdminSubjectsPage() {
  const [data, setData] = React.useState<PagedResult<SubjectDto> | null>(null);
  const [totalAll, setTotalAll] = React.useState<number | null>(null);
  const [classes, setClasses] = React.useState<ClassDto[]>([]);
  const [classFilter, setClassFilter] = React.useState("");
  const [page, setPage] = React.useState(1);
  const [error, setError] = React.useState<string | null>(null);
  const [creating, setCreating] = React.useState(false);
  const [editing, setEditing] = React.useState<SubjectDto | null>(null);
  const [deleting, setDeleting] = React.useState<SubjectDto | null>(null);
  const [actionLoading, setActionLoading] = React.useState(false);

  const load = React.useCallback(async () => {
    setError(null);
    try {
      setData(
        await getSubjects({
          classId: classFilter || undefined,
          page,
          pageSize: PAGE_SIZE,
        })
      );
      getSubjects({ page: 1, pageSize: 1 }).then((r) => setTotalAll(r.totalCount)).catch(() => {});
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load subjects.");
    }
  }, [classFilter, page]);

  React.useEffect(() => {
    load();
  }, [load]);

  React.useEffect(() => {
    getClasses({ page: 1, pageSize: 500 }).then((r) => setClasses(r.items)).catch(() => {});
  }, []);

  const subjects = data?.items ?? null;
  const filteredClass = classes.find((c) => c.id === classFilter);

  async function handleDelete() {
    if (!deleting) return;
    setActionLoading(true);
    try {
      await deleteSubject(deleting.id);
      setDeleting(null);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete subject.");
      setDeleting(null);
    } finally {
      setActionLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Subjects"
        description="Curriculum subjects mapped across classes."
        actions={
          <Button onClick={() => setCreating(true)}>
            <Plus /> New Subject
          </Button>
        }
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard label="Total subjects" value={totalAll ?? "—"} icon={Library} accent="indigo" />
        <StatCard
          label={filteredClass ? filteredClass.name : "Showing"}
          value={data?.totalCount ?? "—"}
          icon={Filter}
          accent="blue"
          sub={filteredClass ? "Subjects in selected class" : "All classes"}
        />
        <StatCard label="Classes" value={classes.length} icon={School} accent="cyan" />
      </div>

      <div className="flex flex-wrap items-center gap-3 rounded-xl border border-slate-200 bg-white p-3 shadow-card">
        <Select
          aria-label="Filter by class"
          value={classFilter}
          onChange={(e) => {
            setPage(1);
            setClassFilter(e.target.value);
          }}
          className="w-full sm:w-64"
        >
          <option value="">All classes</option>
          {classes.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </Select>
        {classFilter && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setPage(1);
              setClassFilter("");
            }}
          >
            Reset
          </Button>
        )}
      </div>

      {error && <Alert variant="error">{error}</Alert>}

      {!subjects ? (
        <PageSpinner />
      ) : (
        <TableWrap>
          <Table>
            <Thead>
              <tr>
                <Th>Subject</Th>
                <Th>Code</Th>
                <Th>Class</Th>
                <Th className="text-right">Actions</Th>
              </tr>
            </Thead>
            <Tbody>
              {subjects.length === 0 && (
                <EmptyState colSpan={4} message="No subjects yet." icon={<BookOpen />} />
              )}
              {subjects.map((s) => (
                <Tr key={s.id}>
                  <Td>
                    <div className="flex items-center gap-3">
                      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-600">
                        <BookOpen className="h-4 w-4" />
                      </span>
                      <span className="font-medium text-slate-900">{s.name}</span>
                    </div>
                  </Td>
                  <Td>
                    <span className="rounded bg-slate-100 px-2 py-0.5 font-mono text-xs text-slate-700">
                      {s.code}
                    </span>
                  </Td>
                  <Td>{s.className}</Td>
                  <Td>
                    <div className="flex justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        aria-label={`Edit ${s.name}`}
                        onClick={() => setEditing(s)}
                      >
                        <Pencil />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        aria-label={`Delete ${s.name}`}
                        onClick={() => setDeleting(s)}
                      >
                        <Trash2 className="text-red-600" />
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
          noun="subjects"
          onPageChange={setPage}
        />
      )}

      <CreateSubjectModal
        open={creating}
        classes={classes}
        onClose={() => setCreating(false)}
        onCreated={() => {
          setCreating(false);
          load();
        }}
      />

      <EditSubjectModal
        subject={editing}
        onClose={() => setEditing(null)}
        onSaved={() => {
          setEditing(null);
          load();
        }}
      />

      <ConfirmDialog
        open={!!deleting}
        title="Delete subject"
        description={`Are you sure you want to delete "${deleting?.name}"? This cannot be undone.`}
        confirmLabel="Delete"
        loading={actionLoading}
        onConfirm={handleDelete}
        onCancel={() => setDeleting(null)}
      />
    </div>
  );
}

function CreateSubjectModal({
  open,
  classes,
  onClose,
  onCreated,
}: {
  open: boolean;
  classes: ClassDto[];
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
  } = useForm<SubjectCreateFormValues>({
    resolver: zodResolver(subjectCreateSchema),
    defaultValues: { name: "", code: "", classId: "" },
  });

  React.useEffect(() => {
    if (open) {
      reset({ name: "", code: "", classId: classes[0]?.id ?? "" });
      setServerError(null);
    }
  }, [open, classes, reset]);

  async function onSubmit(values: SubjectCreateFormValues) {
    setServerError(null);
    try {
      await createSubject(values);
      onCreated();
    } catch (err) {
      if (err instanceof ApiClientError && err.errors) {
        for (const [field, messages] of Object.entries(err.errors)) {
          setError(field as keyof SubjectCreateFormValues, { message: messages[0] });
        }
      }
      setServerError(err instanceof Error ? err.message : "Failed to create subject.");
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="New Subject"
      subtitle="Map a subject to a class"
      icon={<BookOpen />}
    >
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
        {serverError && <Alert variant="error">{serverError}</Alert>}
        <div>
          <Label htmlFor="subject-name">Name</Label>
          <Input id="subject-name" placeholder="e.g. Elementary Mathematics" {...register("name")} />
          <FieldError message={errors.name?.message} />
        </div>
        <div>
          <Label htmlFor="subject-code">Code</Label>
          <Input id="subject-code" placeholder="e.g. MAT-103" {...register("code")} />
          <FieldError message={errors.code?.message} />
        </div>
        <div>
          <Label htmlFor="subject-classId">Class</Label>
          <Select id="subject-classId" {...register("classId")}>
            {classes.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </Select>
          <FieldError message={errors.classId?.message} />
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

function EditSubjectModal({
  subject,
  onClose,
  onSaved,
}: {
  subject: SubjectDto | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [serverError, setServerError] = React.useState<string | null>(null);
  const {
    register,
    handleSubmit,
    reset,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<SubjectUpdateFormValues>({
    resolver: zodResolver(subjectUpdateSchema),
    defaultValues: { name: "", code: "" },
  });

  React.useEffect(() => {
    if (subject) {
      reset({ name: subject.name, code: subject.code });
      setServerError(null);
    }
  }, [subject, reset]);

  async function onSubmit(values: SubjectUpdateFormValues) {
    if (!subject) return;
    setServerError(null);
    try {
      await updateSubject(subject.id, values);
      onSaved();
    } catch (err) {
      if (err instanceof ApiClientError && err.errors) {
        for (const [field, messages] of Object.entries(err.errors)) {
          setError(field as keyof SubjectUpdateFormValues, { message: messages[0] });
        }
      }
      setServerError(err instanceof Error ? err.message : "Failed to update subject.");
    }
  }

  return (
    <Modal
      open={!!subject}
      onClose={onClose}
      title="Edit Subject"
      subtitle={subject?.className}
      icon={<Pencil />}
    >
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
        {serverError && <Alert variant="error">{serverError}</Alert>}
        <div>
          <Label htmlFor="edit-subject-name">Name</Label>
          <Input id="edit-subject-name" {...register("name")} />
          <FieldError message={errors.name?.message} />
        </div>
        <div>
          <Label htmlFor="edit-subject-code">Code</Label>
          <Input id="edit-subject-code" {...register("code")} />
          <FieldError message={errors.code?.message} />
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? "Saving..." : "Save"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
