import Link from "next/link";

type Stat = { label: string; value: string; suffix: string | null };

/**
 * Studio home hero. Headline copy comes from Site copy; the part after an
 * em dash (or the last three words) is highlighted.
 */
export default function Hero({
  kicker,
  headline,
  description,
  primaryCta,
  secondaryCta,
  stats,
  showcaseImage,
  showcaseTitle,
}: {
  kicker: string;
  headline: string;
  description: string;
  primaryCta: string;
  secondaryCta: string;
  stats: Stat[];
  showcaseImage: string | null;
  showcaseTitle: string | null;
}) {
  const [lead, accent] = splitHeadline(headline);

  return (
    <section className="relative overflow-hidden border-b border-border">
      {/* Background: soft brand glow over a faint grid. */}
      <div aria-hidden="true" className="pointer-events-none absolute inset-0">
        <div className="absolute -left-40 -top-40 h-[32rem] w-[32rem] rounded-full bg-brand-500/20 blur-3xl" />
        <div className="absolute -right-32 top-24 h-[28rem] w-[28rem] rounded-full bg-sand-400/40 blur-3xl" />
        <div
          className="absolute inset-0 opacity-[0.35]"
          style={{
            backgroundImage:
              "linear-gradient(to right, rgba(28,46,58,0.07) 1px, transparent 1px), linear-gradient(to bottom, rgba(28,46,58,0.07) 1px, transparent 1px)",
            backgroundSize: "48px 48px",
            maskImage: "radial-gradient(ellipse at 30% 30%, black 40%, transparent 75%)",
          }}
        />
      </div>

      <div className="container-page relative grid gap-14 py-16 lg:grid-cols-[1.1fr_0.9fr] lg:items-center lg:py-24">
        <div>
          <p className="inline-flex items-center gap-2 rounded-full border border-border bg-surface/80 px-3 py-1 font-mono text-[11px] uppercase tracking-[0.18em] text-brand-700 backdrop-blur">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-success opacity-60" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-success" />
            </span>
            {kicker}
          </p>

          <h1 className="mt-6 max-w-3xl font-display text-[2.6rem] font-semibold leading-[1.05] tracking-tight text-ink-900 sm:text-6xl lg:text-[4.25rem]">
            {lead}{" "}
            {accent && (
              <span className="bg-gradient-to-r from-brand-700 via-brand-500 to-clay-500 bg-clip-text text-transparent">{accent}</span>
            )}
          </h1>

          <p className="mt-6 max-w-xl text-lg leading-8 text-text-primary/80">{description}</p>

          <div className="mt-9 flex flex-wrap items-center gap-3">
            <Link
              href="/contact"
              className="group inline-flex items-center gap-2 rounded-card bg-ink-900 px-6 py-3.5 text-sm font-medium text-text-inverse shadow-lg shadow-ink-900/15 transition hover:bg-brand-700"
            >
              {primaryCta}
              <span aria-hidden="true" className="transition-transform group-hover:translate-x-0.5">→</span>
            </Link>
            <Link
              href="/archive"
              className="rounded-card border border-border bg-surface/70 px-6 py-3.5 text-sm font-medium text-ink-900 backdrop-blur hover:bg-surface"
            >
              {secondaryCta}
            </Link>
          </div>

          <ul className="mt-8 flex flex-wrap gap-2 text-sm">
            {["Websites", "Brand identity", "Google & SEO", "Social media", "AI automation"].map((chip) => (
              <li key={chip} className="rounded-full border border-border bg-surface/70 px-3 py-1 text-ink-900">
                {chip}
              </li>
            ))}
          </ul>

          {stats.length > 0 && (
            <dl className="mt-10 grid max-w-lg grid-cols-3 gap-6 border-t border-border pt-6">
              {stats.slice(0, 3).map((stat) => (
                <div key={stat.label}>
                  <dt className="sr-only">{stat.label}</dt>
                  <dd className="font-display text-3xl font-semibold text-ink-900">
                    {stat.value}
                    <span className="text-brand-500">{stat.suffix}</span>
                  </dd>
                  <p className="mt-1 text-xs uppercase tracking-[0.14em] text-text-primary/60">{stat.label}</p>
                </div>
              ))}
            </dl>
          )}
        </div>

        {/* Showcase: browser mock-up with the latest featured project and two floating proof cards. */}
        <div className="relative mx-auto w-full max-w-xl lg:mx-0">
          <div className="rotate-[1.5deg] overflow-hidden rounded-xl border border-border bg-surface shadow-2xl shadow-ink-900/15">
            <div className="flex items-center gap-1.5 border-b border-border bg-canvas-warm px-4 py-3">
              <span className="h-2.5 w-2.5 rounded-full bg-error/60" />
              <span className="h-2.5 w-2.5 rounded-full bg-warning/70" />
              <span className="h-2.5 w-2.5 rounded-full bg-success/70" />
              <span className="ml-3 flex-1 truncate rounded bg-surface px-3 py-1 font-mono text-[11px] text-text-primary/60">
                https://your-business.com
              </span>
            </div>
            {showcaseImage ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={showcaseImage} alt={showcaseTitle ?? "Recent project"} className="aspect-[4/3] w-full object-cover" />
            ) : (
              <div className="aspect-[4/3] bg-gradient-to-br from-brand-700 via-brand-500 to-ink-900 p-8">
                <div className="h-3 w-24 rounded bg-white/40" />
                <div className="mt-8 h-6 w-3/4 rounded bg-white/80" />
                <div className="mt-3 h-6 w-1/2 rounded bg-white/60" />
                <div className="mt-6 h-3 w-2/3 rounded bg-white/30" />
                <div className="mt-2 h-3 w-1/2 rounded bg-white/30" />
                <div className="mt-8 flex gap-3">
                  <div className="h-9 w-28 rounded bg-sand-400" />
                  <div className="h-9 w-24 rounded border border-white/50" />
                </div>
              </div>
            )}
          </div>

          <div className="absolute -bottom-8 -left-4 w-52 -rotate-2 rounded-xl border border-border bg-surface p-4 shadow-xl sm:-left-10">
            <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-text-primary/60">Brand identity kit</p>
            <div className="mt-3 flex gap-1.5">
              {["bg-ink-900", "bg-brand-700", "bg-brand-500", "bg-sand-400", "bg-clay-500"].map((swatch) => (
                <span key={swatch} className={`h-6 w-6 rounded-full ring-2 ring-surface ${swatch}`} />
              ))}
            </div>
            <p className="mt-3 text-xs text-text-primary/70">Logo · Business card · Letterhead · Social kit</p>
          </div>

          <div className="absolute -right-3 -top-6 w-48 rotate-3 rounded-xl border border-border bg-surface p-4 shadow-xl sm:-right-8">
            <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-text-primary/60">Found on Google</p>
            <svg viewBox="0 0 120 40" className="mt-2 h-10 w-full" aria-hidden="true">
              <polyline points="0,34 20,30 40,31 60,22 80,18 100,9 120,4" fill="none" stroke="currentColor" strokeWidth="3" className="text-success" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            <p className="text-xs text-text-primary/70">More enquiries, month after month</p>
          </div>
        </div>
      </div>
    </section>
  );
}

function splitHeadline(headline: string): [string, string] {
  const dash = headline.split(/\s+[—–-]\s+/);
  if (dash.length > 1) return [`${dash[0]} —`, dash.slice(1).join(" — ")];
  const words = headline.trim().split(/\s+/);
  if (words.length <= 4) return [headline, ""];
  return [words.slice(0, -3).join(" "), words.slice(-3).join(" ")];
}
