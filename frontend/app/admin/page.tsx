"use client";

import * as React from "react";
import Link from "next/link";
import { ArrowRight, BookOpen, ClipboardList, School, Users } from "lucide-react";
import { getAssignments, getClasses, getSubjects, getUsers } from "@/lib/api";
import type { AssignmentDto } from "@/lib/types";
import { StatCard } from "@/components/stat-card";
import { StatusBadge } from "@/components/status-badge";
import { PageHeader } from "@/components/page-header";
import { PageSpinner } from "@/components/ui/spinner";
import { Alert } from "@/components/ui/alert";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableWrap, Thead, Tbody, Tr, Th, Td, EmptyState } from "@/components/ui/table";

interface Overview {
  users: number;
  admins: number;
  teachers: number;
  students: number;
  classes: number;
  enrolled: number;
  subjects: number;
  assignments: number;
  published: number;
  drafts: number;
  recent: AssignmentDto[];
}

function pct(part: number, total: number) {
  return total === 0 ? 0 : Math.round((part / total) * 100);
}

/** Stacked horizontal bar + legend rows, used for the distribution cards. */
function Distribution({
  rows,
}: {
  rows: { label: string; value: number; color: string }[];
}) {
  const total = rows.reduce((s, r) => s + r.value, 0);
  return (
    <div className="space-y-4 p-5">
      <div className="flex h-2.5 w-full overflow-hidden rounded-full bg-slate-100">
        {rows.map((r) => (
          <div
            key={r.label}
            className={r.color}
            style={{ width: `${pct(r.value, total)}%` }}
            title={`${r.label}: ${r.value}`}
          />
        ))}
      </div>
      <ul className="space-y-2.5">
        {rows.map((r) => (
          <li key={r.label} className="flex items-center justify-between text-sm">
            <span className="flex items-center gap-2 text-slate-700">
              <span className={`h-2.5 w-2.5 rounded-full ${r.color}`} />
              {r.label}
            </span>
            <span className="tnum flex items-center gap-3">
              <span className="font-semibold text-slate-900">{r.value.toLocaleString()}</span>
              <span className="w-9 text-right text-xs text-slate-500">{pct(r.value, total)}%</span>
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default function AdminDashboardPage() {
  const [data, setData] = React.useState<Overview | null>(null);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const [users, admins, teachers, students, classes, subjects, assignments] = await Promise.all([
          getUsers({ page: 1, pageSize: 1 }),
          getUsers({ role: "Admin", page: 1, pageSize: 1 }),
          getUsers({ role: "Teacher", page: 1, pageSize: 1 }),
          getUsers({ role: "Student", page: 1, pageSize: 1 }),
          getClasses({ page: 1, pageSize: 500 }),
          getSubjects({ page: 1, pageSize: 1 }),
          getAssignments({ page: 1, pageSize: 500 }),
        ]);
        if (cancelled) return;
        const published = assignments.items.filter((a) => a.status === "Published").length;
        setData({
          users: users.totalCount,
          admins: admins.totalCount,
          teachers: teachers.totalCount,
          students: students.totalCount,
          classes: classes.totalCount,
          enrolled: classes.items.reduce((s, c) => s + c.studentCount, 0),
          subjects: subjects.totalCount,
          assignments: assignments.totalCount,
          published,
          drafts: assignments.items.length - published,
          recent: [...assignments.items]
            .sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt))
            .slice(0, 5),
        });
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Failed to load dashboard data.");
        }
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Dashboard"
        description="System-wide overview of users, classes, subjects and assignments."
      />

      {error && <Alert variant="error">{error}</Alert>}
      {!data && !error && <PageSpinner />}

      {data && (
        <>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard
              label="Users"
              value={data.users}
              icon={Users}
              accent="blue"
              href="/admin/users"
              sub={`${data.admins} admin · ${data.teachers} teachers · ${data.students.toLocaleString()} students`}
            />
            <StatCard
              label="Classes"
              value={data.classes}
              icon={School}
              accent="cyan"
              href="/admin/classes"
              sub={`${data.enrolled.toLocaleString()} students enrolled`}
            />
            <StatCard
              label="Subjects"
              value={data.subjects}
              icon={BookOpen}
              accent="indigo"
              href="/admin/subjects"
              sub={`Avg ${data.classes ? Math.round(data.subjects / data.classes) : 0} per class`}
            />
            <StatCard
              label="Assignments"
              value={data.assignments}
              icon={ClipboardList}
              accent="emerald"
              href="/admin/assignments"
              sub={`${data.published} published · ${data.drafts} drafts`}
            />
          </div>

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
            <Card className="overflow-hidden lg:col-span-2">
              <CardHeader>
                <CardTitle>Recent Assignments</CardTitle>
                <Link
                  href="/admin/assignments"
                  className="inline-flex items-center gap-1 text-sm font-medium text-slate-900 hover:underline"
                >
                  View all <ArrowRight className="h-4 w-4" />
                </Link>
              </CardHeader>
              <TableWrap className="rounded-none border-0 shadow-none">
                <Table>
                  <Thead>
                    <tr>
                      <Th>Assignment</Th>
                      <Th>Class</Th>
                      <Th>Teacher</Th>
                      <Th>Status</Th>
                    </tr>
                  </Thead>
                  <Tbody>
                    {data.recent.length === 0 && (
                      <EmptyState colSpan={4} message="No assignments yet." icon={<ClipboardList />} />
                    )}
                    {data.recent.map((a) => (
                      <Tr key={a.id}>
                        <Td>
                          <p className="max-w-[260px] truncate font-medium text-slate-900">{a.title}</p>
                          <p className="text-xs text-slate-500">{a.subjectName}</p>
                        </Td>
                        <Td className="whitespace-nowrap">{a.className}</Td>
                        <Td className="whitespace-nowrap">{a.createdByTeacherName}</Td>
                        <Td>
                          <StatusBadge status={a.status} />
                        </Td>
                      </Tr>
                    ))}
                  </Tbody>
                </Table>
              </TableWrap>
            </Card>

            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Users by Role</CardTitle>
                </CardHeader>
                <Distribution
                  rows={[
                    { label: "Students", value: data.students, color: "bg-blue-600" },
                    { label: "Teachers", value: data.teachers, color: "bg-amber-500" },
                    { label: "Admins", value: data.admins, color: "bg-slate-700" },
                  ]}
                />
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle>Assignments by Status</CardTitle>
                </CardHeader>
                <Distribution
                  rows={[
                    { label: "Published", value: data.published, color: "bg-emerald-600" },
                    { label: "Draft", value: data.drafts, color: "bg-slate-400" },
                  ]}
                />
              </Card>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
