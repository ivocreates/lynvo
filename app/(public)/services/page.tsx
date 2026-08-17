import Link from "next/link";
import SectionStamp from "@/components/ui/section-stamp";
import ArchiveCard from "@/components/ui/archive-card";
import { getServices } from "@/lib/queries";

export const metadata = { title: "Services" };

export default async function ServicesPage() {
  const services = await getServices();

  return (
    <div className="container-page py-20">
      <SectionStamp label="SERVICES" />
      <div className="grid gap-8 lg:grid-cols-[1fr_0.75fr] lg:items-end">
        <div>
          <h1 className="font-display text-3xl font-semibold text-ink-900 sm:text-4xl">What we do</h1>
          <p className="mt-4 max-w-2xl text-text-primary/80">
            Lynvo handles the full path from discovery to delivery: build, redesign, troubleshoot, secure, and grow.
          </p>
        </div>
        <p className="text-sm leading-6 text-text-primary/70">
          Every engagement is structured around the same studio rhythm: clarify the opportunity, design the system, ship the product, then keep improving it.
        </p>
      </div>
      <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {services.length > 0 ? (
          services.map((service) => (
            <Link key={service.id} href={`/services/${service.slug}`}>
              <ArchiveCard title={service.title} meta="SERVICE" imageUrl={service.image_url}>
                <p>{service.excerpt}</p>
                {service.tags?.length ? <p className="mt-3 text-xs uppercase tracking-[0.18em] text-brand-700">{service.tags.join(" / ")}</p> : null}
              </ArchiveCard>
            </Link>
          ))
        ) : (
          <p className="text-sm text-text-primary/60">
            No services published yet. Add rows to the `services` table to see them here.
          </p>
        )}
      </div>
      <div className="mt-12 rounded-card border border-border bg-surface p-6">
        <p className="section-stamp">PROCESS</p>
        <div className="mt-4 grid gap-4 sm:grid-cols-3">
          {[
            ["Discover", "We align on the problem, audience, and outcome."],
            ["Build", "We design and ship the system with care."],
            ["Iterate", "We measure, refine, and keep the platform moving."],
          ].map(([title, description]) => (
            <div key={title}>
              <p className="font-display text-lg font-semibold text-ink-900">{title}</p>
              <p className="mt-2 text-sm leading-6 text-text-primary/80">{description}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
