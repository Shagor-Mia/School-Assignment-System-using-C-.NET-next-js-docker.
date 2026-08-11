"use client";

import * as React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Plus, Pencil, UserX } from "lucide-react";
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Modal } from "@/components/ui/modal";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { Alert } from "@/components/ui/alert";
import { FieldError } from "@/components/ui/field-error";
import { PageSpinner } from "@/components/ui/spinner";
import { Table, TableWrap, Thead, Tbody, Tr, Th, Td, EmptyState } from "@/components/ui/table";

const PAGE_SIZE = 10;
const ROLES: Role[] = ["Admin", "Teacher", "Student"];

export default function AdminUsersPage() {
  const [data, setData] = React.useState<PagedResult<UserDto> | null>(null);
  const [classes, setClasses] = React.useState<ClassDto[]>([]);
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

  React.useEffect(() => {
    load();
  }, [load]);

  React.useEffect(() => {
    getClasses({ page: 1, pageSize: 500 }).then((r) => setClasses(r.items)).catch(() => {});
  }, []);

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

  const totalPages = data ? Math.max(1, Math.ceil(data.totalCount / data.pageSize)) : 1;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Users</h1>
          <p className="text-sm text-slate-500">Manage admin, teacher, and student accounts</p>
        </div>
        <Button onClick={() => setCreating(true)} className="gap-2">
          <Plus className="h-4 w-4" /> New User
        </Button>
      </div>

      <div className="flex border-b border-slate-200">
        {ROLES.map((r) => (
          <button
            key={r}
            type="button"
            onClick={() => {
              setPage(1);
              setRoleFilter(r);
            }}
            className={
              roleFilter === r
                ? "border-b-2 border-slate-900 px-4 py-2 text-sm font-medium text-slate-900"
                : "border-b-2 border-transparent px-4 py-2 text-sm font-medium text-slate-500 hover:text-slate-700"
            }
          >
            {r}s
          </button>
        ))}
      </div>

      <div className="flex flex-wrap gap-3">
        <Input
          placeholder="Search by name or email..."
          value={search}
          onChange={(e) => {
            setPage(1);
            setSearch(e.target.value);
          }}
          className="max-w-xs"
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
                {data && data.items.length === 0 && <EmptyState colSpan={6} message="No users found." />}
                {data?.items.map((u) => (
                  <Tr key={u.id}>
                    <Td className="font-medium text-slate-900">{u.fullName}</Td>
                    <Td>{u.email}</Td>
                    <Td>{u.role}</Td>
                    <Td>{u.className ?? "-"}</Td>
                    <Td>
                      <span
                        className={
                          u.isActive
                            ? "rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-medium text-green-800"
                            : "rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-600"
                        }
                      >
                        {u.isActive ? "Active" : "Inactive"}
                      </span>
                    </Td>
                    <Td>
                      <div className="flex justify-end gap-2">
                        <Button variant="ghost" size="sm" onClick={() => setEditing(u)}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        {u.isActive && (
                          <Button variant="ghost" size="sm" onClick={() => setDeactivating(u)}>
                            <UserX className="h-4 w-4 text-red-600" />
                          </Button>
                        )}
                      </div>
                    </Td>
                  </Tr>
                ))}
              </Tbody>
            </Table>
          </TableWrap>

          <div className="flex items-center justify-between text-sm text-slate-600">
            <span>
              Page {data?.page ?? 1} of {totalPages} &middot; {data?.totalCount ?? 0} total
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
        </>
      )}

      <CreateUserModal
        open={creating}
        classes={classes}
        onClose={() => setCreating(false)}
        onCreated={() => {
          setCreating(false);
          load();
        }}
      />

      <EditUserModal
        user={editing}
        classes={classes}
        onClose={() => setEditing(null)}
        onSaved={() => {
          setEditing(null);
          load();
        }}
      />

      <ConfirmDialog
        open={!!deactivating}
        title="Deactivate user"
        description={`Are you sure you want to deactivate "${deactivating?.fullName}"? They will no longer be able to sign in.`}
        confirmLabel="Deactivate"
        loading={actionLoading}
        onConfirm={handleDeactivate}
        onCancel={() => setDeactivating(null)}
      />
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
    <Modal open={open} onClose={onClose} title="New User">
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
        {serverError && <Alert variant="error">{serverError}</Alert>}
        <div>
          <Label htmlFor="fullName">Full name</Label>
          <Input id="fullName" {...register("fullName")} />
          <FieldError message={errors.fullName?.message} />
        </div>
        <div>
          <Label htmlFor="email">Email</Label>
          <Input id="email" type="email" {...register("email")} />
          <FieldError message={errors.email?.message} />
        </div>
        <div>
          <Label htmlFor="password">Password</Label>
          <Input id="password" type="password" {...register("password")} />
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
    <Modal open={!!user} onClose={onClose} title="Edit User">
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
            <p className="mt-1 text-xs text-slate-500">A student&apos;s role can&apos;t be changed.</p>
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
        <div className="flex items-center gap-2">
          <input id="edit-isActive" type="checkbox" {...register("isActive")} className="h-4 w-4" />
          <Label htmlFor="edit-isActive" className="mb-0">
            Active
          </Label>
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="outline" onClick={onClose}>
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
