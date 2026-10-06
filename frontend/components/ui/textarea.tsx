import * as React from "react";
import { cn } from "@/lib/utils";
import { fieldBase } from "@/components/ui/input";

export type TextareaProps = React.TextareaHTMLAttributes<HTMLTextAreaElement>;

export const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, ...props }, ref) => {
    return (
      <textarea
        ref={ref}
        className={cn(fieldBase, "min-h-[96px] resize-y px-3 py-2.5 leading-relaxed", className)}
        {...props}
      />
    );
  }
);
Textarea.displayName = "Textarea";
