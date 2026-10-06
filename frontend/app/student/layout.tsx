import { NavShell, type NavItem } from "@/components/nav-shell";

const items: NavItem[] = [{ href: "/student", label: "My Assignments", icon: "myAssignments" }];

export default function StudentLayout({ children }: { children: React.ReactNode }) {
  return (
    <NavShell items={items} roleLabel="Student" roleTitle="Student">
      {children}
    </NavShell>
  );
}
