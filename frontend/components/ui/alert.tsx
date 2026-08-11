import { cn } from "@/lib/utils";

export function Alert({
  variant = "error",
  className,
  children,
}: {
  variant?: "error" | "success" | "info";
  className?: string;
  children: React.ReactNode;
}) {
  const styles = {
    error: "bg-red-50 text-red-700 ring-red-200",
    success: "bg-green-50 text-green-700 ring-green-200",
    info: "bg-slate-50 text-slate-700 ring-slate-200",
  }[variant];

  return (
    <div className={cn("rounded-md px-3 py-2 text-sm ring-1 ring-inset", styles, className)}>
      {children}
    </div>
  );
}
