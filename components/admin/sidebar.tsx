"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
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
  Layers,
  Briefcase,
  HelpCircle,
  ListChecks,
  CalendarClock,
  FileSignature,
  Award,
  Building2,
  ChevronDown,
} from "lucide-react";
import { ROLE_RANK, type Role } from "@/lib/roles";

type Icon = typeof LayoutDashboard;
type NavItem = { href: string; label: string; icon: Icon; minRole?: Role };
type NavGroup = { key: string; label: string; icon: Icon; items: NavItem[] };

const STANDALONE: NavItem[] = [{ href: "/admin", label: "Dashboard", icon: LayoutDashboard }];

const GROUPS: NavGroup[] = [
  {
    key: "content",
    label: "Content management",
    icon: FolderKanban,
    items: [
      { href: "/admin/projects", label: "Projects", icon: FolderKanban },
      { href: "/admin/services", label: "Services", icon: Wrench },
      { href: "/admin/blog", label: "Blog", icon: FileText },
      { href: "/admin/team", label: "Team", icon: Users },
      { href: "/admin/careers", label: "Careers", icon: Briefcase },
      { href: "/admin/faqs", label: "FAQs", icon: HelpCircle },
      { href: "/admin/reviews", label: "Reviews", icon: Star },
      { href: "/admin/stats", label: "Statistics", icon: BarChart3 },
      { href: "/admin/social", label: "Social links", icon: Link2 },
    ],
  },
  {
    key: "clients",
    label: "Clients",
    icon: Building2,
    items: [
      { href: "/admin/clients", label: "Clients", icon: Building2 },
      { href: "/admin/contacts", label: "Contacts", icon: Inbox, minRole: "admin" },
    ],
  },
  {
    key: "billing",
    label: "Billing",
    icon: ReceiptText,
    items: [
      { href: "/admin/billing", label: "Quotes & invoices", icon: ReceiptText },
      { href: "/admin/billing-items", label: "Service catalog", icon: Package },
      { href: "/admin/billing-packages", label: "Package presets", icon: Layers },
    ],
  },
  {
    key: "hr",
    label: "Team & HR",
    icon: FileSignature,
    items: [
      { href: "/admin/tasks", label: "Tasks", icon: ListChecks, minRole: "junior_partner" },
      { href: "/admin/meetings", label: "Meetings", icon: CalendarClock, minRole: "junior_partner" },
      { href: "/admin/documents", label: "HR documents", icon: FileSignature, minRole: "junior_partner" },
      { href: "/admin/certificates", label: "Certificates", icon: Award, minRole: "junior_partner" },
      { href: "/admin/admins", label: "People", icon: ShieldCheck, minRole: "junior_partner" },
    ],
  },
  {
    key: "system",
    label: "Media & settings",
    icon: Settings,
    items: [
      { href: "/admin/media", label: "Media", icon: ImageIcon },
      { href: "/admin/settings", label: "Settings", icon: Settings, minRole: "admin" },
    ],
  },
];

const TRAILING: NavItem[] = [{ href: "/staff", label: "Team workspace", icon: Users }];

const STORAGE_KEY = "lynvo-admin-nav-open";

function isActive(pathname: string, href: string) {
  return href === "/admin" ? pathname === "/admin" : pathname === href || pathname.startsWith(`${href}/`);
}

function linkClass(active: boolean) {
  return `flex items-center gap-3 rounded-card px-3 py-2 text-sm transition-colors ${
    active ? "bg-brand-700 text-text-inverse" : "text-text-inverse/70 hover:bg-white/10 hover:text-text-inverse"
  }`;
}

export default function Sidebar({ role }: { role: Role }) {
  const pathname = usePathname();
  const visible = (item: NavItem) => !item.minRole || ROLE_RANK[role] >= ROLE_RANK[item.minRole];

  const groups = GROUPS.map((group) => ({ ...group, items: group.items.filter(visible) })).filter(
    (group) => group.items.length > 0
  );

  const activeGroupKey = groups.find((group) => group.items.some((item) => isActive(pathname, item.href)))?.key;

  const [openGroups, setOpenGroups] = useState<Set<string>>(() => new Set(activeGroupKey ? [activeGroupKey] : []));

  // Expand whichever group the user navigates into; keep manually opened groups open too.
  useEffect(() => {
    if (activeGroupKey) setOpenGroups((current) => new Set(current).add(activeGroupKey));
  }, [activeGroupKey]);

  useEffect(() => {
    const saved = window.localStorage.getItem(STORAGE_KEY);
    if (!saved) return;
    try {
      setOpenGroups((current) => new Set([...current, ...(JSON.parse(saved) as string[])]));
    } catch {
      // Ignore malformed storage.
    }
  }, []);

  function toggleGroup(key: string) {
    setOpenGroups((current) => {
      const next = new Set(current);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify([...next]));
      return next;
    });
  }

  return (
    <nav aria-label="Admin" className="p-4">
      <ul className="space-y-1">
        {STANDALONE.filter(visible).map((item) => {
          const Icon = item.icon;
          const active = isActive(pathname, item.href);
          return (
            <li key={item.href}>
              <Link href={item.href} aria-current={active ? "page" : undefined} className={linkClass(active)}>
                <Icon aria-hidden="true" className="h-4 w-4 shrink-0" />
                {item.label}
              </Link>
            </li>
          );
        })}
      </ul>

      <ul className="mt-2 space-y-1">
        {groups.map((group) => {
          const GroupIcon = group.icon;
          const open = openGroups.has(group.key);
          const groupActive = group.items.some((item) => isActive(pathname, item.href));

          return (
            <li key={group.key}>
              <button
                type="button"
                onClick={() => toggleGroup(group.key)}
                aria-expanded={open}
                className={`flex w-full items-center gap-3 rounded-card px-3 py-2 text-sm font-medium transition-colors ${
                  groupActive && !open
                    ? "text-text-inverse"
                    : "text-text-inverse/80 hover:bg-white/10 hover:text-text-inverse"
                }`}
              >
                <GroupIcon aria-hidden="true" className="h-4 w-4 shrink-0" />
                <span className="flex-1 text-left">{group.label}</span>
                <ChevronDown
                  aria-hidden="true"
                  className={`h-3.5 w-3.5 shrink-0 transition-transform ${open ? "rotate-180" : ""}`}
                />
              </button>

              {open && (
                <ul className="mt-1 space-y-1 border-l border-white/10 pl-4">
                  {group.items.map((item) => {
                    const Icon = item.icon;
                    const active = isActive(pathname, item.href);
                    return (
                      <li key={item.href}>
                        <Link href={item.href} aria-current={active ? "page" : undefined} className={linkClass(active)}>
                          <Icon aria-hidden="true" className="h-4 w-4 shrink-0" />
                          {item.label}
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              )}
            </li>
          );
        })}
      </ul>

      <ul className="mt-2 space-y-1 border-t border-white/10 pt-2">
        {TRAILING.filter(visible).map((item) => {
          const Icon = item.icon;
          const active = isActive(pathname, item.href);
          return (
            <li key={item.href}>
              <Link href={item.href} aria-current={active ? "page" : undefined} className={linkClass(active)}>
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
