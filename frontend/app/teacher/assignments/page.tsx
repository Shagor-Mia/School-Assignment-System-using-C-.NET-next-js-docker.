"use client";

import * as React from "react";
import Link from "next/link";
import { Plus } from "lucide-react";
import { getAssignments } from "@/lib/api";
import type { AssignmentDto } from "@/lib/types";
import { useAuth } from "@/components/auth-provider";
import { StatusBadge } from "@/components/status-badge";
import { Button } from "@/components/ui/button";
import { Alert } from "@/components/ui/alert";
import { PageSpinner } from "@/components/ui/spinner";
import { Table, TableWrap, Thead, Tbody, Tr, Th, Td, EmptyState } from "@/components/ui/table";

function formatDate(value: string) {
  return new Date(value).toLocaleString();
}

export default function TeacherAssignmentsPage() {
  const { user } = useAuth();
  const [assignments, setAssignments] = React.useState<AssignmentDto[] | null>(null);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    getAssignments({ page: 1, pageSize: 200 })
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

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">My Assignments</h1>
          <p className="text-sm text-slate-500">Assignments you have created</p>
        </div>
        <Link href="/teacher/assignments/new">
          <Button className="gap-2">
            <Plus className="h-4 w-4" /> New Assignment
          </Button>
        </Link>
      </div>

      {error && <Alert variant="error">{error}</Alert>}

      {!mine ? (
        <PageSpinner />
      ) : (
        <TableWrap>
          <Table>
            <Thead>
              <tr>
                <Th>Title</Th>
                <Th>Subject</Th>
                <Th>Status</Th>
                <Th>Deadline</Th>
                <Th>Submissions</Th>
              </tr>
            </Thead>
            <Tbody>
              {mine.length === 0 && <EmptyState colSpan={5} message="You haven't created any assignments yet." />}
              {mine.map((a) => (
                <Tr key={a.id} className="cursor-pointer">
                  <Td className="font-medium text-slate-900">
                    <Link href={`/teacher/assignments/${a.id}`} className="hover:underline">
                      {a.title}
                    </Link>
                  </Td>
                  <Td>{a.subjectName}</Td>
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
    </div>
  );
}
