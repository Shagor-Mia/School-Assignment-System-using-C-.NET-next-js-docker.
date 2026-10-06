"use client";

import * as React from "react";
import Link from "next/link";
import {
  ArrowRight,
  CheckCircle2,
  Clock,
  FileEdit,
  FileText,
  Inbox,
  Library,
  Plus,
} from "lucide-react";
import { getAssignments } from "@/lib/api";
import type { AssignmentDto } from "@/lib/types";
import { formatDateTime } from "@/lib/utils";
import { useAuth } from "@/components/auth-provider";
import { StatusBadge } from "@/components/status-badge";
import { Button } from "@/components/ui/button";
import { Alert } from "@/components/ui/alert";
import { IconInput } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Tabs } from "@/components/ui/tabs";
import { PageSpinner } from "@/components/ui/spinner";
import { PageHeader } from "@/components/page-header";
import { Pagination } from "@/components/pagination";
import { StatCard } from "@/components/stat-card";
import { Table, TableWrap, Thead, Tbody, Tr, Th, Td, EmptyState } from "@/components/ui/table";

const PAGE_SIZE = 10;
type Tab = "all" | "published" | "draft";

export default function TeacherAssignmentsPage() {
  const { user } = useAuth();
  const [assignments, setAssignments] = React.useState<AssignmentDto[] | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [tab, setTab] = React.useState<Tab>("all");
  const [subject, setSubject] = React.useState("");
  const [search, setSearch] = React.useState("");
  const [page, setPage] = React.useState(1);
  const [now] = React.useState(() => Date.now());

  React.useEffect(() => {
    getAssignments({ page: 1, pageSize: 500 })
      .then((r) => setAssignments(r.items))
      .catch((err) => setError(err instanceof Error ? err.message : "Failed to load assignments."));
  }, []);

  // Defensive client-side filter to "my own" assignments in case the
  // backend's GET /assignments returns a broader set for teachers.
  const mine = React.useMemo(() => {
    if (!assignments) return null;
    if (!user) return assignments;
    return assignments.filter((a) => a.createdByTeacherId === user.id);
  }, [assignments, user]);

  const subjectOptions = React.useMemo(() => {
    const map = new Map<string, string>();
    (mine ?? []).forEach((a) => map.set(a.subjectId, `${a.subjectName} (${a.className})`));
    return [...map.entries()];
  }, [mine]);

  const filtered = React.useMemo(() => {
    const q = search.trim().toLowerCase();
    return (mine ?? []).filter(
      (a) =>
        (tab === "all" || a.status.toLowerCase() === tab) &&
        (!subject || a.subjectId === subject) &&
        (!q || a.title.toLowerCase().includes(q))
    );
  }, [mine, tab, subject, search]);

  const publishedCount = (mine ?? []).filter((a) => a.status === "Published").length;
  const submissions = (mine ?? []).reduce((s, a) => s + a.submissionCount, 0);
  const pageRows = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  return (
    <div className="space-y-6">
      <PageHeader
        title="My Assignments"
        description="Assignments you have created across your subjects and classes."
        actions={
          <Link href="/teacher/assignments/new">
            <Button>
              <Plus /> New Assignment
            </Button>
          </Link>
        }
      />

      {error && <Alert variant="error">{error}</Alert>}

      {!mine ? (
        !error && <PageSpinner />
      ) : (
        <>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard label="Total created" value={mine.length} icon={FileText} accent="blue" />
            <StatCard
              label="Published"
              value={publishedCount}
              icon={CheckCircle2}
              accent="emerald"
              progress={mine.length ? (publishedCount / mine.length) * 100 : 0}
            />
            <StatCard label="Drafts" value={mine.length - publishedCount} icon={FileEdit} accent="slate" />
            <StatCard label="Submissions received" value={submissions} icon={Inbox} accent="amber" />
          </div>

          <div className="flex flex-wrap items-center gap-3 rounded-xl border border-slate-200 bg-white p-3 shadow-card">
            <Tabs
              value={tab}
              onChange={(t) => {
                setPage(1);
                setTab(t);
              }}
              tabs={[
                { key: "all", label: "All", count: mine.length },
                { key: "published", label: "Published", count: publishedCount },
                { key: "draft", label: "Drafts", count: mine.length - publishedCount },
              ]}
            />
            <div className="flex w-full flex-wrap items-center gap-3 lg:ml-auto lg:w-auto">
              <Select
                aria-label="Filter by subject"
                value={subject}
                onChange={(e) => {
                  setPage(1);
                  setSubject(e.target.value);
                }}
                className="w-full sm:w-56"
              >
                <option value="">All subjects ({subjectOptions.length})</option>
                {subjectOptions.map(([id, label]) => (
                  <option key={id} value={id}>
                    {label}
                  </option>
                ))}
              </Select>
              <IconInput
                placeholder="Search assignments..."
                value={search}
                onChange={(e) => {
                  setPage(1);
                  setSearch(e.target.value);
                }}
                wrapperClassName="w-full sm:w-64"
              />
            </div>
          </div>

          <TableWrap>
            <Table>
              <Thead>
                <tr>
                  <Th>Title</Th>
                  <Th>Subject &amp; Class</Th>
                  <Th>Status</Th>
                  <Th>Deadline</Th>
                  <Th className="text-right">Submissions</Th>
                  <Th className="text-right">Action</Th>
                </tr>
              </Thead>
              <Tbody>
                {pageRows.length === 0 && (
                  <EmptyState
                    colSpan={6}
                    message={
                      mine.length === 0 ? "You haven't created any assignments yet." : "No assignments match your filters."
                    }
                    hint={mine.length === 0 ? "Create your first assignment for one of your classes." : undefined}
                    icon={<Library />}
                  />
                )}
                {pageRows.map((a) => {
                  const overdue = a.status === "Published" && new Date(a.deadline).getTime() < now;
                  return (
                    <Tr key={a.id}>
                      <Td>
                        <Link
                          href={`/teacher/assignments/${a.id}`}
                          className="flex items-center gap-3 font-medium text-slate-900 hover:underline"
                        >
                          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-500">
                            <FileText className="h-4 w-4" />
                          </span>
                          <span className="max-w-[260px] truncate">{a.title}</span>
                        </Link>
                      </Td>
                      <Td>
                        <p className="text-slate-900">{a.subjectName}</p>
                        <p className="text-xs text-slate-500">{a.className}</p>
                      </Td>
                      <Td>
                        <StatusBadge status={a.status} />
                      </Td>
                      <Td className={`tnum whitespace-nowrap ${overdue ? "font-medium text-rose-600" : ""}`}>
                        <span className="inline-flex items-center gap-1.5">
                          <Clock className="h-3.5 w-3.5 text-slate-400" />
                          {formatDateTime(a.deadline)}
                        </span>
                      </Td>
                      <Td className="tnum text-right font-medium text-slate-900">{a.submissionCount}</Td>
                      <Td>
                        <div className="flex justify-end">
                          <Link href={`/teacher/assignments/${a.id}`}>
                            <Button variant="outline" size="sm">
                              {a.status === "Draft" ? "Edit" : "Manage"} <ArrowRight />
                            </Button>
                          </Link>
                        </div>
                      </Td>
                    </Tr>
                  );
                })}
              </Tbody>
            </Table>
          </TableWrap>

          <Pagination
            page={page}
            pageSize={PAGE_SIZE}
            totalCount={filtered.length}
            noun="assignments"
            onPageChange={setPage}
          />
        </>
      )}
    </div>
  );
}
