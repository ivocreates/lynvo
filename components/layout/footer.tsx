import Link from "next/link";
import Image from "next/image";
import logo from "@/assets/logo/Horizontal Logo/Light/Horizontal Logo Light Mode.png";
import { getSiteSettings, getSocialLinks } from "@/lib/queries";

const footerLinks = [["Studio", "/about"], ["Team", "/team"], ["Blog", "/blog"], ["Contact", "/contact"], ["Services", "/services"], ["Work", "/archive"]] as const;

export default async function Footer() {
  const [settingsRows, socialLinks] = await Promise.all([getSiteSettings(), getSocialLinks()]);
  const settings = Object.fromEntries(settingsRows.map((row) => [row.key, row.value?.text ?? ""]));
  const siteName = settings.site_name || "LYNVO";
  const tagline = settings.tagline || "Linking Ideas to Innovation";

  return (
    <footer className="border-t border-border bg-ink-900 text-text-inverse">
      <div className="container-page grid gap-10 py-14 md:grid-cols-[1.5fr_1fr_1fr]">
        <div>
          <Image src={logo} alt={siteName} width={150} height={42} className="h-9 w-auto" />
          <p className="mt-4 max-w-xs text-sm leading-6 text-text-inverse/70">{tagline}</p>
          {settings.contact_email && <a className="mt-4 block text-sm underline" href={`mailto:${settings.contact_email}`}>{settings.contact_email}</a>}
          {settings.address && <p className="mt-2 max-w-xs text-sm text-text-inverse/60">{settings.address}</p>}
        </div>
        <div>
          <p className="section-stamp text-text-inverse/60">Explore</p>
          <nav className="mt-4 grid grid-cols-2 gap-3 text-sm">{footerLinks.map(([label, href]) => <Link key={href} href={href} className="hover:text-brand-300">{label}</Link>)}</nav>
        </div>
        <div>
          <p className="section-stamp text-text-inverse/60">Connect</p>
          <div className="mt-4 flex flex-wrap gap-x-4 gap-y-3 text-sm">{socialLinks.map((link) => <a key={link.id} href={link.url} target="_blank" rel="noreferrer" className="capitalize hover:text-brand-300">{link.platform}</a>)}</div>
        </div>
      </div>
      <div className="container-page flex flex-col gap-2 border-t border-white/10 py-5 text-xs text-text-inverse/50 sm:flex-row sm:items-center sm:justify-between">
        <p>{settings.footer_note || "LYNVO DIGITAL STUDIO"}</p>
        <p>&copy; {new Date().getFullYear()} by Ivo Pereira. CC BY-NC-ND 4.0.</p>
      </div>
    </footer>
  );
}
