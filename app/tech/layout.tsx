import Image from "next/image";
import Link from "next/link";
import type { Metadata } from "next";
import logo from "@/assets/logo/Horizontal Logo/Light/Horizontal Logo Light Mode.png";
import { getTechUrl } from "@/lib/env";
import { getSiteSettings, settingsMap } from "@/lib/queries";
import { studioHref, techHref } from "@/lib/tech-site";

export const metadata: Metadata = {
  metadataBase: new URL(getTechUrl()),
  title: {
    default: "LYNVO Tech — Custom software & cybersecurity for small businesses",
    template: "%s · LYNVO Tech",
  },
  description:
    "LYNVO Tech builds custom business software, web apps and AI automation for small businesses, and protects them with VAPT, security audits and monitoring.",
  keywords: ["custom software", "small business software", "VAPT", "cybersecurity", "web application development", "AI automation", "India"],
  alternates: { canonical: "/" },
  openGraph: { siteName: "LYNVO Tech", type: "website" },
};

export default async function TechLayout({ children }: { children: React.ReactNode }) {
  const settings = settingsMap(await getSiteSettings());
  const links = [
    { href: techHref("/services"), label: "Services" },
    { href: techHref("/products"), label: "Solutions" },
    { href: techHref("/security"), label: "Cybersecurity" },
    { href: techHref("/work"), label: "Work" },
  ];
  const contactEmail = settings.tech_contact_email || settings.contact_email;

  return (
    <div className="flex min-h-screen flex-col bg-canvas-warm">
      <header className="sticky top-0 z-40 border-b border-white/10 bg-ink-900/95 text-text-inverse backdrop-blur">
        <nav className="container-page flex h-16 items-center justify-between gap-6">
          <Link href={techHref("/")} className="flex items-center gap-2">
            <Image src={logo} alt="LYNVO" width={120} height={34} className="h-8 w-auto brightness-0 invert" priority />
            <span className="rounded border border-white/30 px-1.5 py-0.5 font-mono text-[11px] tracking-widest">TECH</span>
          </Link>
          <ul className="hidden items-center gap-6 md:flex">
            {links.map((link) => (
              <li key={link.href}>
                <Link href={link.href} className="text-sm text-text-inverse/80 hover:text-text-inverse">
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
          <Link
            href={techHref("/contact")}
            className="rounded-card bg-sage-500 px-4 py-2 text-sm font-medium text-ink-900 transition-colors hover:bg-text-inverse"
          >
            {settings.tech_primary_cta || "Book a free consultation"}
          </Link>
        </nav>
        <ul className="container-page flex gap-5 overflow-x-auto pb-3 text-sm md:hidden">
          {links.map((link) => (
            <li key={link.href}>
              <Link href={link.href} className="whitespace-nowrap text-text-inverse/80">
                {link.label}
              </Link>
            </li>
          ))}
        </ul>
      </header>

      <main className="flex-1">{children}</main>

      <footer className="border-t border-white/10 bg-ink-900 text-text-inverse">
        <div className="container-page grid gap-10 py-14 md:grid-cols-[1.4fr_1fr_1fr]">
          <div>
            <p className="font-display text-xl font-semibold">
              LYNVO <span className="font-mono text-sm tracking-widest text-sage-500">TECH</span>
            </p>
            <p className="mt-3 max-w-sm text-sm leading-6 text-text-inverse/70">
              {settings.tech_tagline || "Software & security for small businesses."} A division of LYNVO Creative Solutions LLP.
            </p>
            {contactEmail && (
              <a href={`mailto:${contactEmail}`} className="mt-4 block text-sm underline underline-offset-4">
                {contactEmail}
              </a>
            )}
          </div>
          <div>
            <p className="section-stamp text-text-inverse/60">Explore</p>
            <ul className="mt-3 space-y-2 text-sm text-text-inverse/80">
              {links.map((link) => (
                <li key={link.href}>
                  <Link href={link.href} className="hover:text-text-inverse">
                    {link.label}
                  </Link>
                </li>
              ))}
              <li>
                <Link href={techHref("/contact")} className="hover:text-text-inverse">
                  Contact
                </Link>
              </li>
            </ul>
          </div>
          <div>
            <p className="section-stamp text-text-inverse/60">Going online?</p>
            <p className="mt-3 text-sm leading-6 text-text-inverse/70">
              Websites, brand identity and online presence are handled by our studio.
            </p>
            <a href={studioHref("/")} className="mt-3 inline-block text-sm underline underline-offset-4">
              Visit lynvo.studio →
            </a>
          </div>
        </div>
        <div className="container-page border-t border-white/10 py-5 text-xs text-text-inverse/50">
          © {new Date().getFullYear()} LYNVO Creative Solutions LLP. All rights reserved.
        </div>
      </footer>
    </div>
  );
}
