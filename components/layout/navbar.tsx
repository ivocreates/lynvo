import Link from "next/link";

const links = [
  { href: "/about", label: "About" },
  { href: "/services", label: "Services" },
  { href: "/archive", label: "Work" },
  { href: "/blog", label: "Blog" },
  { href: "/team", label: "Team" },
  { href: "/reviews", label: "Reviews" },
  { href: "/contact", label: "Contact" },
];

export default function Navbar() {
  return (
    <header className="sticky top-0 z-40 border-b border-border bg-canvas-warm/90 backdrop-blur">
      <nav className="container-page flex h-16 items-center justify-between">
        <Link href="/" className="font-display text-lg font-semibold text-ink-900">
          LYNVO
        </Link>
        <ul className="hidden items-center gap-6 md:flex">
          {links.map((link) => (
            <li key={link.href}>
              <Link
                href={link.href}
                className="text-sm font-medium text-text-primary transition-colors hover:text-brand-700"
              >
                {link.label}
              </Link>
            </li>
          ))}
        </ul>
        <Link
          href="/contact"
          className="rounded-card bg-brand-700 px-4 py-2 text-sm font-medium text-text-inverse transition-colors hover:bg-ink-900"
        >
          Start a project
        </Link>
      </nav>
    </header>
  );
}
