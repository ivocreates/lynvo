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
      <h1 className="font-display text-3xl font-semibold text-ink-900">What we do</h1>
      <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {services.length > 0 ? (
          services.map((service) => (
            <Link key={service.id} href={`/services/${service.slug}`}>
              <ArchiveCard title={service.title} meta="SERVICE" imageUrl={service.image_url}>
                {service.excerpt}
              </ArchiveCard>
            </Link>
          ))
        ) : (
          <p className="text-sm text-text-primary/60">
            No services published yet. Add rows to the `services` table to see them here.
          </p>
        )}
      </div>
    </div>
  );
}
