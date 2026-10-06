import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

const ACCENTS = {
  blue: { bar: "border-t-blue-600", icon: "bg-blue-50 text-blue-700", fill: "bg-blue-600" },
  cyan: { bar: "border-t-cyan-600", icon: "bg-cyan-50 text-cyan-700", fill: "bg-cyan-600" },
  indigo: { bar: "border-t-indigo-600", icon: "bg-indigo-50 text-indigo-700", fill: "bg-indigo-600" },
  emerald: { bar: "border-t-emerald-600", icon: "bg-emerald-50 text-emerald-700", fill: "bg-emerald-600" },
  amber: { bar: "border-t-amber-500", icon: "bg-amber-50 text-amber-700", fill: "bg-amber-500" },
  rose: { bar: "border-t-rose-500", icon: "bg-rose-50 text-rose-700", fill: "bg-rose-500" },
  slate: { bar: "border-t-slate-300", icon: "bg-slate-100 text-slate-600", fill: "bg-slate-700" },
} as const;

export type Accent = keyof typeof ACCENTS;

/**
 * Overview metric card: uppercase label, large tabular value, optional helper text,
 * tinted icon tile and an optional progress bar. Becomes a link when `href` is set.
 */
export function StatCard({
  label,
  value,
  icon: Icon,
  sub,
  unit,
  accent = "slate",
  progress,
  href,
  className,
}: {
  label: string;
  value: number | string;
  icon: LucideIcon;
  sub?: React.ReactNode;
  unit?: string;
  accent?: Accent;
  /** 0-100 */
  progress?: number;
  href?: string;
  className?: string;
}) {
  const a = ACCENTS[accent];
  const body = (
    <Card
      className={cn(
        "h-full border-t-2 p-5",
        a.bar,
        href && "transition-shadow hover:shadow-popover",
        className
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">{label}</p>
        <span className={cn("flex h-9 w-9 shrink-0 items-center justify-center rounded-lg", a.icon)}>
          <Icon className="h-[18px] w-[18px]" />
        </span>
      </div>
      <p className="tnum mt-3 flex items-baseline gap-2 text-3xl font-semibold tracking-tight text-slate-900">
        {typeof value === "number" ? value.toLocaleString() : value}
        {unit && <span className="text-sm font-normal text-slate-500">{unit}</span>}
      </p>
      {sub && <p className="mt-1.5 text-xs text-slate-500">{sub}</p>}
      {progress !== undefined && (
        <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
          <div
            className={cn("h-full rounded-full", a.fill)}
            style={{ width: `${Math.max(0, Math.min(100, progress))}%` }}
          />
        </div>
      )}
    </Card>
  );

  return href ? (
    <Link href={href} className="block rounded-xl">
      {body}
    </Link>
  ) : (
    body
  );
}
