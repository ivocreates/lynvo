import "server-only";

import { createClient } from "@/lib/supabase/server";
import type { PackagePreset, PresetItem } from "@/components/admin/billing-form";
import type { Offer } from "@/lib/admin/billing";

const ITEM_COLUMNS =
  "id, name, description, category, unit, unit_price, unit_price_intl, price_from, recurring, tax_rate, hsn_sac";

const PACKAGE_COLUMNS =
  "id, name, description, category, price_inr, price_intl, price_from, recurring, includes, badge";
const PACKAGE_COLUMNS_WITH_COMPARE = `${PACKAGE_COLUMNS}, compare_inr, compare_intl`;

function toNumber(value: unknown) {
  return Number(value ?? 0) || 0;
}

/** Catalogue services and package presets used by the quote/invoice editor. */
export async function getCatalog() {
  const supabase = createClient();

  const [{ data: itemRows }, packagesWithCompare, { data: offerRows }] = await Promise.all([
    supabase.from("billing_items").select(ITEM_COLUMNS).eq("active", true).order("order", { ascending: true }),
    supabase.from("billing_packages").select(PACKAGE_COLUMNS_WITH_COMPARE).eq("active", true).order("order", { ascending: true }),
    supabase.from("billing_offers").select("*").eq("active", true).order("code"),
  ]);

  // compare_* and billing_offers arrive with migration 0032.
  let packageRows = packagesWithCompare.data as Record<string, unknown>[] | null;
  if (packagesWithCompare.error) {
    ({ data: packageRows } = await supabase
      .from("billing_packages")
      .select(PACKAGE_COLUMNS)
      .eq("active", true)
      .order("order", { ascending: true }));
  }

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
    compare_inr: row.compare_inr == null ? null : toNumber(row.compare_inr),
    compare_intl: row.compare_intl == null ? null : toNumber(row.compare_intl),
  }));

  const offers: Offer[] = ((offerRows ?? []) as Record<string, unknown>[]).map((row) => ({
    id: String(row.id),
    code: String(row.code),
    title: String(row.title),
    description: (row.description as string) ?? null,
    kind: row.kind === "flat" ? "flat" : "percent",
    value: toNumber(row.value),
    categories: Array.isArray(row.categories) ? (row.categories as string[]) : [],
    min_subtotal: toNumber(row.min_subtotal),
    region: row.region === "IN" || row.region === "INT" ? row.region : "all",
    valid_from: (row.valid_from as string) ?? null,
    valid_until: (row.valid_until as string) ?? null,
    active: Boolean(row.active),
  }));

  return { presets, packages, offers };
}

/** Client accounts a document can be addressed to; details pre-fill the Bill-to block. */
export async function getClientOptions() {
  const supabase = createClient();
  const first = await supabase
    .from("clients")
    .select("id, name, contact_name, email, phone, address, gstin, region")
    .neq("status", "archived")
    .order("name", { ascending: true });
  let data = first.data as Record<string, any>[] | null;

  // gstin / region arrive with migration 0028.
  if (first.error) {
    ({ data } = await supabase
      .from("clients")
      .select("id, name, contact_name, email, phone, address")
      .neq("status", "archived")
      .order("name", { ascending: true }));
  }

  return ((data ?? []) as Record<string, any>[]).map((row) => ({
    id: String(row.id),
    name: String(row.name),
    contact_name: row.contact_name ?? null,
    email: row.email ?? null,
    phone: row.phone ?? null,
    address: row.address ?? null,
    gstin: row.gstin ?? null,
    region: row.region === "INT" ? ("INT" as const) : ("IN" as const),
  }));
}
