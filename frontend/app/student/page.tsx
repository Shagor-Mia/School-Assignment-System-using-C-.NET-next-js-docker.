"use client";

import * as React from "react";
import Link from "next/link";
import { getAssignments, getMySubmission } from "@/lib/api";
import type { AssignmentDto, SubmissionStatusType } from "@/lib/types";
import { StatusBadge } from "@/components/status-badge";
import { Alert } from "@/components/ui/alert";
import { PageSpinner } from "@/components/ui/spinner";
import { Table, TableWrap, Thead, Tbody, Tr, Th, Td, EmptyState } from "@/components/ui/table";

function formatDate(value: string) {
  return new Date(value).toLocaleString();
}

export default function StudentDashboardPage() {
  const [assignments, setAssignments] = React.useState<AssignmentDto[] | null>(null);
  const [statuses, setStatuses] = React.useState<Record<string, SubmissionStatusType | null>>({});
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const all = await getAssignments({ page: 1, pageSize: 200 });
        // Published-only, defensively (backend should already scope this to
        // the student's class, but Draft assignments should never be shown).
        const published = all.items.filter((a) => a.status === "Published");
        if (cancelled) return;
        setAssignments(published);

        const entries = await Promise.all(
          published.map(async (a) => {
            const sub = await getMySubmission(a.id);
            return [a.id, sub?.status ?? null] as const;
          })
        );
        if (cancelled) return;
        setStatuses(Object.fromEntries(entries));
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Failed to load assignments.");
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
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">My Assignments</h1>
        <p className="text-sm text-slate-500">Published assignments for your class</p>
      </div>

      {error && <Alert variant="error">{error}</Alert>}

      {!assignments ? (
        <PageSpinner />
      ) : (
        <TableWrap>
          <Table>
            <Thead>
              <tr>
                <Th>Title</Th>
                <Th>Subject</Th>
                <Th>Deadline</Th>
                <Th>Max Marks</Th>
                <Th>Status</Th>
              </tr>
            </Thead>
            <Tbody>
              {assignments.length === 0 && (
                <EmptyState colSpan={5} message="No assignments have been published yet." />
              )}
              {assignments.map((a) => {
                const status = statuses[a.id];
                return (
                  <Tr key={a.id}>
                    <Td className="font-medium text-slate-900">
                      <Link href={`/student/assignments/${a.id}`} className="hover:underline">
                        {a.title}
                      </Link>
                    </Td>
                    <Td>{a.subjectName}</Td>
                    <Td>{formatDate(a.deadline)}</Td>
                    <Td>{a.maxMarks}</Td>
                    <Td>
                      {status ? (
                        <StatusBadge status={status} />
                      ) : (
                        <span className="inline-flex items-center rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-500 ring-1 ring-inset ring-slate-300">
                          Not submitted
                        </span>
                      )}
                    </Td>
                  </Tr>
                );
              })}
            </Tbody>
          </Table>
        </TableWrap>
      )}
    </div>
  );
}
