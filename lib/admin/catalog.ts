import "server-only";

import { createClient } from "@/lib/supabase/server";
import type { PackagePreset, PresetItem } from "@/components/admin/billing-form";

const ITEM_COLUMNS =
  "id, name, description, category, unit, unit_price, unit_price_intl, price_from, recurring, tax_rate, hsn_sac";

const PACKAGE_COLUMNS =
  "id, name, description, category, price_inr, price_intl, price_from, recurring, includes, badge";

function toNumber(value: unknown) {
  return Number(value ?? 0) || 0;
}

/** Catalogue services and package presets used by the quote/invoice editor. */
export async function getCatalog() {
  const supabase = createClient();

  const [{ data: itemRows }, { data: packageRows }] = await Promise.all([
    supabase.from("billing_items").select(ITEM_COLUMNS).eq("active", true).order("order", { ascending: true }),
    supabase.from("billing_packages").select(PACKAGE_COLUMNS).eq("active", true).order("order", { ascending: true }),
  ]);

  const presets: PresetItem[] = ((itemRows ?? []) as Record<string, unknown>[]).map((row) => ({
    id: String(row.id),
    name: String(row.name),
    description: (row.description as string) ?? null,
    category: (row.category as string) ?? null,
    unit: (row.unit as string) ?? null,
    unit_price: toNumber(row.unit_price),
    unit_price_intl: toNumber(row.unit_price_intl),
    price_from: Boolean(row.price_from),
    recurring: (row.recurring as PresetItem["recurring"]) ?? "one_time",
    tax_rate: toNumber(row.tax_rate),
    hsn_sac: (row.hsn_sac as string) ?? null,
  }));

  const packages: PackagePreset[] = ((packageRows ?? []) as Record<string, unknown>[]).map((row) => ({
    id: String(row.id),
    name: String(row.name),
    description: (row.description as string) ?? null,
    category: String(row.category ?? "Package"),
    price_inr: toNumber(row.price_inr),
    price_intl: toNumber(row.price_intl),
    price_from: Boolean(row.price_from),
    recurring: (row.recurring as PackagePreset["recurring"]) ?? "one_time",
    includes: Array.isArray(row.includes) ? (row.includes as string[]) : [],
    badge: (row.badge as string) ?? null,
  }));

  return { presets, packages };
}

/** Clients a document can be shared with through the portal. */
export async function getClientOptions() {
  const supabase = createClient();
  const { data } = await supabase
    .from("clients")
    .select("id, name")
    .neq("status", "archived")
    .order("name", { ascending: true });

  return (data ?? []) as { id: string; name: string }[];
}
