"use client";

import { useMemo, useState } from "react";
import { Check, Plus, Search, X } from "lucide-react";
import { formatMoney, packageSavings, type Region } from "@/lib/admin/billing";
import type { PackagePreset, PresetItem } from "./billing-form";

type Tab = "packages" | "services";
type Cycle = "" | "one_time" | "monthly" | "yearly";
type Sort = "recommended" | "price_asc" | "price_desc" | "name";

/** Price bands in INR; international bands are the same divided by 30. */
const BANDS = [
  { value: "", label: "Any price" },
  { value: "0-1000", label: "Under ₹1k / $35" },
  { value: "1000-5000", label: "₹1k–5k / $35–169" },
  { value: "5000-15000", label: "₹5k–15k / $169–499" },
  { value: "15000-", label: "₹15k+ / $499+" },
];

const chip = (active: boolean) =>
  `whitespace-nowrap rounded-full border px-3 py-1 text-xs transition-colors ${
    active ? "border-brand-700 bg-brand-700 text-text-inverse" : "border-border bg-surface text-ink-900 hover:border-brand-700"
  }`;

const select = "rounded-card border border-border bg-surface px-2 py-1.5 text-xs focus:border-brand-700 focus:outline-none";

export default function CatalogPicker({
  presets,
  packages,
  region,
  added,
  onAddItem,
  onAddPackage,
}: {
  presets: PresetItem[];
  packages: PackagePreset[];
  region: Region;
  /** Line names already on the document, with their quantity. */
  added: Map<string, number>;
  onAddItem: (id: string) => void;
  onAddPackage: (id: string) => void;
}) {
  const [open, setOpen] = useState(added.size === 0);
  const [tab, setTab] = useState<Tab>("packages");
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("");
  const [cycle, setCycle] = useState<Cycle>("");
  const [band, setBand] = useState("");
  const [sort, setSort] = useState<Sort>("recommended");
  const [limit, setLimit] = useState(24);

  const currency = region === "INT" ? "USD" : "INR";
  const factor = region === "INT" ? 30 : 1;
  const term = query.trim().toLowerCase();

  const inBand = (price: number) => {
    if (!band) return true;
    const [min, max] = band.split("-").map((value) => (value ? Number(value) / factor : undefined));
    return (min === undefined || price >= min) && (max === undefined || price < max);
  };

  const priceOf = (item: PresetItem) => (region === "INT" ? item.unit_price_intl : item.unit_price);
  const packagePrice = (item: PackagePreset) => (region === "INT" ? item.price_intl : item.price_inr);

  const matchingServices = useMemo(
    () =>
      presets.filter(
        (item) =>
          (!term || `${item.name} ${item.category ?? ""} ${item.description ?? ""} ${item.unit ?? ""}`.toLowerCase().includes(term)) &&
          (!cycle || item.recurring === cycle) &&
          inBand(priceOf(item))
      ),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [presets, term, cycle, band, region]
  );

  const matchingPackages = useMemo(
    () =>
      packages.filter(
        (item) =>
          (!term || `${item.name} ${item.category} ${item.description ?? ""} ${(item.includes ?? []).join(" ")}`.toLowerCase().includes(term)) &&
          (!cycle || item.recurring === cycle) &&
          inBand(packagePrice(item))
      ),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [packages, term, cycle, band, region]
  );

  const source = tab === "services" ? matchingServices : matchingPackages;
  const categories = useMemo(() => {
    const counts = new Map<string, number>();
    for (const item of source) {
      const key = item.category ?? "Other";
      counts.set(key, (counts.get(key) ?? 0) + 1);
    }
    return [...counts.entries()];
  }, [source]);

  const results = useMemo(() => {
    const filtered = source.filter((item) => !category || (item.category ?? "Other") === category);
    const price = (item: PresetItem | PackagePreset) => ("unit_price" in item ? priceOf(item) : packagePrice(item));
    if (sort === "price_asc") return [...filtered].sort((a, b) => price(a) - price(b));
    if (sort === "price_desc") return [...filtered].sort((a, b) => price(b) - price(a));
    if (sort === "name") return [...filtered].sort((a, b) => a.name.localeCompare(b.name));
    return filtered;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [source, category, sort, region]);

  const filtersActive = Boolean(term || category || cycle || band || sort !== "recommended");
  const reset = () => {
    setQuery("");
    setCategory("");
    setCycle("");
    setBand("");
    setSort("recommended");
    setLimit(24);
  };

  const suffix = (recurring: string) => (recurring === "monthly" ? "/mo" : recurring === "yearly" ? "/yr" : "");

  return (
    <div className="mt-4 rounded-card border border-border bg-canvas-warm/50">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left"
      >
        <span className="text-sm font-medium text-ink-900">
          Browse catalog
          <span className="ml-2 text-xs font-normal text-text-primary/60">
            {packages.length} packages · {presets.length} services · {region === "INT" ? "USD prices" : "INR prices"}
          </span>
        </span>
        <span className="text-xs text-brand-700">{open ? "Hide" : "Show"}</span>
      </button>

      {open && (
        <div className="border-t border-border p-4">
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex rounded-card border border-border bg-surface p-0.5 text-sm">
              {(["packages", "services"] as Tab[]).map((value) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => {
                    setTab(value);
                    setCategory("");
                    setLimit(24);
                  }}
                  className={`rounded-card px-3 py-1 ${tab === value ? "bg-ink-900 text-text-inverse" : "text-ink-900"}`}
                >
                  {value === "packages" ? `Packages (${matchingPackages.length})` : `Services (${matchingServices.length})`}
                </button>
              ))}
            </div>
            <label className="relative min-w-[14rem] flex-1">
              <span className="sr-only">Search the catalog</span>
              <Search aria-hidden="true" className="pointer-events-none absolute left-2.5 top-2.5 h-4 w-4 text-text-primary/40" />
              <input
                type="search"
                value={query}
                onChange={(event) => {
                  setQuery(event.target.value);
                  setLimit(24);
                }}
                placeholder="Search: logo, letterhead, SEO, hosting, e-commerce..."
                className="w-full rounded-card border border-border bg-surface py-2 pl-8 pr-3 text-sm focus:border-brand-700 focus:outline-none"
              />
            </label>
            <select value={cycle} onChange={(event) => setCycle(event.target.value as Cycle)} className={select} aria-label="Billing cycle">
              <option value="">Any billing</option>
              <option value="one_time">One-time</option>
              <option value="monthly">Monthly</option>
              <option value="yearly">Yearly</option>
            </select>
            <select value={band} onChange={(event) => setBand(event.target.value)} className={select} aria-label="Price range">
              {BANDS.map((entry) => (
                <option key={entry.value} value={entry.value}>
                  {entry.label}
                </option>
              ))}
            </select>
            <select value={sort} onChange={(event) => setSort(event.target.value as Sort)} className={select} aria-label="Sort">
              <option value="recommended">Recommended</option>
              <option value="price_asc">Price: low to high</option>
              <option value="price_desc">Price: high to low</option>
              <option value="name">Name A–Z</option>
            </select>
            {filtersActive && (
              <button type="button" onClick={reset} className="inline-flex items-center gap-1 text-xs text-brand-700 underline">
                <X aria-hidden="true" className="h-3 w-3" /> Clear
              </button>
            )}
          </div>

          {categories.length > 1 && (
            <div className="mt-3 flex gap-1.5 overflow-x-auto pb-1">
              <button type="button" onClick={() => setCategory("")} className={chip(!category)}>
                All {source.length}
              </button>
              {categories.map(([name, count]) => (
                <button key={name} type="button" onClick={() => setCategory(name === category ? "" : name)} className={chip(category === name)}>
                  {name} {count}
                </button>
              ))}
            </div>
          )}

          {results.length === 0 ? (
            <p className="mt-6 text-center text-sm text-text-primary/60">
              Nothing matches. {filtersActive && <button type="button" onClick={reset} className="text-brand-700 underline">Clear filters</button>}
            </p>
          ) : tab === "packages" ? (
            <ul className="mt-3 grid gap-3 md:grid-cols-2">
              {(results as PackagePreset[]).slice(0, limit).map((item) => {
                const price = packagePrice(item);
                const savings = packageSavings(price, region === "INT" ? item.compare_intl : item.compare_inr);
                const count = added.get(item.name) ?? 0;
                return (
                  <li key={item.id} className="flex flex-col rounded-card border border-border bg-surface p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-medium text-ink-900">
                          {item.name}
                          {item.badge && <span className="ml-2 rounded-full bg-brand-700 px-2 py-0.5 text-[10px] text-text-inverse">{item.badge}</span>}
                        </p>
                        <p className="text-xs text-text-primary/60">{item.category}</p>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold text-ink-900">
                          {formatMoney(price, currency)}
                          {item.price_from ? "+" : ""}
                          <span className="text-xs font-normal text-text-primary/60">{suffix(item.recurring)}</span>
                        </p>
                        {savings && (
                          <p className="text-xs">
                            <span className="text-text-primary/50 line-through">
                              {formatMoney(price + savings.amount, currency)}
                            </span>{" "}
                            <span className="font-medium text-success">save {savings.percent}%</span>
                          </p>
                        )}
                      </div>
                    </div>
                    {item.description && <p className="mt-2 text-xs text-text-primary/70">{item.description}</p>}
                    {(item.includes ?? []).length > 0 && (
                      <details className="mt-2 text-xs text-text-primary/70">
                        <summary className="cursor-pointer text-brand-700">{(item.includes ?? []).length} things included</summary>
                        <ul className="mt-1 list-disc pl-4">
                          {(item.includes ?? []).map((entry) => (
                            <li key={entry}>{entry}</li>
                          ))}
                        </ul>
                      </details>
                    )}
                    <button
                      type="button"
                      onClick={() => onAddPackage(item.id)}
                      className="mt-3 inline-flex items-center justify-center gap-1 self-start rounded-card bg-brand-700 px-3 py-1.5 text-xs font-medium text-text-inverse hover:bg-ink-900"
                    >
                      {count > 0 ? <Check aria-hidden="true" className="h-3.5 w-3.5" /> : <Plus aria-hidden="true" className="h-3.5 w-3.5" />}
                      {count > 0 ? `Added — add again` : "Add package"}
                    </button>
                  </li>
                );
              })}
            </ul>
          ) : (
            <ul className="mt-3 divide-y divide-border rounded-card border border-border bg-surface">
              {(results as PresetItem[]).slice(0, limit).map((item) => {
                const count = added.get(item.name) ?? 0;
                return (
                  <li key={item.id} className="flex items-center justify-between gap-3 px-3 py-2.5">
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-ink-900">{item.name}</p>
                      <p className="truncate text-xs text-text-primary/60">
                        {item.category}
                        {item.unit ? ` · per ${item.unit}` : ""}
                        {item.description ? ` · ${item.description}` : ""}
                      </p>
                    </div>
                    <div className="flex shrink-0 items-center gap-3">
                      <span className="text-sm text-ink-900">
                        {formatMoney(priceOf(item), currency)}
                        {item.price_from ? "+" : ""}
                        <span className="text-xs text-text-primary/60">{suffix(item.recurring)}</span>
                      </span>
                      <button
                        type="button"
                        onClick={() => onAddItem(item.id)}
                        aria-label={`Add ${item.name}`}
                        className={`inline-flex min-w-[4.5rem] items-center justify-center gap-1 rounded-card px-2.5 py-1 text-xs font-medium ${
                          count > 0 ? "border border-success/50 text-success" : "bg-brand-700 text-text-inverse hover:bg-ink-900"
                        }`}
                      >
                        {count > 0 ? `×${count} +1` : (<><Plus aria-hidden="true" className="h-3.5 w-3.5" /> Add</>)}
                      </button>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}

          {results.length > limit && (
            <button type="button" onClick={() => setLimit((value) => value + 48)} className="mt-3 w-full rounded-card border border-border py-2 text-sm text-brand-700 hover:bg-surface">
              Show {Math.min(48, results.length - limit)} more of {results.length - limit}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
