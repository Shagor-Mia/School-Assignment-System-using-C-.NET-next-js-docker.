import { cn } from "@/lib/utils";
import type { AssignmentStatusType, SubmissionStatusType } from "@/lib/types";

type Status = AssignmentStatusType | SubmissionStatusType;
export type Tone = "success" | "warning" | "danger" | "info" | "neutral";

// One colour language across the whole app (text / tint / border / dot):
// emerald = Published, Graded, Active   amber = Submitted, Under Review
// rose    = Late, Overdue               sky   = Returned for Revision
// slate   = Draft, Inactive, Not submitted
const TONES: Record<Tone, { box: string; dot: string }> = {
  success: { box: "border-emerald-200 bg-emerald-50 text-emerald-700", dot: "bg-emerald-500" },
  warning: { box: "border-amber-200 bg-amber-50 text-amber-700", dot: "bg-amber-500" },
  danger: { box: "border-rose-200 bg-rose-50 text-rose-700", dot: "bg-rose-500" },
  info: { box: "border-sky-200 bg-sky-50 text-sky-700", dot: "bg-sky-500" },
  neutral: { box: "border-slate-300 bg-slate-100 text-slate-600", dot: "bg-slate-400" },
};

const STATUS_TONE: Record<Status, Tone> = {
  Draft: "neutral",
  Published: "success",
  Submitted: "warning",
  Late: "danger",
  UnderReview: "warning",
  Graded: "success",
  ReturnedForRevision: "info",
};

const LABELS: Record<Status, string> = {
  Draft: "Draft",
  Published: "Published",
  Submitted: "Submitted",
  Late: "Late",
  UnderReview: "Under Review",
  Graded: "Graded",
  ReturnedForRevision: "Returned for Revision",
};

/** Generic pill: coloured dot + label on a tinted, bordered capsule. */
export function StatusPill({
  tone,
  children,
  className,
}: {
  tone: Tone;
  children: React.ReactNode;
  className?: string;
}) {
  const t = TONES[tone];
  return (
    <span
      className={cn(
        "inline-flex h-[22px] items-center gap-1.5 whitespace-nowrap rounded-full border px-2.5 text-xs font-medium",
        t.box,
        className
      )}
    >
      <span className={cn("h-1.5 w-1.5 rounded-full", t.dot)} />
      {children}
    </span>
  );
}

export function StatusBadge({ status }: { status: Status }) {
  return <StatusPill tone={STATUS_TONE[status]}>{LABELS[status]}</StatusPill>;
}

export function ActiveBadge({ active }: { active: boolean }) {
  return <StatusPill tone={active ? "success" : "neutral"}>{active ? "Active" : "Inactive"}</StatusPill>;
}
