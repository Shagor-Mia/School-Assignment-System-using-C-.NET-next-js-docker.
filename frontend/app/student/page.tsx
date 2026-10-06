"use client";

import * as React from "react";
import Link from "next/link";
import { ArrowRight, CheckCircle2, ClipboardCheck, FileText, Hourglass } from "lucide-react";
import { getAssignments, getMySubmission } from "@/lib/api";
import type { AssignmentDto, SubmissionDto } from "@/lib/types";
import { formatDateTime, formatDuration } from "@/lib/utils";
import { StatusBadge, StatusPill } from "@/components/status-badge";
import { Alert } from "@/components/ui/alert";
import { IconInput } from "@/components/ui/input";
import { PageSpinner } from "@/components/ui/spinner";
import { PageHeader } from "@/components/page-header";
import { Pagination } from "@/components/pagination";
import { StatCard } from "@/components/stat-card";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableWrap, Thead, Tbody, Tr, Th, Td, EmptyState } from "@/components/ui/table";
import { useAuth } from "@/components/auth-provider";

const PAGE_SIZE = 10;
const DAY_MS = 86_400_000;

/** What the student should see in the "Urgency / hint" and "Action" columns. */
function describe(a: AssignmentDto, sub: SubmissionDto | null | undefined, now: number) {
  const diff = new Date(a.deadline).getTime() - now;
  const past = diff <= 0;

  if (sub?.status === "Graded") {
    return {
      hint: <span className="text-slate-500">Completed</span>,
      action: `View Grade${sub.marks !== null ? ` (${sub.marks}/${sub.maxMarks})` : ""}`,
      tone: "text-slate-900",
    };
  }
  if (sub?.status === "ReturnedForRevision") {
    return {
      hint: <span className="font-medium text-sky-700">Feedback available</span>,
      action: "Resubmit",
      tone: "text-sky-700",
    };
  }
  if (sub) {
    return { hint: <span className="text-slate-500">Awaiting review</span>, action: "View Submission", tone: "text-slate-900" };
  }
  if (!past) {
    const soon = diff < DAY_MS;
    return {
      hint: (
        <span className={soon ? "font-medium text-amber-700" : "text-slate-600"}>
          {soon ? "Due soon · " : ""}
          {formatDuration(diff)} left
        </span>
      ),
      action: "Submit Assignment",
      tone: "text-slate-900",
    };
  }
  return {
    hint: <span className="font-medium text-rose-600">Overdue by {formatDuration(diff)}</span>,
    action: a.allowLateSubmission ? "Submit Late" : "View Details",
    tone: a.allowLateSubmission ? "text-rose-600" : "text-slate-500",
  };
}

