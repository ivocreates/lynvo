import SectionStamp from "@/components/ui/section-stamp";

export const metadata = { title: "About" };

export default function AboutPage() {
  return (
    <div className="container-page py-20">
      <SectionStamp label="ABOUT LYNVO" />
      <h1 className="font-display text-3xl font-semibold text-ink-900">Our story</h1>
      <p className="mt-6 max-w-2xl text-text-primary/80">
        Lynvo was founded by Ivo Pereira, a Full-Stack Developer, Cybersecurity Analyst, and
        Web3 Engineer from Sawantwadi, India. We work at the intersection of technology, design,
        and product thinking to be the digital partner that actually ships things.
      </p>
      <div className="mt-12 grid max-w-3xl gap-8 border-t border-border pt-8 sm:grid-cols-3">
        <div><p className="section-stamp">2022</p><p className="mt-2 font-display font-semibold">Studio founded</p></div>
        <div><p className="section-stamp">2025</p><p className="mt-2 font-display font-semibold">Expanded to Web3</p></div>
        <div><p className="section-stamp">2026</p><p className="mt-2 font-display font-semibold">LYNVO v2 launched</p></div>
      </div>
    </div>
  );
}
