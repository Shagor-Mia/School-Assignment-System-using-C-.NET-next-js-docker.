import * as React from "react";
import { Search } from "lucide-react";
import { cn } from "@/lib/utils";

export type InputProps = React.InputHTMLAttributes<HTMLInputElement>;

export const fieldBase =
  "w-full rounded-lg border border-transparent bg-slate-100 text-sm text-slate-900 transition-colors placeholder:text-slate-400 hover:bg-slate-200/70 focus:border-slate-900 focus:bg-white disabled:cursor-not-allowed disabled:opacity-60 aria-[invalid=true]:border-red-500 aria-[invalid=true]:bg-red-50/60";

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, ...props }, ref) => {
    return <input ref={ref} className={cn(fieldBase, "h-10 px-3", className)} {...props} />;
  }
);
Input.displayName = "Input";

/** Input with a leading icon (defaults to a magnifier) for search/filter bars. */
export const IconInput = React.forwardRef<
  HTMLInputElement,
  InputProps & { icon?: React.ReactNode; wrapperClassName?: string }
>(({ className, icon, wrapperClassName, ...props }, ref) => {
  return (
    <div className={cn("relative", wrapperClassName)}>
      <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 [&_svg]:h-4 [&_svg]:w-4">
        {icon ?? <Search />}
      </span>
      <input ref={ref} className={cn(fieldBase, "h-10 pl-9 pr-3", className)} {...props} />
    </div>
  );
});
IconInput.displayName = "IconInput";
