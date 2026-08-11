"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, X, GraduationCap } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/components/auth-provider";
import { LogoutButton } from "@/components/logout-button";

export interface NavItem {
  href: string;
  label: string;
}

interface NavShellProps {
  items: NavItem[];
  roleLabel: string;
  children: React.ReactNode;
}

/** Shared responsive sidebar/nav shell used by the admin/teacher/student layouts. */
export function NavShell({ items, roleLabel, children }: NavShellProps) {
  const pathname = usePathname();
  const { user } = useAuth();
  const [mobileOpen, setMobileOpen] = React.useState(false);

  // Pick the single most specific matching item (longest href) as active, so a root
  // item like "/admin" doesn't also light up on every "/admin/*" child route.
  const activeHref = items.reduce<string | null>((best, item) => {
    const matches = pathname === item.href || pathname.startsWith(item.href + "/");
    if (!matches) return best;
    if (best === null || item.href.length > best.length) return item.href;
    return best;
  }, null);

  const nav = (
    <nav className="flex flex-1 flex-col gap-1 px-3 py-4">
      {items.map((item) => {
        const active = item.href === activeHref;
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={() => setMobileOpen(false)}
            className={cn(
              "rounded-md px-3 py-2 text-sm font-medium transition-colors",
              active
                ? "bg-slate-900 text-white"
                : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
            )}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );

  return (
    <div className="flex min-h-screen flex-col md:flex-row">
      {/* Desktop sidebar */}
      <aside className="hidden w-64 shrink-0 flex-col border-r border-slate-200 bg-white md:flex">
        <div className="flex items-center gap-2 border-b border-slate-200 px-4 py-4">
          <GraduationCap className="h-6 w-6 text-slate-900" />
          <div>
            <p className="text-sm font-semibold text-slate-900">Assignment System</p>
            <p className="text-xs text-slate-500">{roleLabel}</p>
          </div>
        </div>
        {nav}
        <div className="border-t border-slate-200 p-3">
          <p className="truncate px-1 text-xs text-slate-500">{user?.fullName ?? ""}</p>
          <LogoutButton />
        </div>
      </aside>

      {/* Mobile top bar */}
      <header className="flex items-center justify-between border-b border-slate-200 bg-white px-4 py-3 md:hidden">
        <div className="flex items-center gap-2">
          <GraduationCap className="h-5 w-5 text-slate-900" />
          <span className="text-sm font-semibold text-slate-900">{roleLabel}</span>
        </div>
        <button
          type="button"
          aria-label="Toggle navigation"
          onClick={() => setMobileOpen((o) => !o)}
          className="rounded-md p-2 text-slate-700 hover:bg-slate-100"
        >
          {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </header>
      {mobileOpen && (
        <div className="border-b border-slate-200 bg-white md:hidden">
          {nav}
          <div className="border-t border-slate-200 p-3">
            <p className="truncate px-1 text-xs text-slate-500">{user?.fullName ?? ""}</p>
            <LogoutButton />
          </div>
        </div>
      )}

      <main className="flex-1 bg-slate-50 p-4 md:p-8">{children}</main>
    </div>
  );
}
