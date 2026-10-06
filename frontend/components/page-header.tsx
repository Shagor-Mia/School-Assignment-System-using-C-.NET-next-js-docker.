import * as React from "react";
import Link from "next/link";
import { ChevronRight } from "lucide-react";

export interface Crumb {
  label: string;
  href?: string;
}

/** Breadcrumb trail for detail pages ("My Assignments > Reading Unit 4"). */
export function Breadcrumbs({ items }: { items: Crumb[] }) {
  return (
    <nav aria-label="Breadcrumb" className="flex flex-wrap items-center gap-1 text-xs text-slate-500">
      {items.map((c, i) => (
        <span key={`${c.label}-${i}`} className="flex items-center gap-1">
          {i > 0 && <ChevronRight className="h-3.5 w-3.5 text-slate-400" />}
          {c.href ? (
            <Link href={c.href} className="hover:text-slate-900 hover:underline">
              {c.label}
            </Link>
          ) : (
            <span className="font-medium text-slate-900">{c.label}</span>
          )}
        </span>
      ))}
    </nav>
  );
}

/** Page title block: optional eyebrow/breadcrumbs, 24px title, description, right-aligned actions. */
export function PageHeader({
  title,
  description,
  eyebrow,
  badge,
  actions,
}: {
  title: string;
  description?: React.ReactNode;
  eyebrow?: React.ReactNode;
  badge?: React.ReactNode;
  actions?: React.ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-4">
      <div className="min-w-0 space-y-1.5">
        {eyebrow && <div>{eyebrow}</div>}
        <div className="flex flex-wrap items-center gap-2.5">
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900">{title}</h1>
          {badge}
        </div>
        {description && <p className="text-sm text-slate-500">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}