export default function StudentDashboardPage() {
  const { user } = useAuth();
  const [assignments, setAssignments] = React.useState<AssignmentDto[] | null>(null);
  const [subs, setSubs] = React.useState<Record<string, SubmissionDto | null>>({});
  const [subsLoaded, setSubsLoaded] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [search, setSearch] = React.useState("");
  const [page, setPage] = React.useState(1);
  const [now, setNow] = React.useState<number | null>(null);

  React.useEffect(() => {
    setNow(Date.now());
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
          published.map(async (a) => [a.id, await getMySubmission(a.id)] as const)
        );
        if (cancelled) return;
        setSubs(Object.fromEntries(entries));
        setSubsLoaded(true);
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

  const filtered = React.useMemo(() => {
    const q = search.trim().toLowerCase();
    const matches = (assignments ?? []).filter(
      (a) => !q || a.title.toLowerCase().includes(q) || a.subjectName.toLowerCase().includes(q)
    );
    // Upcoming deadlines first (soonest on top), then past ones (most recent first).
    const ref = now ?? 0;
    const time = (a: AssignmentDto) => new Date(a.deadline).getTime();
    return matches.sort((a, b) => {
      const aPast = time(a) <= ref;
      const bPast = time(b) <= ref;
      if (aPast !== bPast) return aPast ? 1 : -1;
      return aPast ? time(b) - time(a) : time(a) - time(b);
    });
  }, [assignments, search, now]);

  const all = assignments ?? [];
  const pending = all.filter((a) => !subs[a.id] && (now === null || new Date(a.deadline).getTime() > now));
  const dueSoon = pending.filter((a) => now !== null && new Date(a.deadline).getTime() - now < DAY_MS).length;
  const graded = all.filter((a) => subs[a.id]?.status === "Graded").length;
  const inReview = all.filter((a) => subs[a.id] && subs[a.id]?.status !== "Graded").length;
  const pageRows = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const className = all[0]?.className;

  return (
    <div className="space-y-6">
      <PageHeader
        title="My Assignments"
        description={
          className
            ? `Published assignments and coursework for ${className}.`
            : "Published assignments for your class."
        }
        eyebrow={
          user?.fullName ? (
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Student portal · {user.fullName}
            </span>
          ) : undefined
        }
      />

      {error && <Alert variant="error">{error}</Alert>}

      {!assignments ? (
        !error && <PageSpinner />
      ) : (
        <>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <StatCard
              label="Active due"
              value={subsLoaded ? pending.length : "—"}
              unit="tasks pending"
              icon={Hourglass}
              accent="blue"
              sub={subsLoaded && dueSoon > 0 ? `${dueSoon} due in under 24 hours` : "Nothing urgent"}
            />
            <StatCard
              label="Submitted"
              value={subsLoaded ? inReview : "—"}
              unit="awaiting review"
              icon={ClipboardCheck}
              accent="amber"
            />
            <StatCard
              label="Graded"
              value={subsLoaded ? graded : "—"}
              unit="of your submissions"
              icon={CheckCircle2}
              accent="emerald"
            />
          </div>

          <Card className="overflow-hidden">
            <CardHeader className="flex-wrap">
              <CardTitle>Coursework</CardTitle>
              <IconInput
                placeholder="Filter by subject or title..."
                value={search}
                onChange={(e) => {
                  setPage(1);
                  setSearch(e.target.value);
                }}
                wrapperClassName="w-full sm:w-72"
              />
            </CardHeader>
            <TableWrap className="rounded-none border-0 shadow-none">
              <Table>
                <Thead>
                  <tr>
                    <Th>Assignment</Th>
                    <Th>Subject</Th>
                    <Th>Deadline</Th>
                    <Th>Urgency</Th>
                    <Th>Max Marks</Th>
                    <Th>Status</Th>
                    <Th className="text-right">Action</Th>
                  </tr>
                </Thead>
                <Tbody>
                  {pageRows.length === 0 && (
                    <EmptyState
                      colSpan={7}
                      message={
                        assignments.length === 0
                          ? "No assignments have been published yet."
                          : "No assignments match your filter."
                      }
                      hint={
                        assignments.length === 0
                          ? "Check back once your teachers post upcoming coursework."
                          : undefined
                      }
                      icon={<FileText />}
                    />
                  )}
                  {pageRows.map((a) => {
                    const sub = subs[a.id];
                    const d = describe(a, sub, now ?? 0);
                    const overdueUnsubmitted =
                      subsLoaded && !sub && now !== null && new Date(a.deadline).getTime() <= now;
                    return (
                      <Tr key={a.id} className={overdueUnsubmitted ? "bg-rose-50/40" : undefined}>
                        <Td className="max-w-[260px] font-medium text-slate-900">
                          <Link href={`/student/assignments/${a.id}`} className="hover:underline">
                            {a.title}
                          </Link>
                        </Td>
                        <Td>{a.subjectName}</Td>
                        <Td className="tnum whitespace-nowrap">{formatDateTime(a.deadline)}</Td>
                        <Td className="whitespace-nowrap text-sm">{subsLoaded && now !== null ? d.hint : "—"}</Td>
                        <Td className="tnum">{a.maxMarks}</Td>
                        <Td>
                          {!subsLoaded ? (
                            <span className="text-slate-400">…</span>
                          ) : sub ? (
                            <StatusBadge status={sub.status} />
                          ) : overdueUnsubmitted ? (
                            <StatusPill tone="danger">Overdue</StatusPill>
                          ) : (
                            <StatusPill tone="neutral">Not submitted</StatusPill>
                          )}
                        </Td>
                        <Td>
                          <div className="flex justify-end">
                            <Link
                              href={`/student/assignments/${a.id}`}
                              className={`inline-flex items-center gap-1 whitespace-nowrap text-sm font-medium hover:underline ${d.tone}`}
                            >
                              {subsLoaded ? d.action : "Open"} <ArrowRight className="h-4 w-4" />
                            </Link>
                          </div>
                        </Td>
                      </Tr>
                    );
                  })}
                </Tbody>
              </Table>
            </TableWrap>
            <div className="border-t border-slate-100 px-5 py-3">
              <Pagination
                page={page}
                pageSize={PAGE_SIZE}
                totalCount={filtered.length}
                noun="assignments"
                onPageChange={setPage}
              />
            </div>
          </Card>
        </>
      )}
    </div>
  );
}
