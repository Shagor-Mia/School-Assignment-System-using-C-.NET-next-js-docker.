import { NavShell, type NavItem } from "@/components/nav-shell";

const items: NavItem[] = [
  { href: "/admin", label: "Dashboard" },
  { href: "/admin/users", label: "Users" },
  { href: "/admin/classes", label: "Classes" },
  { href: "/admin/subjects", label: "Subjects" },
  { href: "/admin/teacher-assignments", label: "Teacher Assignments" },
  { href: "/admin/assignments", label: "Assignments" },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <NavShell items={items} roleLabel="Admin">
      {children}
    </NavShell>
  );
}
