import * as React from "react";
import { cn } from "@/lib/utils";

/** Card-style wrapper with horizontal scroll so wide tables never break mobile layout. */
export function TableWrap({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("w-full overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-card", className)}
      {...props}
    />
  );
}

export function Table({ className, ...props }: React.TableHTMLAttributes<HTMLTableElement>) {
  return <table className={cn("w-full min-w-[640px] border-collapse text-sm", className)} {...props} />;
}

export function Thead({ className, ...props }: React.HTMLAttributes<HTMLTableSectionElement>) {
  return (
    <thead
      className={cn("border-b border-slate-200 bg-slate-50 text-left text-xs uppercase tracking-wider text-slate-500", className)}
      {...props}
    />
  );
}

export function Th({ className, ...props }: React.ThHTMLAttributes<HTMLTableCellElement>) {
  return <th className={cn("h-10 whitespace-nowrap px-4 font-semibold", className)} {...props} />;
}

export function Tbody({ className, ...props }: React.HTMLAttributes<HTMLTableSectionElement>) {
  return <tbody className={cn("divide-y divide-slate-100 bg-white", className)} {...props} />;
}

export function Tr({ className, ...props }: React.HTMLAttributes<HTMLTableRowElement>) {
  return <tr className={cn("transition-colors hover:bg-slate-50", className)} {...props} />;
}

export function Td({ className, ...props }: React.TdHTMLAttributes<HTMLTableCellElement>) {
  return <td className={cn("px-4 py-3 align-middle text-slate-700", className)} {...props} />;
}

/** Empty-state row used inside a <Tbody>. */
export function EmptyState({
  colSpan,
  message,
  hint,
  icon,
}: {
  colSpan: number;
  message: string;
  hint?: string;
  icon?: React.ReactNode;
}) {
  return (
    <tr>
      <td colSpan={colSpan} className="px-4 py-14 text-center">
        <div className="mx-auto flex max-w-sm flex-col items-center gap-2">
          {icon && (
            <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-slate-100 text-slate-500 [&_svg]:h-6 [&_svg]:w-6">
              {icon}
            </span>
          )}
          <p className="text-sm font-semibold text-slate-900">{message}</p>
          {hint && <p className="text-sm text-slate-500">{hint}</p>}
        </div>
      </td>
    </tr>
  );
}
