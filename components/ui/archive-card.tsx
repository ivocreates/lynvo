import { type ReactNode } from "react";

export default function ArchiveCard({
  title,
  meta,
  children,
  imageUrl,
}: {
  title: string;
  meta?: string;
  children?: ReactNode;
  imageUrl?: string | null;
}) {
  return (
    <div className="archive-card p-6">
      {imageUrl && <img src={imageUrl} alt="" className="mb-5 aspect-[16/9] w-full object-cover" />}
      {meta && <p className="section-stamp mb-2">{meta}</p>}
      <h3 className="font-display text-lg font-semibold text-ink-900">{title}</h3>
      {children && <div className="mt-2 text-sm text-text-primary/80">{children}</div>}
    </div>
  );
}
