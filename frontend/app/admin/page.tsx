"use client";

import * as React from "react";
import { Users, School, BookOpen, ClipboardList } from "lucide-react";
import { getUsers, getClasses, getSubjects, getAssignments } from "@/lib/api";
import { StatTile } from "@/components/stat-tile";
import { PageSpinner } from "@/components/ui/spinner";
import { Alert } from "@/components/ui/alert";

interface Counts {
  users: number;
  classes: number;
  subjects: number;
  assignments: number;
}

export default function AdminDashboardPage() {
  const [counts, setCounts] = React.useState<Counts | null>(null);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const [users, classes, subjects, assignments] = await Promise.all([
          getUsers({ page: 1, pageSize: 1 }),
          getClasses({ page: 1, pageSize: 1 }),
          getSubjects({ page: 1, pageSize: 1 }),
          getAssignments({ page: 1, pageSize: 1 }),
        ]);
        if (cancelled) return;
        setCounts({
          users: users.totalCount,
          classes: classes.totalCount,
          subjects: subjects.totalCount,
          assignments: assignments.totalCount,
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
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">Dashboard</h1>
        <p className="text-sm text-slate-500">System-wide overview</p>
      </div>

      {error && <Alert variant="error">{error}</Alert>}
      {!counts && !error && <PageSpinner />}

      {counts && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatTile label="Users" value={counts.users} icon={Users} />
          <StatTile label="Classes" value={counts.classes} icon={School} />
          <StatTile label="Subjects" value={counts.subjects} icon={BookOpen} />
          <StatTile label="Assignments" value={counts.assignments} icon={ClipboardList} />
        </div>
      )}
    </div>
  );
}
