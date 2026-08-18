import Image from "next/image";
import Link from "next/link";
import logo from "@/assets/logo/Horizontal Logo/Light/Horizontal Logo Light Mode.png";
import { getSiteSettings, getSocialLinks } from "@/lib/queries";

const studioLinks = [
  ["About", "/about"],
  ["Team", "/team"],
  ["Careers", "/careers"],
  ["Blog", "/blog"],
  ["Contact", "/contact"],
] as const;

const serviceLinks = [
  ["Web Development", "/services/web-development"],
  ["UI/UX Design", "/services/ui-ux-brand-design"],
  ["Brand Identity", "/services/brand-identity-graphics"],
  ["SEO", "/services/seo-geo-optimization"],
  ["VAPT & Security", "/services/vapt-security-audits"],
  ["Web3 & Blockchain", "/services/web3-blockchain"],
] as const;

const workLinks = [
  ["Project Archive", "/archive"],
  ["Case Studies", "/archive"],
  ["Reviews", "/reviews"],
] as const;

export default async function Footer() {
  const [settingsRows, socialLinks] = await Promise.all([getSiteSettings(), getSocialLinks()]);
  const settings = Object.fromEntries(settingsRows.map((row) => [row.key, row.value?.text ?? ""]));
  const siteName = settings.site_name || "LYNVO";
  const tagline = settings.tagline || "Linking Ideas to Innovation";
  const footerCommand = settings.footer_command || "$ lynvo --status";
  const footerStatus = settings.footer_status || "Studio online";
  const responseTime = settings.response_time || "We respond within 24 hours with a thoughtful, personalized response - not a template.";
  const legalNote = settings.legal_note || "LYNVO Web Page © 2026 by Ivo Pereira is licensed under CC BY-NC-ND 4.0.";

  return (
    <footer className="border-t border-border bg-ink-900 text-text-inverse">
      <div className="container-page border-b border-white/10 py-4 text-xs font-mono uppercase tracking-[0.22em] text-text-inverse/70">
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-card border border-white/10 bg-white/5 px-4 py-3">
          <span>{footerCommand}</span>
          <span>{footerStatus}</span>
        </div>
      </div>
      <div className="container-page grid gap-10 py-14 md:grid-cols-[1.4fr_1fr_1fr_1.1fr]">
        <div>
          <Image src={logo} alt={siteName} width={176} height={50} className="h-10 w-auto" />
          <p className="mt-4 max-w-xs text-sm leading-6 text-text-inverse/70">{tagline}</p>
          <p className="mt-5 max-w-sm text-sm leading-6 text-text-inverse/60">{responseTime}</p>
          {settings.contact_email && (
            <a className="mt-4 block text-sm underline underline-offset-4" href={`mailto:${settings.contact_email}`}>
              {settings.contact_email}
            </a>
          )}
          {settings.address && <p className="mt-2 max-w-xs text-sm text-text-inverse/60">{settings.address}</p>}
        </div>
        <div>
          <p className="section-stamp text-text-inverse/60">Studio</p>
          <nav className="mt-4 grid gap-3 text-sm">
            {studioLinks.map(([label, href]) => (
              <Link key={href} href={href} className="hover:text-brand-300">
                {label}
              </Link>
            ))}
          </nav>
        </div>
        <div>
          <p className="section-stamp text-text-inverse/60">Services</p>
          <nav className="mt-4 grid gap-3 text-sm">
            {serviceLinks.map(([label, href]) => (
              <Link key={href} href={href} className="hover:text-brand-300">
                {label}
              </Link>
            ))}
          </nav>
        </div>
        <div>
          <p className="section-stamp text-text-inverse/60">Work</p>
          <nav className="mt-4 grid gap-3 text-sm">
            {workLinks.map(([label, href]) => (
              <Link key={href} href={href} className="hover:text-brand-300">
                {label}
              </Link>
            ))}
          </nav>
          <p className="mt-8 text-sm leading-6 text-text-inverse/60">No spam. Unsubscribe anytime.</p>
          <div className="mt-4 flex items-center gap-3 rounded-card border border-white/10 bg-white/5 p-2">
            <input
              aria-label="Email for updates"
              placeholder="your@email.com"
              className="min-w-0 flex-1 bg-transparent px-2 py-2 text-sm text-text-inverse placeholder:text-text-inverse/35 focus:outline-none"
            />
            <Link href="/contact" className="rounded-card bg-brand-700 px-4 py-2 text-sm font-medium text-text-inverse hover:bg-brand-500">
              submit →
            </Link>
          </div>
          <div className="mt-5 flex flex-wrap gap-x-4 gap-y-3 text-sm text-text-inverse/75">
            {socialLinks.map((link) => (
              <a key={link.id} href={link.url} target="_blank" rel="noreferrer" className="capitalize hover:text-brand-300">
                {link.platform}
              </a>
            ))}
          </div>
        </div>
      </div>
      <div className="container-page flex flex-col gap-2 border-t border-white/10 py-5 text-xs text-text-inverse/50 sm:flex-row sm:items-center sm:justify-between">
        <p>{settings.footer_note || "LYNVO STUDIO OS - v2.0 - Build 2026"}</p>
        <p>{legalNote}</p>
      </div>
    </footer>
  );
}
