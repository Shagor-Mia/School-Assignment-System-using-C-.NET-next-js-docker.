"use client";

import * as React from "react";
import Link from "next/link";
import { BookOpen } from "lucide-react";
import { getMyTeacherAssignments } from "@/lib/api";
import type { TeacherAssignmentDto } from "@/lib/types";
import { Card } from "@/components/ui/card";
import { Alert } from "@/components/ui/alert";
import { PageSpinner } from "@/components/ui/spinner";
import { useAuth } from "@/components/auth-provider";

export default function TeacherDashboardPage() {
  const { user } = useAuth();
  const [assignments, setAssignments] = React.useState<TeacherAssignmentDto[] | null>(null);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    getMyTeacherAssignments()
      .then(setAssignments)
      .catch((err) => setError(err instanceof Error ? err.message : "Failed to load subjects."));
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">
          Welcome{user?.fullName ? `, ${user.fullName}` : ""}
        </h1>
        <p className="text-sm text-slate-500">Subjects you teach</p>
      </div>

      {error && <Alert variant="error">{error}</Alert>}

      {!assignments ? (
        <PageSpinner />
      ) : assignments.length === 0 ? (
        <Card className="p-6 text-sm text-slate-500">
          You have not been assigned to any subjects yet. Contact an administrator.
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {assignments.map((a) => (
            <Card key={a.id} className="flex items-start gap-3 p-4">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-slate-900 text-white">
                <BookOpen className="h-5 w-5" />
              </div>
              <div>
                <p className="font-medium text-slate-900">{a.subjectName}</p>
                <p className="text-sm text-slate-500">{a.className}</p>
              </div>
            </Card>
          ))}
        </div>
      )}

      <div>
        <Link
          href="/teacher/assignments"
          className="text-sm font-medium text-slate-900 underline underline-offset-2"
        >
          View my assignments &rarr;
        </Link>
      </div>
    </div>
  );
}
