import * as React from "react";
import { cn } from "@/lib/utils";
import { fieldBase } from "@/components/ui/input";

export type SelectProps = React.SelectHTMLAttributes<HTMLSelectElement>;

export const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
  ({ className, children, ...props }, ref) => {
    return (
      <select
        ref={ref}
        className={cn(fieldBase, "select-field h-10 cursor-pointer px-3", className)}
        {...props}
      >
        {children}
      </select>
    );
  }
);
Select.displayName = "Select";
