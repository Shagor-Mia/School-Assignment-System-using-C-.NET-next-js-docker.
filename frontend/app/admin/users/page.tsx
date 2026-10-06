"use client";

import * as React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Eye,
  EyeOff,
  GraduationCap,
  Info,
  Pencil,
  Plus,
  ShieldCheck,
  UserPlus,
  UserX,
  Users,
  Users as UsersIcon,
} from "lucide-react";
import {
  createUser,
  deleteUser,
  getClasses,
  getUsers,
  updateUser,
} from "@/lib/api";
import { ApiClientError } from "@/lib/api-client";
import type { ClassDto, PagedResult, Role, UserDto } from "@/lib/types";
import {
  createUserSchema,
  updateUserSchema,
  type CreateUserFormValues,
  type UpdateUserFormValues,
} from "@/lib/schemas";
import { Button } from "@/components/ui/button";
import { fieldBase, IconInput, Input } from "@/components/ui/input";
import { FieldHint, Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Modal } from "@/components/ui/modal";
import { Tabs } from "@/components/ui/tabs";
import { Avatar } from "@/components/ui/avatar";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { Alert } from "@/components/ui/alert";
import { FieldError } from "@/components/ui/field-error";
import { PageSpinner } from "@/components/ui/spinner";
import { PageHeader } from "@/components/page-header";
import { Pagination } from "@/components/pagination";
import { StatCard } from "@/components/stat-card";
import { ActiveBadge } from "@/components/status-badge";
import { Table, TableWrap, Thead, Tbody, Tr, Th, Td, EmptyState } from "@/components/ui/table";

const PAGE_SIZE = 10;
const ROLES: Role[] = ["Admin", "Teacher", "Student"];

type RoleCounts = Record<Role, number> & { total: number };

