"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import { Menu, X } from "lucide-react";

/**
 * Phone header with a slide-out menu. Replaces the full sidebar that used to
 * sit above every page on small screens. Hidden from md up, where the
 * regular sidebar shows.
 */
export default function MobileShell({
  title,
  homeHref,
  stamp,
  nav,
  footer,
}: {
  title: string;
  homeHref: string;
  stamp: string;
  nav: ReactNode;
  footer?: ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  useEffect(() => setOpen(false), [pathname]);

  useEffect(() => {
    if (!open) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (event: KeyboardEvent) => event.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = previous;
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <>
      <header className="sticky top-0 z-40 flex h-14 items-center gap-2 border-b border-border bg-surface/95 px-2 backdrop-blur print:hidden md:hidden">
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-label="Open menu"
          aria-expanded={open}
          className="inline-flex h-11 w-11 items-center justify-center rounded-card text-ink-900 hover:bg-canvas-warm"
        >
          <Menu aria-hidden className="h-5 w-5" />
        </button>
        <Link href={homeHref} className="font-display text-base font-semibold text-ink-900">
          {title}
        </Link>
      </header>

      <div
        className={`fixed inset-0 z-50 print:hidden md:hidden ${open ? "" : "pointer-events-none"}`}
        aria-hidden={!open}
      >
        <div
          onClick={() => setOpen(false)}
          className={`absolute inset-0 bg-ink-900/50 transition-opacity duration-200 ${open ? "opacity-100" : "opacity-0"}`}
        />
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Menu"
          // Tapping a link for the page you're already on doesn't change the path, so close explicitly.
          onClick={(event) => (event.target as HTMLElement).closest("a") && setOpen(false)}
          className={`absolute inset-y-0 left-0 flex w-[85%] max-w-xs flex-col bg-ink-900 shadow-xl transition-transform duration-200 ${
            open ? "translate-x-0" : "-translate-x-full"
          }`}
        >
          <div className="flex items-center justify-between border-b border-white/10 p-4">
            <div>
              <p className="font-display text-lg font-semibold text-text-inverse">LYNVO</p>
              <p className="section-stamp mt-0.5 text-text-inverse/50">{stamp}</p>
            </div>
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label="Close menu"
              className="inline-flex h-10 w-10 items-center justify-center rounded-card text-text-inverse hover:bg-white/10"
            >
              <X aria-hidden className="h-5 w-5" />
            </button>
          </div>
          <div className="flex-1 overflow-y-auto overscroll-contain">{nav}</div>
          {footer && <div className="border-t border-white/10 p-4">{footer}</div>}
        </div>
      </div>
    </>
  );
}
