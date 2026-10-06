import { NavShell, type NavItem } from "@/components/nav-shell";

const items: NavItem[] = [
  { href: "/admin", label: "Dashboard", icon: "dashboard" },
  { href: "/admin/users", label: "Users", icon: "users" },
  { href: "/admin/classes", label: "Classes", icon: "classes" },
  { href: "/admin/subjects", label: "Subjects", icon: "subjects" },
  { href: "/admin/teacher-assignments", label: "Teacher Assignments", icon: "teacherAssignments" },
  { href: "/admin/assignments", label: "Assignments", icon: "assignments" },
  { href: "/admin/profile", label: "My Profile", icon: "profile" },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <NavShell items={items} roleLabel="Admin" roleTitle="System Administrator">
      {children}
    </NavShell>
  );
}
