import * as React from "react";
import { cn } from "@/lib/utils";

export type LabelProps = React.LabelHTMLAttributes<HTMLLabelElement>;

export const Label = React.forwardRef<HTMLLabelElement, LabelProps>(
  ({ className, ...props }, ref) => {
    return (
      <label
        ref={ref}
        className={cn("mb-1.5 block text-sm font-semibold text-slate-900", className)}
        {...props}
      />
    );
  }
);
Label.displayName = "Label";

/** Small helper line shown under a field. */
export function FieldHint({ children, className }: { children: React.ReactNode; className?: string }) {
  return <p className={cn("mt-1.5 text-xs text-slate-500", className)}>{children}</p>;
}