export default function AdminUsersPage() {
  const [data, setData] = React.useState<PagedResult<UserDto> | null>(null);
  const [classes, setClasses] = React.useState<ClassDto[]>([]);
  const [counts, setCounts] = React.useState<RoleCounts | null>(null);
  const [roleFilter, setRoleFilter] = React.useState<Role>("Admin");
  const [search, setSearch] = React.useState("");
  const [page, setPage] = React.useState(1);
  const [error, setError] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState(true);

  const [editing, setEditing] = React.useState<UserDto | null>(null);
  const [creating, setCreating] = React.useState(false);
  const [deactivating, setDeactivating] = React.useState<UserDto | null>(null);
  const [actionLoading, setActionLoading] = React.useState(false);

  const load = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await getUsers({
        role: roleFilter,
        search: search || undefined,
        page,
        pageSize: PAGE_SIZE,
      });
      setData(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load users.");
    } finally {
      setLoading(false);
    }
  }, [roleFilter, search, page]);

  const loadCounts = React.useCallback(async () => {
    try {
      const [a, t, s] = await Promise.all(
        ROLES.map((role) => getUsers({ role, page: 1, pageSize: 1 }))
      );
      setCounts({
        Admin: a.totalCount,
        Teacher: t.totalCount,
        Student: s.totalCount,
        total: a.totalCount + t.totalCount + s.totalCount,
      });
    } catch {
      /* counts are decorative; the table surfaces real errors */
    }
  }, []);

  React.useEffect(() => {
    load();
  }, [load]);

  React.useEffect(() => {
    loadCounts();
    getClasses({ page: 1, pageSize: 500 }).then((r) => setClasses(r.items)).catch(() => {});
  }, [loadCounts]);

  async function handleDeactivate() {
    if (!deactivating) return;
    setActionLoading(true);
    try {
      await deleteUser(deactivating.id);
      setDeactivating(null);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to deactivate user.");
      setDeactivating(null);
    } finally {
      setActionLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Users"
        description="Manage administrator, teacher and student accounts and their access."
        actions={
          <Button onClick={() => setCreating(true)}>
            <Plus /> New User
          </Button>
        }
      />

      {counts && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard label="Total accounts" value={counts.total} icon={UsersIcon} accent="blue" />
          <StatCard label="Administrators" value={counts.Admin} icon={ShieldCheck} accent="slate" />
          <StatCard label="Teachers" value={counts.Teacher} icon={GraduationCap} accent="amber" />
          <StatCard label="Students" value={counts.Student} icon={Users} accent="emerald" />
        </div>
      )}

      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white p-3 shadow-card">
        <Tabs
          value={roleFilter}
          onChange={(r) => {
            setPage(1);
            setRoleFilter(r);
          }}
          tabs={ROLES.map((r) => ({ key: r, label: `${r}s`, count: counts?.[r] }))}
        />
        <IconInput
          placeholder="Search by name or email..."
          value={search}
          onChange={(e) => {
            setPage(1);
            setSearch(e.target.value);
          }}
          wrapperClassName="w-full sm:w-72"
        />
      </div>

      {error && <Alert variant="error">{error}</Alert>}

      {loading && !data ? (
        <PageSpinner />
      ) : (
        <>
          <TableWrap>
            <Table>
              <Thead>
                <tr>
                  <Th>Name</Th>
                  <Th>Email</Th>
                  <Th>Role</Th>
                  <Th>Class</Th>
                  <Th>Status</Th>
                  <Th className="text-right">Actions</Th>
                </tr>
              </Thead>
              <Tbody>
                {data && data.items.length === 0 && (
                  <EmptyState
                    colSpan={6}
                    message="No users found."
                    hint="Try a different search term or switch the role tab."
                    icon={<UsersIcon />}
                  />
                )}
                {data?.items.map((u) => (
                  <Tr key={u.id}>
                    <Td>
                      <div className="flex items-center gap-3">
                        <Avatar name={u.fullName} />
                        <span className="font-medium text-slate-900">{u.fullName}</span>
                      </div>
                    </Td>
                    <Td className="text-slate-600">{u.email}</Td>
                    <Td>{u.role}</Td>
                    <Td>{u.className ?? "-"}</Td>
                    <Td>
                      <ActiveBadge active={u.isActive} />
                    </Td>
                    <Td>
                      <div className="flex justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          aria-label={`Edit ${u.fullName}`}
                          onClick={() => setEditing(u)}
                        >
                          <Pencil />
                        </Button>
                        {u.isActive && (
                          <Button
                            variant="ghost"
                            size="icon"
                            aria-label={`Deactivate ${u.fullName}`}
                            onClick={() => setDeactivating(u)}
                          >
                            <UserX className="text-red-600" />
                          </Button>
                        )}
                      </div>
                    </Td>
                  </Tr>
                ))}
              </Tbody>
            </Table>
          </TableWrap>

          <Pagination
            page={page}
            pageSize={data?.pageSize ?? PAGE_SIZE}
            totalCount={data?.totalCount ?? 0}
            noun="users"
            onPageChange={setPage}
          />
        </>
      )}

      <CreateUserModal
        open={creating}
        classes={classes}
        onClose={() => setCreating(false)}
        onCreated={() => {
          setCreating(false);
          load();
          loadCounts();
        }}
      />

      <EditUserModal
        user={editing}
        classes={classes}
        onClose={() => setEditing(null)}
        onSaved={() => {
          setEditing(null);
          load();
          loadCounts();
        }}
      />

      <ConfirmDialog
        open={!!deactivating}
        title="Deactivate user account"
        description={`Are you sure you want to deactivate "${deactivating?.fullName}"? They will no longer be able to sign in.`}
        note="Their submissions, grades and class records stay intact. You can re-activate the account later from Edit."
        confirmLabel="Deactivate"
        cancelLabel="Keep Active"
        loading={actionLoading}
        onConfirm={handleDeactivate}
        onCancel={() => setDeactivating(null)}
      />
    </div>
  );
}

