import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { requirePermission, hasRole } from "@/lib/auth";
import { formatMoney, todayIso } from "@/lib/admin/billing";
import PageHeader from "@/components/admin/page-header";
import Flash from "@/components/admin/flash";
import SubmitButton from "@/components/admin/submit-button";
import ConfirmSubmit from "@/components/admin/confirm-submit";
import { deleteOffer, saveOffer } from "../catalog/actions";

type Offer = {
  id: string;
  code: string;
  title: string;
  description: string | null;
  kind: "percent" | "flat";
  value: number;
  categories: string[];
  min_subtotal: number;
  region: string;
  valid_from: string | null;
  valid_until: string | null;
  active: boolean;
};

const FIELD = "mt-1 w-full rounded-card border border-border bg-canvas-warm px-3 py-2 text-sm focus:border-brand-700 focus:outline-none";
const LABEL = "block text-xs uppercase tracking-[0.18em] text-text-primary/60";

function OfferForm({ offer, categories }: { offer?: Offer; categories: string[] }) {
  const key = offer?.id ?? "new";
  return (
    <form action={saveOffer} className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {offer && <input type="hidden" name="id" value={offer.id} />}
      <label>
        <span className={LABEL}>Code</span>
        <input name="code" required defaultValue={offer?.code ?? ""} placeholder="DIWALI15" className={`${FIELD} uppercase`} />
      </label>
      <label className="lg:col-span-3">
        <span className={LABEL}>Title</span>
        <input name="title" required defaultValue={offer?.title ?? ""} placeholder="Diwali offer" className={FIELD} />
      </label>
      <label>
        <span className={LABEL}>Type</span>
        <select name="kind" defaultValue={offer?.kind ?? "percent"} className={FIELD}>
          <option value="percent">Percent off</option>
          <option value="flat">Flat amount off</option>
        </select>
      </label>
      <label>
        <span className={LABEL}>Value</span>
        <input name="value" type="number" step="0.01" min="0" required defaultValue={offer?.value ?? ""} className={FIELD} />
      </label>
      <label>
        <span className={LABEL}>Minimum order</span>
        <input name="min_subtotal" type="number" step="1" min="0" defaultValue={offer?.min_subtotal ?? 0} className={FIELD} />
      </label>
      <label>
        <span className={LABEL}>Pricing</span>
        <select name="region" defaultValue={offer?.region ?? "all"} className={FIELD}>
          <option value="all">India &amp; international</option>
          <option value="IN">India only</option>
          <option value="INT">International only</option>
        </select>
      </label>
      <label>
        <span className={LABEL}>Starts</span>
        <input name="valid_from" type="date" defaultValue={offer?.valid_from ?? ""} className={FIELD} />
      </label>
      <label>
        <span className={LABEL}>Ends</span>
        <input name="valid_until" type="date" defaultValue={offer?.valid_until ?? ""} className={FIELD} />
      </label>
      <label className="sm:col-span-2">
        <span className={LABEL}>Description (shown to the team)</span>
        <input name="description" defaultValue={offer?.description ?? ""} className={FIELD} />
      </label>
      <fieldset className="sm:col-span-2 lg:col-span-4">
        <legend className={LABEL}>Applies to (leave empty for every one-time item)</legend>
        <div className="mt-2 flex flex-wrap gap-3">
          {categories.map((category) => (
            <label key={category} className="flex items-center gap-1.5 text-sm text-ink-900">
              <input type="checkbox" name="categories" value={category} defaultChecked={offer?.categories.includes(category)} className="h-4 w-4 accent-brand-700" />
              {category}
            </label>
          ))}
        </div>
      </fieldset>
      <div className="flex items-center gap-4 sm:col-span-2 lg:col-span-4">
        <label className="flex items-center gap-2 text-sm text-ink-900">
          <input type="checkbox" name="active" defaultChecked={offer?.active ?? true} className="h-4 w-4 accent-brand-700" id={`active-${key}`} />
          Active
        </label>
        <SubmitButton>{offer ? "Save offer" : "Create offer"}</SubmitButton>
      </div>
    </form>
  );
}

export default async function OffersPage({ searchParams }: { searchParams: { saved?: string; error?: string } }) {
  const profile = await requirePermission("billing.manage");
  const isAdmin = hasRole(profile, "admin");
  const today = todayIso();

  const supabase = createClient();
  const [{ data, error }, { data: itemRows }] = await Promise.all([
    supabase.from("billing_offers").select("*").order("active", { ascending: false }).order("code"),
    supabase.from("billing_items").select("category"),
  ]);
  const offers = (data ?? []) as Offer[];
  const categories = [...new Set(((itemRows ?? []) as { category: string }[]).map((row) => row.category))].sort();

  return (
    <div>
      <PageHeader stamp="BILLING" title="Offers & promo codes" description="Discounts you can apply to any quote or invoice in one click." />
      <Link href="/admin/billing/catalog" className="mb-6 inline-block text-sm text-brand-700 underline">
        Back to catalog
      </Link>
      <Flash success={searchParams.saved ? "Saved." : null} error={searchParams.error ?? (error ? "Offers are not set up yet. Run migration 0032_catalog_offers.sql." : null)} />

      <details className="mb-8 rounded-card border border-border bg-surface p-5" open={offers.length === 0}>
        <summary className="cursor-pointer font-display text-lg font-semibold text-ink-900">New offer</summary>
        <div className="mt-4">
          <OfferForm categories={categories} />
        </div>
      </details>

      <div className="space-y-3">
        {offers.map((offer) => {
          const expired = offer.valid_until && offer.valid_until < today;
          const upcoming = offer.valid_from && offer.valid_from > today;
          const state = !offer.active ? "Off" : expired ? "Expired" : upcoming ? "Scheduled" : "Live";
          return (
            <details key={offer.id} className="rounded-card border border-border bg-surface">
              <summary className="flex cursor-pointer flex-wrap items-center justify-between gap-3 p-4">
                <div>
                  <p className="font-medium text-ink-900">
                    <span className="mr-2 rounded bg-ink-900 px-2 py-0.5 font-mono text-xs text-text-inverse">{offer.code}</span>
                    {offer.title}
                  </p>
                  <p className="mt-1 text-xs text-text-primary/60">
                    {offer.kind === "percent" ? `${Number(offer.value)}% off` : `${formatMoney(Number(offer.value), "INR")} off`}
                    {offer.categories.length ? ` · ${offer.categories.join(", ")}` : " · everything one-time"}
                    {Number(offer.min_subtotal) > 0 ? ` · min ${formatMoney(Number(offer.min_subtotal), "INR")}` : ""}
                    {offer.region !== "all" ? ` · ${offer.region === "IN" ? "India" : "international"} only` : ""}
                    {offer.valid_until ? ` · until ${offer.valid_until}` : ""}
                  </p>
                </div>
                <span
                  className={`rounded-card px-2 py-0.5 text-xs ${
                    state === "Live" ? "bg-success/10 text-success" : state === "Scheduled" ? "bg-brand-700/10 text-brand-700" : "bg-border/50 text-text-primary/60"
                  }`}
                >
                  {state}
                </span>
              </summary>
              <div className="space-y-4 border-t border-border p-4">
                <OfferForm offer={offer} categories={categories} />
                {isAdmin && (
                  <form action={deleteOffer}>
                    <input type="hidden" name="id" value={offer.id} />
                    <ConfirmSubmit message={`Delete offer ${offer.code}?`} />
                  </form>
                )}
              </div>
            </details>
          );
        })}
      </div>
    </div>
  );
}
