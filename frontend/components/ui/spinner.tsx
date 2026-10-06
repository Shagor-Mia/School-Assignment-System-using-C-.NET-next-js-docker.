import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

export function Spinner({ className }: { className?: string }) {
  return <Loader2 className={cn("h-5 w-5 animate-spin text-slate-400", className)} />;
}

export function PageSpinner() {
  return (
    <div role="status" aria-label="Loading" className="flex w-full items-center justify-center py-20">
      <Spinner className="h-7 w-7" />
    </div>
  );
}