function PasswordInput(props: React.InputHTMLAttributes<HTMLInputElement>) {
  const [show, setShow] = React.useState(false);
  return (
    <div className="relative">
      <input {...props} type={show ? "text" : "password"} className={`${fieldBase} h-10 pl-3 pr-10`} />
      <button
        type="button"
        onClick={() => setShow((s) => !s)}
        aria-label={show ? "Hide password" : "Show password"}
        className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-slate-500 hover:text-slate-900"
      >
        {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
      </button>
    </div>
  );
}

function CreateUserModal({
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
    watch,
    reset,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<CreateUserFormValues>({
    resolver: zodResolver(createUserSchema),
    defaultValues: { fullName: "", email: "", password: "", role: "Student", classId: null },
  });
  const role = watch("role");

  React.useEffect(() => {
    if (open) {
      reset({ fullName: "", email: "", password: "", role: "Student", classId: null });
      setServerError(null);
    }
  }, [open, reset]);

  async function onSubmit(values: CreateUserFormValues) {
    setServerError(null);
    try {
      await createUser({
        ...values,
        classId: values.role === "Student" ? values.classId || null : null,
      });
      onCreated();
    } catch (err) {
      if (err instanceof ApiClientError && err.errors) {
        for (const [field, messages] of Object.entries(err.errors)) {
          setError(field as keyof CreateUserFormValues, { message: messages[0] });
        }
      }
      setServerError(err instanceof Error ? err.message : "Failed to create user.");
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="New User"
      subtitle="Assign identity & credentials"
      icon={<UserPlus />}
    >
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
        {serverError && <Alert variant="error">{serverError}</Alert>}
        <div>
          <Label htmlFor="fullName">Full name</Label>
          <Input id="fullName" placeholder="e.g. Mahfuzur Rahman" {...register("fullName")} />
          <FieldError message={errors.fullName?.message} />
        </div>
        <div>
          <Label htmlFor="email">Email</Label>
          <Input id="email" type="email" placeholder="e.g. m.rahman@school.edu.bd" {...register("email")} />
          <FieldError message={errors.email?.message} />
        </div>
        <div>
          <Label htmlFor="password">Password</Label>
          <PasswordInput id="password" {...register("password")} />
          <FieldHint>Minimum 8 characters. Share it with the user securely.</FieldHint>
          <FieldError message={errors.password?.message} />
        </div>
        <div>
          <Label htmlFor="role">Role</Label>
          <Select id="role" {...register("role")}>
            {ROLES.map((r) => (
              <option key={r} value={r}>
                {r}
              </option>
            ))}
          </Select>
        </div>
        {role === "Student" && (
          <div>
            <Label htmlFor="classId">Class</Label>
            <Select id="classId" {...register("classId")}>
              <option value="">Select a class</option>
              {classes.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </Select>
          </div>
        )}
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

function EditUserModal({
  user,
  classes,
  onClose,
  onSaved,
}: {
  user: UserDto | null;
  classes: ClassDto[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const [serverError, setServerError] = React.useState<string | null>(null);
  const {
    register,
    handleSubmit,
    watch,
    reset,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<UpdateUserFormValues>({
    resolver: zodResolver(updateUserSchema),
    defaultValues: { fullName: "", email: "", role: "Student", classId: null, isActive: true },
  });
  const role = watch("role");

  React.useEffect(() => {
    if (user) {
      reset({
        fullName: user.fullName,
        email: user.email,
        role: user.role,
        classId: user.classId,
        isActive: user.isActive,
      });
      setServerError(null);
    }
  }, [user, reset]);

  async function onSubmit(values: UpdateUserFormValues) {
    if (!user) return;
    setServerError(null);
    try {
      await updateUser(user.id, {
        ...values,
        classId: values.role === "Student" ? values.classId || null : null,
      });
      onSaved();
    } catch (err) {
      if (err instanceof ApiClientError && err.errors) {
        for (const [field, messages] of Object.entries(err.errors)) {
          setError(field as keyof UpdateUserFormValues, { message: messages[0] });
        }
      }
      setServerError(err instanceof Error ? err.message : "Failed to update user.");
    }
  }

  return (
    <Modal
      open={!!user}
      onClose={onClose}
      title="Edit User"
      subtitle={user?.email}
      icon={<Pencil />}
    >
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
        {serverError && <Alert variant="error">{serverError}</Alert>}
        <div>
          <Label htmlFor="edit-fullName">Full name</Label>
          <Input id="edit-fullName" {...register("fullName")} />
          <FieldError message={errors.fullName?.message} />
        </div>
        <div>
          <Label htmlFor="edit-email">Email</Label>
          <Input id="edit-email" type="email" {...register("email")} />
          <FieldError message={errors.email?.message} />
        </div>
        <div>
          <Label htmlFor="edit-role">Role</Label>
          <Select id="edit-role" disabled={user?.role === "Student"} {...register("role")}>
            {ROLES.map((r) => (
              <option key={r} value={r}>
                {r}
              </option>
            ))}
          </Select>
          {user?.role === "Student" && (
            <div className="mt-2 flex items-start gap-2 rounded-lg bg-slate-100 px-3 py-2.5 text-xs text-slate-600">
              <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              <span>A student&apos;s role can&apos;t be changed.</span>
            </div>
          )}
        </div>
        {role === "Student" && (
          <div>
            <Label htmlFor="edit-classId">Class</Label>
            <Select id="edit-classId" {...register("classId")}>
              <option value="">Select a class</option>
              {classes.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </Select>
          </div>
        )}
        <div className="flex items-center gap-2.5 rounded-lg bg-slate-50 px-3 py-2.5">
          <input
            id="edit-isActive"
            type="checkbox"
            {...register("isActive")}
            className="h-4 w-4 cursor-pointer rounded accent-slate-900"
          />
          <Label htmlFor="edit-isActive" className="mb-0 cursor-pointer font-medium">
            Active
          </Label>
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
