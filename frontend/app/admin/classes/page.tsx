"use client";

import * as React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { BookOpen, Pencil, Plus, School, Trash2, Users, Layers } from "lucide-react";
import { createClass, deleteClass, getClasses, updateClass } from "@/lib/api";
import { ApiClientError } from "@/lib/api-client";
import type { ClassDto } from "@/lib/types";
import { classSchema, type ClassFormValues } from "@/lib/schemas";
import { classCode } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { IconInput, Input } from "@/components/ui/input";
import { FieldHint, Label } from "@/components/ui/label";
import { Modal } from "@/components/ui/modal";
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

export default function AdminClassesPage() {
  const [all, setAll] = React.useState<ClassDto[] | null>(null);
  const [filter, setFilter] = React.useState("");
  const [page, setPage] = React.useState(1);
  const [error, setError] = React.useState<string | null>(null);
  const [showRule, setShowRule] = React.useState(true);
  const [creating, setCreating] = React.useState(false);
  const [editing, setEditing] = React.useState<ClassDto | null>(null);
  const [deleting, setDeleting] = React.useState<ClassDto | null>(null);
  const [actionLoading, setActionLoading] = React.useState(false);

  const load = React.useCallback(async () => {
    setError(null);
    try {
      // The whole class list is small (hundreds at most), so load it once and
      // filter/paginate locally — that also gives the summary cards real totals.
      const items = (await getClasses({ page: 1, pageSize: 500 })).items;
      // "Class 2 - A" before "Class 10 - A" (natural order, not text order).
      setAll([...items].sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true })));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load classes.");
    }
  }, []);

  React.useEffect(() => {
    load();
  }, [load]);

  const filtered = React.useMemo(() => {
    const q = filter.trim().toLowerCase();
    return (all ?? []).filter((c) => !q || c.name.toLowerCase().includes(q));
  }, [all, filter]);

  const pageRows = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const totalStudents = (all ?? []).reduce((s, c) => s + c.studentCount, 0);
  const totalSubjects = (all ?? []).reduce((s, c) => s + c.subjectCount, 0);
  const classCount = all?.length ?? 0;

  async function handleDelete() {
    if (!deleting) return;
    setActionLoading(true);
    try {
      await deleteClass(deleting.id);
      setDeleting(null);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete class.");
      setDeleting(null);
    } finally {
      setActionLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Classes"
        description="Manage school classes, their rosters and subject allocations."
        actions={
          <Button onClick={() => setCreating(true)}>
            <Plus /> New Class
          </Button>
        }
      />

      {showRule && (
        <Alert variant="info" title="System safeguard" onDismiss={() => setShowRule(false)}>
          A class that still has enrolled students or subjects cannot be deleted. Reassign or remove them first.
        </Alert>
      )}

      {error && <Alert variant="error">{error}</Alert>}

      {!all ? (
        <PageSpinner />
      ) : (
        <>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard label="Classes" value={classCount} icon={School} accent="blue" sub="Registered sections" />
            <StatCard label="Students enrolled" value={totalStudents} icon={Users} accent="emerald" />
            <StatCard
              label="Avg. class size"
              value={classCount ? (totalStudents / classCount).toFixed(1) : "0"}
              unit="students"
              icon={Layers}
              accent="amber"
            />
            <StatCard label="Subjects mapped" value={totalSubjects} icon={BookOpen} accent="indigo" />
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-3 shadow-card">
            <IconInput
              placeholder="Filter classes..."
              value={filter}
              onChange={(e) => {
                setPage(1);
                setFilter(e.target.value);
              }}
              wrapperClassName="w-full sm:w-80"
            />
          </div>

          <TableWrap>
            <Table>
              <Thead>
                <tr>
                  <Th>Class</Th>
                  <Th>Students</Th>
                  <Th>Subjects</Th>
                  <Th className="text-right">Actions</Th>
                </tr>
              </Thead>
              <Tbody>
                {pageRows.length === 0 && (
                  <EmptyState
                    colSpan={4}
                    message={filter ? "No classes match your filter." : "No classes yet."}
                    icon={<School />}
                  />
                )}
                {pageRows.map((c) => (
                  <Tr key={c.id}>
                    <Td>
                      <div className="flex items-center gap-3">
                        <span className="tnum flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-xs font-semibold text-slate-700">
                          {classCode(c.name)}
                        </span>
                        <span className="font-medium text-slate-900">{c.name}</span>
                      </div>
                    </Td>
                    <Td>
                      <span className="tnum inline-flex items-center gap-1.5 font-medium text-slate-900">
                        <Users className="h-4 w-4 text-slate-400" />
                        {c.studentCount}
                      </span>
                    </Td>
                    <Td>
                      <StatusPill tone="neutral" className="tnum">
                        {c.subjectCount} {c.subjectCount === 1 ? "Subject" : "Subjects"}
                      </StatusPill>
                    </Td>
                    <Td>
                      <div className="flex justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          aria-label={`Edit ${c.name}`}
                          onClick={() => setEditing(c)}
                        >
                          <Pencil />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          aria-label={`Delete ${c.name}`}
                          onClick={() => setDeleting(c)}
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

          <Pagination
            page={page}
            pageSize={PAGE_SIZE}
            totalCount={filtered.length}
            noun="classes"
            onPageChange={setPage}
          />
        </>
      )}

      <ClassFormModal
        open={creating}
        title="New Class"
        subtitle="Create a new class section"
        initial={null}
        onClose={() => setCreating(false)}
        onSubmit={async (values) => {
          await createClass(values);
          setCreating(false);
          load();
        }}
      />

      <ClassFormModal
        open={!!editing}
        title="Edit Class"
        subtitle="Rename this class section"
        initial={editing}
        onClose={() => setEditing(null)}
        onSubmit={async (values) => {
          if (!editing) return;
          await updateClass(editing.id, values);
          setEditing(null);
          load();
        }}
      />

      <ConfirmDialog
        open={!!deleting}
        title="Delete class"
        description={`Are you sure you want to delete "${deleting?.name}"? This cannot be undone.`}
        note={
          deleting
            ? `Connected enrolments: ${deleting.studentCount} students · ${deleting.subjectCount} subjects. A class with either cannot be deleted.`
            : undefined
        }
        confirmLabel="Delete"
        loading={actionLoading}
        onConfirm={handleDelete}
        onCancel={() => setDeleting(null)}
      />
    </div>
  );
}

function ClassFormModal({
  open,
  title,
  subtitle,
  initial,
  onClose,
  onSubmit,
}: {
  open: boolean;
  title: string;
  subtitle: string;
  initial: ClassDto | null;
  onClose: () => void;
  onSubmit: (values: ClassFormValues) => Promise<void>;
}) {
  const [serverError, setServerError] = React.useState<string | null>(null);
  const {
    register,
    handleSubmit,
    reset,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<ClassFormValues>({
    resolver: zodResolver(classSchema),
    defaultValues: { name: "" },
  });

  React.useEffect(() => {
    if (open) {
      reset({ name: initial?.name ?? "" });
      setServerError(null);
    }
  }, [open, initial, reset]);

  async function handle(values: ClassFormValues) {
    setServerError(null);
    try {
      await onSubmit(values);
    } catch (err) {
      if (err instanceof ApiClientError && err.errors) {
        for (const [field, messages] of Object.entries(err.errors)) {
          setError(field as keyof ClassFormValues, { message: messages[0] });
        }
      }
      setServerError(err instanceof Error ? err.message : "Failed to save class.");
    }
  }

  return (
    <Modal open={open} onClose={onClose} title={title} subtitle={subtitle} icon={<School />}>
      <form onSubmit={handleSubmit(handle)} className="space-y-4" noValidate>
        {serverError && <Alert variant="error">{serverError}</Alert>}
        <div>
          <Label htmlFor="class-name">Name</Label>
          <Input id="class-name" placeholder="e.g. Class 3 - C" {...register("name")} />
          <FieldHint>Standard naming: grade + section identifier.</FieldHint>
          <FieldError message={errors.name?.message} />
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
