"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  FolderKanban,
  Wrench,
  FileText,
  Users,
  Star,
  Inbox,
  Image as ImageIcon,
  BarChart3,
  Link2,
  Settings,
  ShieldCheck,
  ReceiptText,
  Package,
} from "lucide-react";
import type { Role } from "@/lib/auth";

const NAV: { href: string; label: string; icon: typeof LayoutDashboard; minRole?: Role }[] = [
  { href: "/admin", label: "Dashboard", icon: LayoutDashboard },
  { href: "/admin/projects", label: "Projects", icon: FolderKanban },
  { href: "/admin/services", label: "Services", icon: Wrench },
  { href: "/admin/blog", label: "Blog", icon: FileText },
  { href: "/admin/team", label: "Team", icon: Users },
  { href: "/admin/reviews", label: "Reviews", icon: Star },
  { href: "/admin/stats", label: "Statistics", icon: BarChart3 },
  { href: "/admin/social", label: "Social links", icon: Link2 },
  { href: "/admin/contacts", label: "Contacts", icon: Inbox, minRole: "admin" },
  { href: "/admin/billing", label: "Quotes & invoices", icon: ReceiptText },
  { href: "/admin/billing-items", label: "Billing items", icon: Package },
  { href: "/admin/media", label: "Media", icon: ImageIcon },
  { href: "/admin/settings", label: "Settings", icon: Settings, minRole: "admin" },
  { href: "/admin/admins", label: "Admins", icon: ShieldCheck, minRole: "super_admin" },
];

const ROLE_RANK: Record<Role, number> = { editor: 1, admin: 2, super_admin: 3 };

export default function Sidebar({ role }: { role: Role }) {
  const pathname = usePathname();

  const visible = NAV.filter(
    (item) => !item.minRole || ROLE_RANK[role] >= ROLE_RANK[item.minRole]
  );

  return (
    <nav aria-label="Admin" className="p-4">
      <ul className="space-y-1">
        {visible.map((item) => {
          const Icon = item.icon;
          const active =
            item.href === "/admin"
              ? pathname === "/admin"
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
