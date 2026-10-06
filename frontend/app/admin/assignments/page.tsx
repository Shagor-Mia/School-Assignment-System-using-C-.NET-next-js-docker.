"use client";

import * as React from "react";
import { CheckCircle2, ClipboardList, FileEdit, Inbox, Lock } from "lucide-react";
import { getAssignments } from "@/lib/api";
import type { AssignmentDto, AssignmentStatusType } from "@/lib/types";
import { formatDateTime } from "@/lib/utils";
import { StatusBadge, StatusPill } from "@/components/status-badge";
import { Alert } from "@/components/ui/alert";
import { Avatar } from "@/components/ui/avatar";
import { IconInput } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { PageSpinner } from "@/components/ui/spinner";
import { PageHeader } from "@/components/page-header";
import { Pagination } from "@/components/pagination";
import { StatCard } from "@/components/stat-card";
import { Table, TableWrap, Thead, Tbody, Tr, Th, Td, EmptyState } from "@/components/ui/table";

const PAGE_SIZE = 10;

export default function AdminAssignmentsPage() {
  const [all, setAll] = React.useState<AssignmentDto[] | null>(null);
  const [page, setPage] = React.useState(1);
  const [error, setError] = React.useState<string | null>(null);
  const [search, setSearch] = React.useState("");
  const [status, setStatus] = React.useState<"" | AssignmentStatusType>("");
  const [className, setClassName] = React.useState("");
  const [now] = React.useState(() => Date.now());

  React.useEffect(() => {
    // 500 is the API's page-size ceiling; the whole set is loaded once so the
    // summary cards and filters work on real totals instead of a single page.
    getAssignments({ page: 1, pageSize: 500 })
      .then((r) => setAll(r.items))
      .catch((err) => setError(err instanceof Error ? err.message : "Failed to load assignments."));
  }, []);

  const classNames = React.useMemo(
    () =>
      [...new Set((all ?? []).map((a) => a.className))].sort((a, b) =>
        a.localeCompare(b, undefined, { numeric: true })
      ),
    [all]
  );

  const filtered = React.useMemo(() => {
    const q = search.trim().toLowerCase();
    return (all ?? []).filter(
      (a) =>
        (!status || a.status === status) &&
        (!className || a.className === className) &&
        (!q ||
          a.title.toLowerCase().includes(q) ||
          a.subjectName.toLowerCase().includes(q) ||
          a.createdByTeacherName.toLowerCase().includes(q))
    );
  }, [all, search, status, className]);

  const pageRows = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const published = (all ?? []).filter((a) => a.status === "Published").length;
  const submissions = (all ?? []).reduce((s, a) => s + a.submissionCount, 0);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Assignments"
        description="Read-only view of all assignments across the system."
        actions={
          <StatusPill tone="neutral">
            <Lock className="h-3 w-3" /> Read-only (Admin)
          </StatusPill>
        }
      />

      {error && <Alert variant="error">{error}</Alert>}

      {!all && !error ? (
        <PageSpinner />
      ) : (
        all && (
          <>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <StatCard label="Total assignments" value={all.length} icon={ClipboardList} accent="blue" />
              <StatCard
                label="Published"
                value={published}
                icon={CheckCircle2}
                accent="emerald"
                progress={all.length ? (published / all.length) * 100 : 0}
              />
              <StatCard label="Drafts" value={all.length - published} icon={FileEdit} accent="slate" />
              <StatCard label="Submissions received" value={submissions} icon={Inbox} accent="amber" />
            </div>

            <div className="flex flex-wrap items-center gap-3 rounded-xl border border-slate-200 bg-white p-3 shadow-card">
              <Select
                aria-label="Filter by status"
                value={status}
                onChange={(e) => {
                  setPage(1);
                  setStatus(e.target.value as "" | AssignmentStatusType);
                }}
                className="w-full sm:w-44"
              >
                <option value="">All statuses</option>
                <option value="Published">Published</option>
                <option value="Draft">Draft</option>
              </Select>
              <Select
                aria-label="Filter by class"
                value={className}
                onChange={(e) => {
                  setPage(1);
                  setClassName(e.target.value);
                }}
                className="w-full sm:w-44"
              >
                <option value="">All classes</option>
                {classNames.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </Select>
              <IconInput
                placeholder="Search title, subject or teacher..."
                value={search}
                onChange={(e) => {
                  setPage(1);
                  setSearch(e.target.value);
                }}
                wrapperClassName="w-full sm:ml-auto sm:w-72"
              />
            </div>

            <TableWrap>
              <Table>
                <Thead>
                  <tr>
                    <Th>Title</Th>
                    <Th>Subject</Th>
                    <Th>Class</Th>
                    <Th>Teacher</Th>
                    <Th>Status</Th>
                    <Th>Deadline</Th>
                    <Th className="text-right">Submissions</Th>
                  </tr>
                </Thead>
                <Tbody>
                  {pageRows.length === 0 && (
                    <EmptyState
                      colSpan={7}
                      message="No assignments found."
                      hint={all.length ? "Try clearing the filters." : undefined}
                      icon={<ClipboardList />}
                    />
                  )}
                  {pageRows.map((a) => {
                    const overdue = a.status === "Published" && new Date(a.deadline).getTime() < now;
                    return (
                      <Tr key={a.id}>
                        <Td className="max-w-[280px] font-medium text-slate-900">{a.title}</Td>
                        <Td>
                          <span className="rounded bg-slate-100 px-2 py-0.5 text-xs text-slate-700">
                            {a.subjectName}
                          </span>
                        </Td>
                        <Td className="whitespace-nowrap">{a.className}</Td>
                        <Td>
                          <div className="flex items-center gap-2 whitespace-nowrap">
                            <Avatar name={a.createdByTeacherName} size="sm" />
                            {a.createdByTeacherName}
                          </div>
                        </Td>
                        <Td>
                          <StatusBadge status={a.status} />
                        </Td>
                        <Td className={`tnum whitespace-nowrap ${overdue ? "font-medium text-rose-600" : ""}`}>
                          {formatDateTime(a.deadline)}
                        </Td>
                        <Td className="tnum text-right font-medium text-slate-900">{a.submissionCount}</Td>
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

            <Alert variant="info" title="Role boundary">
              Teachers keep editorial control over assignment content, deadlines and marks. Administrators have a
              read-only view across the system.
            </Alert>
          </>
        )
      )}
    </div>
  );
}
