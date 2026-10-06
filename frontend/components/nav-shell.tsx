"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  ClipboardList,
  FileText,
  GraduationCap,
  Home,
  LayoutDashboard,
  Menu,
  School,
  BookOpen,
  UserCheck,
  UserCircle,
  Users,
  X,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/components/auth-provider";
import { LogoutButton } from "@/components/logout-button";
import { Avatar } from "@/components/ui/avatar";

// Layouts are server components and can't pass component functions to this client
// component, so nav items reference icons by key.
const ICONS = {
  dashboard: LayoutDashboard,
  users: Users,
  classes: School,
  subjects: BookOpen,
  teacherAssignments: UserCheck,
  assignments: ClipboardList,
  myAssignments: FileText,
  profile: UserCircle,
} satisfies Record<string, LucideIcon>;

export type NavIcon = keyof typeof ICONS;

export interface NavItem {
  href: string;
  label: string;
  icon: NavIcon;
}

interface NavShellProps {
  items: NavItem[];
  /** "Admin" | "Teacher" | "Student" */
  roleLabel: string;
  /** Secondary line under the user's name, e.g. "System Administrator". */
  roleTitle: string;
  children: React.ReactNode;
}

function Logo() {
  return (
    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-slate-900 text-white">
      <GraduationCap className="h-5 w-5" />
    </span>
  );
}

/** Shared responsive shell (sidebar + top bar) used by the admin / teacher / student layouts. */
export function NavShell({ items, roleLabel, roleTitle, children }: NavShellProps) {
  const pathname = usePathname();
  const { user } = useAuth();
  const [mobileOpen, setMobileOpen] = React.useState(false);

  // Close the drawer whenever the route changes.
  React.useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  // Pick the single most specific matching item (longest href) as active, so a root
  // item like "/admin" doesn't also light up on every "/admin/*" child route.
  const activeItem = items.reduce<NavItem | null>((best, item) => {
    const matches = pathname === item.href || pathname.startsWith(item.href + "/");
    if (!matches) return best;
    if (best === null || item.href.length > best.href.length) return item;
    return best;
  }, null);

  const profileHref = `/${roleLabel.toLowerCase()}/profile`;

  const nav = (
    <nav aria-label="Primary" className="flex flex-1 flex-col gap-1 px-3 py-4">
      {items.map((item) => {
        const active = item.href === activeItem?.href;
        const Icon = ICONS[item.icon];
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
              active
                ? "bg-slate-900 text-white shadow-sm"
                : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
            )}
          >
            <Icon className={cn("h-[18px] w-[18px]", active ? "text-white" : "text-slate-500")} />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );

  const userBlock = (
    <div className="flex items-center justify-between gap-2 border-t border-slate-200 px-4 py-3">
      <Link href={profileHref} aria-label="My profile" className="min-w-0 flex-1 rounded-lg hover:opacity-80">
        <p className="truncate text-sm font-semibold text-slate-900">{user?.fullName ?? " "}</p>
        <p className="truncate text-xs text-slate-500">{roleTitle}</p>
      </Link>
      <LogoutButton />
    </div>
  );

  const brand = (
    <div className="flex h-16 items-center gap-3 border-b border-slate-200 px-4">
      <Logo />
      <div className="min-w-0 leading-tight">
        <p className="truncate text-sm font-semibold tracking-tight text-slate-900">Assignment System</p>
        <p className="truncate text-xs text-slate-500">{roleLabel} Console</p>
      </div>
    </div>
  );

  return (
    <div className="flex min-h-screen flex-1">
      {/* Desktop sidebar */}
      <aside className="sticky top-0 hidden h-screen w-64 shrink-0 flex-col border-r border-slate-200 bg-white lg:flex">
        {brand}
        {nav}
        {userBlock}
      </aside>

      {/* Mobile drawer */}
      {mobileOpen && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div
            className="absolute inset-0 bg-slate-900/40 backdrop-blur-[2px]"
            onClick={() => setMobileOpen(false)}
            aria-hidden="true"
          />
          <aside className="relative flex h-full w-72 max-w-[85vw] flex-col bg-white shadow-modal">
            {brand}
            {nav}
            {userBlock}
          </aside>
        </div>
      )}

      <div className="flex min-w-0 flex-1 flex-col">
        {/* Top bar */}
        <header className="sticky top-0 z-30 flex h-16 items-center justify-between gap-3 border-b border-slate-200 bg-white/85 px-4 backdrop-blur md:px-6 lg:px-8">
          <div className="flex min-w-0 items-center gap-3">
            <button
              type="button"
              aria-label="Toggle navigation"
              aria-expanded={mobileOpen}
              onClick={() => setMobileOpen((o) => !o)}
              className="-ml-1 rounded-lg p-2 text-slate-700 hover:bg-slate-100 lg:hidden"
            >
              {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
            <div className="flex min-w-0 items-center gap-2 text-sm text-slate-500">
              <Home className="h-4 w-4 shrink-0" />
              <span className="text-slate-300">/</span>
              <span className="truncate font-medium text-slate-900">
                {activeItem ? activeItem.label : roleLabel}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span className="hidden text-right leading-tight sm:block">
              <span className="block max-w-[200px] truncate text-sm font-medium text-slate-900">
                {user?.fullName ?? ""}
              </span>
              <span className="block text-xs text-slate-500">{roleTitle}</span>
            </span>
            <Link href={profileHref} aria-label="My profile" className="rounded-full hover:opacity-80">
              <Avatar name={user?.fullName} tone="dark" size="md" />
            </Link>
          </div>
        </header>

        <main className="flex-1 bg-slate-50 px-4 py-6 md:px-6 lg:px-8">{children}</main>
      </div>
    </div>
  );
}
