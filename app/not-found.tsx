import Link from "next/link";
import SectionStamp from "@/components/ui/section-stamp";

export default function NotFound() {
  return (
    <div className="container-page flex min-h-[60vh] flex-col items-center justify-center text-center">
      <SectionStamp label="404 / ROUTE NOT FOUND" />
      <h1 className="font-display text-3xl font-semibold text-ink-900">
        This page hasn&apos;t been built yet.
      </h1>
      <p className="mt-4 max-w-md text-text-primary/70">
        Try one of the main destinations below.
      </p>
      <div className="mt-6 flex gap-4">
        <Link href="/" className="text-brand-700 underline">
          Home
        </Link>
        <Link href="/archive" className="text-brand-700 underline">
          Work
        </Link>
        <Link href="/contact" className="text-brand-700 underline">
          Contact
        </Link>
      </div>
    </div>
  );
}
