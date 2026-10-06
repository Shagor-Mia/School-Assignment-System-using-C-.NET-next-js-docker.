import { NavShell, type NavItem } from "@/components/nav-shell";

const items: NavItem[] = [
  { href: "/teacher", label: "Dashboard", icon: "dashboard" },
  { href: "/teacher/assignments", label: "My Assignments", icon: "myAssignments" },
];

export default function TeacherLayout({ children }: { children: React.ReactNode }) {
  return (
    <NavShell items={items} roleLabel="Teacher" roleTitle="Faculty">
      {children}
    </NavShell>
  );
}
