"use client";

import * as React from "react";
import { getAssignments } from "@/lib/api";
import type { AssignmentDto, PagedResult } from "@/lib/types";
import { StatusBadge } from "@/components/status-badge";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { PageSpinner } from "@/components/ui/spinner";
import { Table, TableWrap, Thead, Tbody, Tr, Th, Td, EmptyState } from "@/components/ui/table";

const PAGE_SIZE = 10;

function formatDate(value: string) {
  return new Date(value).toLocaleString();
}

export default function AdminAssignmentsPage() {
  const [data, setData] = React.useState<PagedResult<AssignmentDto> | null>(null);
  const [page, setPage] = React.useState(1);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    getAssignments({ page, pageSize: PAGE_SIZE })
      .then(setData)
      .catch((err) => setError(err instanceof Error ? err.message : "Failed to load assignments."));
  }, [page]);

  const assignments = data?.items ?? null;
  const totalPages = data ? Math.max(1, Math.ceil(data.totalCount / data.pageSize)) : 1;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">Assignments</h1>
        <p className="text-sm text-slate-500">Read-only view of all assignments across the system</p>
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
                <Th>Class</Th>
                <Th>Teacher</Th>
                <Th>Status</Th>
                <Th>Deadline</Th>
                <Th>Submissions</Th>
              </tr>
            </Thead>
            <Tbody>
              {assignments.length === 0 && <EmptyState colSpan={7} message="No assignments yet." />}
              {assignments.map((a) => (
                <Tr key={a.id}>
                  <Td className="font-medium text-slate-900">{a.title}</Td>
                  <Td>{a.subjectName}</Td>
                  <Td>{a.className}</Td>
                  <Td>{a.createdByTeacherName}</Td>
                  <Td>
                    <StatusBadge status={a.status} />
                  </Td>
                  <Td>{formatDate(a.deadline)}</Td>
                  <Td>{a.submissionCount}</Td>
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
    </div>
  );
}
