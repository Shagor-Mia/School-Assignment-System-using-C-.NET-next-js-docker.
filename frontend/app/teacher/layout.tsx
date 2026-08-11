import { NavShell, type NavItem } from "@/components/nav-shell";

const items: NavItem[] = [
  { href: "/teacher", label: "Dashboard" },
  { href: "/teacher/assignments", label: "My Assignments" },
];

export default function TeacherLayout({ children }: { children: React.ReactNode }) {
  return (
    <NavShell items={items} roleLabel="Teacher">
      {children}
    </NavShell>
  );
}
