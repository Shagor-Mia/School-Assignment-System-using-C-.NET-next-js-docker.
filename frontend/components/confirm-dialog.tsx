"use client";

import * as React from "react";
import { AlertTriangle, Info } from "lucide-react";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  description: string;
  /** Optional detail panel under the description (e.g. what stays intact). */
  note?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  destructive?: boolean;
  loading?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

/** A shared confirmation dialog for destructive actions (delete, deactivate, etc.). */
export function ConfirmDialog({
  open,
  title,
  description,
  note,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  destructive = true,
  loading = false,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  return (
    <Modal open={open} onClose={onCancel} title={title} className="max-w-md">
      <div className="-mt-1 mb-5 flex gap-3">
        <span
          className={cn(
            "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl",
            destructive ? "bg-red-50 text-red-600" : "bg-slate-100 text-slate-700"
          )}
        >
          <AlertTriangle className="h-5 w-5" />
        </span>
        <p className="pt-0.5 text-sm leading-relaxed text-slate-600">{description}</p>
      </div>
      {note && (
        <div className="mb-5 flex items-start gap-2 rounded-lg bg-slate-100 px-3 py-2.5 text-xs leading-relaxed text-slate-600">
          <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          <span>{note}</span>
        </div>
      )}
      <div className="flex justify-end gap-2">
        <Button variant="secondary" onClick={onCancel} disabled={loading}>
          {cancelLabel}
        </Button>
        <Button
          variant={destructive ? "destructive" : "primary"}
          onClick={onConfirm}
          disabled={loading}
        >
          {loading ? "Please wait..." : confirmLabel}
        </Button>
      </div>
    </Modal>
  );
}
