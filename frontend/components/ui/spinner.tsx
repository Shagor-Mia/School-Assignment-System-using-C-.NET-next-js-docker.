import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

export function Spinner({ className }: { className?: string }) {
  return <Loader2 className={cn("h-5 w-5 animate-spin text-slate-400", className)} />;
}

export function PageSpinner() {
  return (
    <div className="flex w-full items-center justify-center py-16">
      <Spinner className="h-8 w-8" />
    </div>
  );
}
