import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { requirePermission, hasRole } from "@/lib/auth";
import { BILLING_CATEGORIES, formatMoney, packageSavings } from "@/lib/admin/billing";
import PageHeader from "@/components/admin/page-header";
import Flash from "@/components/admin/flash";
import SubmitButton from "@/components/admin/submit-button";
import { bulkAdjustPrices, quickUpdateItem, quickUpdatePackage } from "./actions";

type Item = {
  id: string;
  code: string | null;
  name: string;
  description: string | null;
  category: string;
  unit: string;
  unit_price: number;
  unit_price_intl: number;
  price_from: boolean;
  recurring: string;
  active: boolean;
};

type Pkg = {
  id: string;
  name: string;
  category: string;
  description: string | null;
  price_inr: number;
  price_intl: number;
  compare_inr?: number | null;
  compare_intl?: number | null;
  recurring: string;
  badge: string | null;
  active: boolean;
  includes: string[] | null;
};

const FILTER = "rounded-card border border-border bg-surface px-3 py-2 text-sm focus:border-brand-700 focus:outline-none";
const CELL = "w-24 rounded-card border border-border bg-canvas-warm px-2 py-1 text-right text-sm focus:border-brand-700 focus:outline-none";

export default async function CatalogPage({
  searchParams,
}: {
  searchParams: { tab?: string; q?: string; category?: string; cycle?: string; status?: string; sort?: string; saved?: string; bulk?: string; error?: string };
}) {
  const profile = await requirePermission("billing.manage");
  const isAdmin = hasRole(profile, "admin");
  const tab = searchParams.tab === "packages" ? "packages" : "services";
  const status = searchParams.status ?? "active";
  const here = `/admin/billing/catalog?${new URLSearchParams(
    Object.entries({ tab, q: searchParams.q ?? "", category: searchParams.category ?? "", cycle: searchParams.cycle ?? "", status, sort: searchParams.sort ?? "" }).filter(([, value]) => value)
  ).toString()}`;

  const supabase = createClient();
  const [{ data: itemRows }, packageResult] = await Promise.all([
    supabase.from("billing_items").select("id, code, name, description, category, unit, unit_price, unit_price_intl, price_from, recurring, active").order("order").limit(2000),
    supabase.from("billing_packages").select("*").order("order"),
  ]);

  const allItems = (itemRows ?? []) as Item[];
  const packages = (packageResult.data ?? []) as Pkg[];
  const term = (searchParams.q ?? "").trim().toLowerCase();

  let items = allItems.filter(
    (item) =>
      (status === "all" || (status === "active" ? item.active : !item.active)) &&
      (!searchParams.category || item.category === searchParams.category) &&
      (!searchParams.cycle || item.recurring === searchParams.cycle) &&
      (!term || `${item.name} ${item.code ?? ""} ${item.category} ${item.description ?? ""}`.toLowerCase().includes(term))
  );
  if (searchParams.sort === "price_asc") items = [...items].sort((a, b) => a.unit_price - b.unit_price);
  if (searchParams.sort === "price_desc") items = [...items].sort((a, b) => b.unit_price - a.unit_price);
  if (searchParams.sort === "name") items = [...items].sort((a, b) => a.name.localeCompare(b.name));

  const counts = new Map<string, number>();
  for (const item of allItems) counts.set(item.category, (counts.get(item.category) ?? 0) + 1);
  const categories = [...counts.keys()].sort(
    (a, b) => (BILLING_CATEGORIES as readonly string[]).indexOf(a) - (BILLING_CATEGORIES as readonly string[]).indexOf(b)
  );

  const grouped = new Map<string, Item[]>();
  for (const item of items) grouped.set(item.category, [...(grouped.get(item.category) ?? []), item]);

  return (
    <div>
      <PageHeader
        stamp="BILLING"
        title="Service catalog"
        description={`${allItems.length} services and ${packages.length} packages. Prices in INR for India and USD for international clients.`}
        action={{ href: tab === "packages" ? "/admin/billing-packages/new" : "/admin/billing-items/new", label: tab === "packages" ? "New package" : "New service" }}
      />

      <Flash
        success={searchParams.saved ? "Saved." : searchParams.bulk ? `Updated ${searchParams.bulk} price${searchParams.bulk === "1" ? "" : "s"}.` : null}
        error={searchParams.error ? (searchParams.error === "save" ? "Could not save." : searchParams.error) : null}
      />

      <div className="mb-6 flex flex-wrap items-center gap-2">
        {(["services", "packages"] as const).map((value) => (
          <Link
            key={value}
            href={`/admin/billing/catalog?tab=${value}`}
            className={`rounded-card px-3 py-1.5 text-sm ${tab === value ? "bg-ink-900 text-text-inverse" : "border border-border text-ink-900 hover:bg-canvas-warm"}`}
          >
            {value === "services" ? `Services (${allItems.length})` : `Packages (${packages.length})`}
          </Link>
        ))}
        <Link href="/admin/billing/offers" className="ml-auto rounded-card border border-border px-3 py-1.5 text-sm text-ink-900 hover:bg-canvas-warm">
          Offers &amp; promo codes
        </Link>
      </div>

      {tab === "services" ? (
        <>
          <form method="get" className="mb-4 flex flex-wrap items-center gap-2">
            <input type="hidden" name="tab" value="services" />
            <input name="q" defaultValue={searchParams.q ?? ""} placeholder="Search name, code or description..." className={`${FILTER} min-w-[16rem] flex-1`} />
            <select name="category" defaultValue={searchParams.category ?? ""} className={FILTER} aria-label="Category">
              <option value="">All categories</option>
              {categories.map((category) => (
                <option key={category} value={category}>
                  {category} ({counts.get(category)})
                </option>
              ))}
            </select>
            <select name="cycle" defaultValue={searchParams.cycle ?? ""} className={FILTER} aria-label="Billing cycle">
              <option value="">Any billing</option>
              <option value="one_time">One-time</option>
              <option value="monthly">Monthly</option>
              <option value="yearly">Yearly</option>
            </select>
            <select name="status" defaultValue={status} className={FILTER} aria-label="Status">
              <option value="active">Active</option>
              <option value="inactive">Hidden</option>
              <option value="all">All</option>
            </select>
            <select name="sort" defaultValue={searchParams.sort ?? ""} className={FILTER} aria-label="Sort">
              <option value="">Catalog order</option>
              <option value="price_asc">Price ↑</option>
              <option value="price_desc">Price ↓</option>
              <option value="name">Name A–Z</option>
            </select>
            <button type="submit" className="rounded-card bg-brand-700 px-4 py-2 text-sm font-medium text-text-inverse hover:bg-ink-900">
              Filter
            </button>
            <Link href="/admin/billing/catalog" className="text-sm text-text-primary/60 underline">
              Reset
            </Link>
          </form>

          <div className="mb-6 flex flex-wrap gap-1.5">
            {categories.map((category) => (
              <Link
                key={category}
                href={`/admin/billing/catalog?tab=services&category=${encodeURIComponent(category)}`}
                className={`rounded-full border px-3 py-1 text-xs ${
                  searchParams.category === category ? "border-brand-700 bg-brand-700 text-text-inverse" : "border-border bg-surface text-ink-900 hover:border-brand-700"
                }`}
              >
                {category} {counts.get(category)}
              </Link>
            ))}
          </div>

          {isAdmin && (
            <details className="mb-6 rounded-card border border-border bg-surface p-4">
              <summary className="cursor-pointer text-sm font-medium text-ink-900">Bulk price change</summary>
              <form action={bulkAdjustPrices} className="mt-4 flex flex-wrap items-end gap-3 text-sm">
                <input type="hidden" name="redirect_to" value={here} />
                <label>
                  <span className="block text-xs text-text-primary/60">Category</span>
                  <select name="category" defaultValue={searchParams.category ?? ""} className={FILTER}>
                    <option value="">Every service</option>
                    {categories.map((category) => (
                      <option key={category} value={category}>
                        {category}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  <span className="block text-xs text-text-primary/60">Change by %</span>
                  <input name="percent" type="number" step="0.5" placeholder="e.g. 10 or -5" required className={`${FILTER} w-32`} />
                </label>
                <label>
                  <span className="block text-xs text-text-primary/60">Prices</span>
                  <select name="scope" defaultValue="both" className={FILTER}>
                    <option value="both">India + international</option>
                    <option value="IN">India (INR) only</option>
                    <option value="INT">International (USD) only</option>
                  </select>
                </label>
                <label className="flex items-center gap-2 pb-2">
                  <input type="checkbox" name="round" defaultChecked className="h-4 w-4 accent-brand-700" />
                  Round to friendly prices (₹2,999 / $99)
                </label>
                <SubmitButton pendingLabel="Updating...">Apply</SubmitButton>
              </form>
            </details>
          )}

          {items.length === 0 ? (
            <div className="rounded-card border border-dashed border-border p-10 text-center text-sm text-text-primary/70">No services match these filters.</div>
          ) : (
            <div className="space-y-6">
              {[...grouped.entries()].map(([category, entries]) => (
                <section key={category} className="overflow-x-auto rounded-card border border-border bg-surface">
                  <h2 className="border-b border-border bg-canvas-warm px-4 py-2 text-sm font-semibold text-ink-900">
                    {category} <span className="font-normal text-text-primary/60">· {entries.length}</span>
                  </h2>
                  <table className="w-full min-w-[720px] text-left text-sm">
                    <tbody>
                      {entries.map((item) => (
                        <tr key={item.id} className={`border-b border-border last:border-0 ${item.active ? "" : "opacity-60"}`}>
                          <td className="px-4 py-2">
                            <Link href={`/admin/billing-items/${item.id}`} className="font-medium text-ink-900 hover:underline">
                              {item.name}
                            </Link>
                            <span className="block text-xs text-text-primary/60">
                              per {item.unit}
                              {item.recurring !== "one_time" ? ` · ${item.recurring}` : ""}
                              {item.price_from ? " · starting price" : ""}
                              {item.description ? ` · ${item.description}` : ""}
                            </span>
                          </td>
                          <td className="px-2 py-2" colSpan={4}>
                            <form action={quickUpdateItem} className="flex items-center justify-end gap-2">
                              <input type="hidden" name="id" value={item.id} />
                              <input type="hidden" name="redirect_to" value={`${here}#${item.id}`} />
                              <label className="flex items-center gap-1 text-xs text-text-primary/60" id={item.id}>
                                ₹
                                <input name="unit_price" type="number" step="0.01" min="0" defaultValue={Number(item.unit_price)} aria-label={`${item.name} INR price`} className={CELL} />
                              </label>
                              <label className="flex items-center gap-1 text-xs text-text-primary/60">
                                $
                                <input name="unit_price_intl" type="number" step="0.01" min="0" defaultValue={Number(item.unit_price_intl)} aria-label={`${item.name} USD price`} className={CELL} />
                              </label>
                              <label className="flex items-center gap-1 text-xs text-text-primary/70">
                                <input type="checkbox" name="active" defaultChecked={item.active} className="h-4 w-4 accent-brand-700" />
                                Active
                              </label>
                              <button type="submit" className="rounded-card border border-border px-2.5 py-1 text-xs hover:bg-canvas-warm">
                                Save
                              </button>
                            </form>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </section>
              ))}
            </div>
          )}
        </>
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {packages.map((pkg) => {
            const savingsIn = packageSavings(Number(pkg.price_inr), pkg.compare_inr);
            return (
              <div key={pkg.id} className={`rounded-card border border-border bg-surface p-5 ${pkg.active ? "" : "opacity-60"}`}>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <Link href={`/admin/billing-packages/${pkg.id}`} className="font-display text-lg font-semibold text-ink-900 hover:underline">
                      {pkg.name}
                    </Link>
                    <p className="text-xs text-text-primary/60">
                      {pkg.category}
                      {pkg.recurring !== "one_time" ? ` · ${pkg.recurring}` : ""} · {(pkg.includes ?? []).length} inclusions
                    </p>
                  </div>
                  <div className="text-right text-sm">
                    <p className="font-semibold text-ink-900">{formatMoney(Number(pkg.price_inr), "INR")}</p>
                    <p className="text-text-primary/60">{formatMoney(Number(pkg.price_intl), "USD")}</p>
                    {savingsIn && <p className="text-xs font-medium text-success">save {savingsIn.percent}%</p>}
                  </div>
                </div>
                <form action={quickUpdatePackage} className="mt-4 grid grid-cols-2 gap-3 text-xs sm:grid-cols-3">
                  <input type="hidden" name="id" value={pkg.id} />
                  <input type="hidden" name="redirect_to" value="/admin/billing/catalog?tab=packages" />
                  <label>
                    <span className="text-text-primary/60">Price ₹</span>
                    <input name="price_inr" type="number" step="0.01" min="0" defaultValue={Number(pkg.price_inr)} className={`${CELL} mt-1 w-full`} />
                  </label>
                  <label>
                    <span className="text-text-primary/60">Price $</span>
                    <input name="price_intl" type="number" step="0.01" min="0" defaultValue={Number(pkg.price_intl)} className={`${CELL} mt-1 w-full`} />
                  </label>
                  <label>
                    <span className="text-text-primary/60">Badge</span>
                    <input name="badge" defaultValue={pkg.badge ?? ""} placeholder="Most popular" className={`${CELL} mt-1 w-full text-left`} />
                  </label>
                  <label>
                    <span className="text-text-primary/60">Worth ₹ (shows savings)</span>
                    <input name="compare_inr" type="number" step="0.01" min="0" defaultValue={pkg.compare_inr ?? ""} className={`${CELL} mt-1 w-full`} />
                  </label>
                  <label>
                    <span className="text-text-primary/60">Worth $</span>
                    <input name="compare_intl" type="number" step="0.01" min="0" defaultValue={pkg.compare_intl ?? ""} className={`${CELL} mt-1 w-full`} />
                  </label>
                  <div className="flex items-end justify-between gap-2">
                    <label className="flex items-center gap-1 pb-1">
                      <input type="checkbox" name="active" defaultChecked={pkg.active} className="h-4 w-4 accent-brand-700" />
                      Active
                    </label>
                    <button type="submit" className="rounded-card border border-border px-2.5 py-1 hover:bg-canvas-warm">
                      Save
                    </button>
                  </div>
                </form>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
