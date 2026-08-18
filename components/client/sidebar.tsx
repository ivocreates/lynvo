"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, FileText, LifeBuoy } from "lucide-react";

const NAV = [
  { href: "/client", label: "Overview", icon: LayoutDashboard },
  { href: "/client/reports", label: "Reports", icon: FileText },
  { href: "/contact", label: "Get in touch", icon: LifeBuoy },
];

export default function ClientSidebar() {
  const pathname = usePathname();

  return (
    <nav aria-label="Client" className="p-4">
      <ul className="space-y-1">
        {NAV.map((item) => {
          const Icon = item.icon;
          const active =
            item.href === "/client" ? pathname === "/client" : pathname.startsWith(item.href);

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
