"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/** 1 … 4 5 6 … 107 style window; always keeps first/last and the neighbours of the current page. */
function pageWindow(page: number, total: number): (number | "gap")[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
  const pages = new Set([1, total, page - 1, page, page + 1]);
  if (page <= 3) [2, 3, 4].forEach((p) => pages.add(p));
  if (page >= total - 2) [total - 1, total - 2, total - 3].forEach((p) => pages.add(p));
  const sorted = [...pages].filter((p) => p >= 1 && p <= total).sort((a, b) => a - b);
  const out: (number | "gap")[] = [];
  sorted.forEach((p, i) => {
    if (i > 0 && p - sorted[i - 1] > 1) out.push("gap");
    out.push(p);
  });
  return out;
}

/**
 * Table footer: "Page 1 of 4 · 31 total classes" on the left, Previous / numbered pages / Next on the right.
 */
export function Pagination({
  page,
  pageSize,
  totalCount,
  noun,
  onPageChange,
  className,
}: {
  page: number;
  pageSize: number;
  totalCount: number;
  /** plural noun for the summary, e.g. "classes" */
  noun: string;
  onPageChange: (page: number) => void;
  className?: string;
}) {
  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));
  return (
    <div
      className={cn(
        "flex flex-wrap items-center justify-between gap-3 text-sm text-slate-600",
        className
      )}
    >
      <span className="tnum">
        Page {Math.min(page, totalPages)} of {totalPages} &middot; {totalCount.toLocaleString()} total {noun}
      </span>
      <div className="flex items-center gap-1.5">
        <Button
          variant="outline"
          size="sm"
          disabled={page <= 1}
          onClick={() => onPageChange(Math.max(1, page - 1))}
        >
          <ChevronLeft /> Previous
        </Button>
        <div className="hidden items-center gap-1 sm:flex">
          {pageWindow(page, totalPages).map((p, i) =>
            p === "gap" ? (
              <span key={`gap-${i}`} className="px-1 text-slate-400">
                …
              </span>
            ) : (
              <button
                key={p}
                type="button"
                aria-label={`Page ${p}`}
                aria-current={p === page ? "page" : undefined}
                onClick={() => onPageChange(p)}
                className={cn(
                  "tnum h-8 min-w-8 rounded-lg px-2 text-xs font-semibold transition-colors",
                  p === page ? "bg-slate-900 text-white" : "text-slate-700 hover:bg-slate-100"
                )}
              >
                {p}
              </button>
            )
          )}
        </div>
        <Button
          variant="outline"
          size="sm"
          disabled={page >= totalPages}
          onClick={() => onPageChange(page + 1)}
        >
          Next <ChevronRight />
        </Button>
      </div>
    </div>
  );
}
