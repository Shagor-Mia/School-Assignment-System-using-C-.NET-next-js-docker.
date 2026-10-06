"use client";

import * as React from "react";
import { AlertCircle, CheckCircle2, Info, X } from "lucide-react";
import { cn } from "@/lib/utils";

const STYLES = {
  error: { box: "border-red-200 bg-red-50 text-red-800", icon: "text-red-600", Icon: AlertCircle },
  success: {
    box: "border-emerald-200 bg-emerald-50 text-emerald-800",
    icon: "text-emerald-600",
    Icon: CheckCircle2,
  },
  info: { box: "border-sky-200 bg-sky-50 text-sky-900", icon: "text-sky-600", Icon: Info },
} as const;

/**
 * Inline banner. `title` renders a bold first line; `onDismiss` adds a close button.
 * Errors and success banners are announced to assistive tech via `role`.
 */
export function Alert({
  variant = "error",
  title,
  className,
  children,
  onDismiss,
}: {
  variant?: "error" | "success" | "info";
  title?: string;
  className?: string;
  children: React.ReactNode;
  onDismiss?: () => void;
}) {
  const s = STYLES[variant];
  return (
    <div
      role={variant === "error" ? "alert" : "status"}
      className={cn("flex items-start gap-3 rounded-xl border px-4 py-3 text-sm", s.box, className)}
    >
      <s.Icon className={cn("mt-0.5 h-4 w-4 shrink-0", s.icon)} />
      <div className="min-w-0 flex-1 leading-relaxed">
        {title && <p className="font-semibold">{title}</p>}
        <div>{children}</div>
      </div>
      {onDismiss && (
        <button
          type="button"
          onClick={onDismiss}
          aria-label="Dismiss"
          className="-mr-1 rounded p-0.5 opacity-70 hover:opacity-100"
        >
          <X className="h-4 w-4" />
        </button>
      )}
    </div>
  );
}
