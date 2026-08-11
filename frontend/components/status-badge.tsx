import { cn } from "@/lib/utils";
import type { AssignmentStatusType, SubmissionStatusType } from "@/lib/types";

type Status = AssignmentStatusType | SubmissionStatusType;

// Consistent status color language across the whole app:
// green = Published/Graded, gray = Draft, amber = Submitted/UnderReview,
// red = Late/overdue, blue = ReturnedForRevision.
const STYLES: Record<Status, string> = {
  Draft: "bg-slate-100 text-slate-700 ring-slate-300",
  Published: "bg-green-100 text-green-800 ring-green-300",
  Submitted: "bg-amber-100 text-amber-800 ring-amber-300",
  Late: "bg-red-100 text-red-800 ring-red-300",
  UnderReview: "bg-amber-100 text-amber-800 ring-amber-300",
  Graded: "bg-green-100 text-green-800 ring-green-300",
  ReturnedForRevision: "bg-blue-100 text-blue-800 ring-blue-300",
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

export function StatusBadge({ status }: { status: Status }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset",
        STYLES[status]
      )}
    >
      {LABELS[status]}
    </span>
  );
}
