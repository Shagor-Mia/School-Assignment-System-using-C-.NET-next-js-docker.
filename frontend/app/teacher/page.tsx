"use client";

import * as React from "react";
import Link from "next/link";
import { ArrowRight, BookOpen, CheckCircle2, FileEdit, Inbox, Library } from "lucide-react";
import { getAssignments, getMyTeacherAssignments } from "@/lib/api";
import type { AssignmentDto, TeacherAssignmentDto } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Alert } from "@/components/ui/alert";
import { PageSpinner } from "@/components/ui/spinner";
import { PageHeader } from "@/components/page-header";
import { StatCard } from "@/components/stat-card";
import { StatusPill } from "@/components/status-badge";
import { useAuth } from "@/components/auth-provider";

export default function TeacherDashboardPage() {
  const { user } = useAuth();
  const [subjects, setSubjects] = React.useState<TeacherAssignmentDto[] | null>(null);
  const [assignments, setAssignments] = React.useState<AssignmentDto[]>([]);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    getMyTeacherAssignments()
      .then(setSubjects)
      .catch((err) => setError(err instanceof Error ? err.message : "Failed to load subjects."));
    getAssignments({ page: 1, pageSize: 500 })
      .then((r) => setAssignments(r.items))
      .catch(() => {
        /* summary cards fall back to zeros; the subjects list reports real errors */
      });
  }, []);

  // Defensive client-side filter to "my own" assignments in case the backend
  // returns a broader set for teachers.
  const mine = React.useMemo(
    () => (user ? assignments.filter((a) => a.createdByTeacherId === user.id) : assignments),
    [assignments, user]
  );
  const published = mine.filter((a) => a.status === "Published").length;
  const submissions = mine.reduce((s, a) => s + a.submissionCount, 0);

  return (
    <div className="space-y-6">
      <PageHeader
        title={`Welcome${user?.fullName ? `, ${user.fullName}` : ""}`}
        description="Your assigned subjects and teaching activity."
        actions={
          <Link href="/teacher/assignments">
            <Button variant="secondary">
              View my assignments <ArrowRight />
            </Button>
          </Link>
        }
      />

      {error && <Alert variant="error">{error}</Alert>}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Subjects taught" value={subjects?.length ?? "—"} icon={Library} accent="indigo" />
        <StatCard label="Published" value={published} icon={CheckCircle2} accent="emerald" sub="Visible to students" />
        <StatCard label="Drafts" value={mine.length - published} icon={FileEdit} accent="slate" sub="Not yet published" />
        <StatCard label="Submissions received" value={submissions} icon={Inbox} accent="amber" />
      </div>

      <div className="flex items-center gap-2">
        <h2 className="text-lg font-semibold tracking-tight text-slate-900">Subjects You Teach</h2>
        {subjects && (
          <span className="tnum rounded-full bg-slate-100 px-2 text-xs font-semibold leading-5 text-slate-600">
            {subjects.length}
          </span>
        )}
      </div>

      {!subjects ? (
        <PageSpinner />
      ) : subjects.length === 0 ? (
        <Card className="flex flex-col items-center gap-2 px-6 py-14 text-center">
          <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-slate-100 text-slate-500">
            <BookOpen className="h-6 w-6" />
          </span>
          <p className="text-sm font-semibold text-slate-900">No subjects assigned</p>
          <p className="max-w-sm text-sm text-slate-500">
            You have not been assigned to any subjects yet. Contact an administrator.
          </p>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {subjects.map((s) => {
            const count = mine.filter((a) => a.subjectId === s.subjectId).length;
            return (
              <Card key={s.id} className="flex flex-col gap-4 p-5">
                <div className="flex items-start justify-between gap-3">
                  <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-slate-900 text-white">
                    <BookOpen className="h-5 w-5" />
                  </span>
                  <StatusPill tone="neutral">{s.className}</StatusPill>
                </div>
                <div>
                  <p className="font-semibold tracking-tight text-slate-900">{s.subjectName}</p>
                  <p className="tnum mt-1 text-sm text-slate-500">
                    {count} {count === 1 ? "assignment" : "assignments"} created
                  </p>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
