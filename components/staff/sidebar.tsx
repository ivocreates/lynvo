"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, Users, UserCog, ListChecks, Target, FileText, FolderLock, ReceiptText } from "lucide-react";
import { ROLE_RANK, type Role } from "@/lib/roles";

const NAV: { href: string; label: string; icon: typeof LayoutDashboard; minRole?: Role }[] = [
  { href: "/staff", label: "Overview", icon: LayoutDashboard },
  { href: "/staff/tasks", label: "My tasks", icon: ListChecks },
  { href: "/staff/quotes", label: "My quotes", icon: ReceiptText },
  { href: "/staff/goals", label: "Goals", icon: Target },
  { href: "/staff/notes", label: "Notes", icon: FileText },
  { href: "/staff/documents", label: "My documents", icon: FolderLock },
  { href: "/staff/directory", label: "Directory", icon: Users },
  { href: "/staff/profile", label: "My profile", icon: UserCog },
];

export default function StaffSidebar({ role }: { role: Role }) {
  const pathname = usePathname();
  const visible = NAV.filter((item) => !item.minRole || ROLE_RANK[role] >= ROLE_RANK[item.minRole]);

  return (
    <nav aria-label="Staff" className="p-4">
      <ul className="space-y-1">
        {visible.map((item) => {
          const Icon = item.icon;
          const active =
            item.href === "/staff"
              ? pathname === "/staff"
              : pathname === item.href || pathname.startsWith(`${item.href}/`);

          return (
            <li key={item.href}>
              <Link
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={`flex items-center gap-3 rounded-card px-3 py-2 text-sm transition-colors ${
                  active
                    ? "bg-brand-700 text-text-inverse"
                    : "text-text-inverse/70 hover:bg-white/10 hover:text-text-inverse"
                }`}
              >
                <Icon aria-hidden="true" className="h-4 w-4 shrink-0" />
                {item.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
