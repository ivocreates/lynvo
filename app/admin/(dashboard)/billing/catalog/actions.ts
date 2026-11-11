"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { requireAdmin, requirePermission, recordAudit } from "@/lib/auth";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function back(formData: FormData, fallback = "/admin/billing/catalog") {
  const target = String(formData.get("redirect_to") ?? "");
  return target.startsWith("/admin/") ? target : fallback;
}

function flag(path: string, value: string) {
  const [base, hash] = path.split("#");
  return `${base}${base.includes("?") ? "&" : "?"}${value}${hash ? `#${hash}` : ""}`;
}

const money = (value: FormDataEntryValue | null) => {
  const number = Number(value ?? "");
  return Number.isFinite(number) && number >= 0 ? Math.round(number * 100) / 100 : null;
};

/** Friendly price points: same rule as friendly_usd() in migration 0032, for any currency. */
function friendly(value: number, currency: "INR" | "USD") {
  if (currency === "USD") {
    if (value < 1) return Math.round(value * 100) / 100;
    if (value < 15) return Math.round(value);
    if (value < 100) return Math.round(value / 5) * 5;
    if (value < 1000) return Math.round(value / 10) * 10 - 1;
    return Math.round(value / 50) * 50 - 1;
  }
  if (value < 100) return Math.round(value);
  if (value < 1000) return Math.round(value / 50) * 50;
  if (value < 10000) return Math.round(value / 100) * 100 - 1;
  return Math.round(value / 1000) * 1000 - 1;
}

export async function quickUpdateItem(formData: FormData) {
  await requirePermission("billing.manage");
  const id = String(formData.get("id") ?? "");
  const target = back(formData);
  if (!UUID.test(id)) return;

  const inr = money(formData.get("unit_price"));
  const usd = money(formData.get("unit_price_intl"));
  if (inr === null || usd === null) redirect(flag(target, `error=${encodeURIComponent("Enter valid prices.")}`));

  const supabase = createClient();
  const { error } = await supabase
    .from("billing_items")
    .update({
      unit_price: inr,
      unit_price_intl: usd,
      active: formData.get("active") === "on",
      updated_at: new Date().toISOString(),
    })
    .eq("id", id);

  revalidatePath("/admin/billing/catalog");
  redirect(flag(target, error ? "error=save" : "saved=1"));
}

export async function quickUpdatePackage(formData: FormData) {
  await requirePermission("billing.manage");
  const id = String(formData.get("id") ?? "");
  const target = back(formData, "/admin/billing/catalog?tab=packages");
  if (!UUID.test(id)) return;

  const supabase = createClient();
  const values: Record<string, unknown> = {
    price_inr: money(formData.get("price_inr")) ?? 0,
    price_intl: money(formData.get("price_intl")) ?? 0,
    badge: String(formData.get("badge") ?? "").trim() || null,
    active: formData.get("active") === "on",
    updated_at: new Date().toISOString(),
  };
  const compare = {
    compare_inr: money(formData.get("compare_inr")) || null,
    compare_intl: money(formData.get("compare_intl")) || null,
  };

  let { error } = await supabase.from("billing_packages").update({ ...values, ...compare }).eq("id", id);
  if (error?.code === "42703" || error?.code === "PGRST204") ({ error } = await supabase.from("billing_packages").update(values).eq("id", id));

  revalidatePath("/admin/billing/catalog");
  redirect(flag(target, error ? "error=save" : "saved=1"));
}

/** Raise or lower prices for a category (or everything) by a percentage. */
export async function bulkAdjustPrices(formData: FormData) {
  const actor = await requireAdmin();
  const target = back(formData);

  const percent = Number(formData.get("percent") ?? "");
  const category = String(formData.get("category") ?? "");
  const scope = String(formData.get("scope") ?? "both");
  const round = formData.get("round") === "on";

  if (!Number.isFinite(percent) || percent === 0 || percent < -90 || percent > 300) {
    redirect(flag(target, `error=${encodeURIComponent("Enter a percentage between -90 and 300 (not zero).")}`));
  }

  const supabase = createClient();
  let query = supabase.from("billing_items").select("id, unit_price, unit_price_intl");
  if (category) query = query.eq("category", category);
  const { data } = await query;
  const rows = (data ?? []) as { id: string; unit_price: number; unit_price_intl: number }[];

  const factor = 1 + percent / 100;
  let changed = 0;
  for (const row of rows) {
    const inr = Number(row.unit_price);
    const usd = Number(row.unit_price_intl);
    const nextInr = scope === "INT" ? inr : round ? friendly(inr * factor, "INR") : Math.round(inr * factor * 100) / 100;
    const nextUsd = scope === "IN" ? usd : round ? friendly(usd * factor, "USD") : Math.round(usd * factor * 100) / 100;
    if (nextInr === inr && nextUsd === usd) continue;
    const { error } = await supabase
      .from("billing_items")
      .update({ unit_price: nextInr, unit_price_intl: nextUsd, updated_at: new Date().toISOString() })
      .eq("id", row.id);
    if (!error) changed += 1;
  }

  await recordAudit("bulk_price", "billing_items", null, { by: actor.id, category: category || "all", percent, scope, changed });
  revalidatePath("/admin/billing/catalog");
  redirect(flag(target, `bulk=${changed}`));
}

// ---------------------------------------------------------------------------
// Offers
// ---------------------------------------------------------------------------

export async function saveOffer(formData: FormData) {
  await requirePermission("billing.manage");
  const id = String(formData.get("id") ?? "");
  const code = String(formData.get("code") ?? "").trim().toUpperCase().replace(/[^A-Z0-9_-]/g, "").slice(0, 30);
  const title = String(formData.get("title") ?? "").trim().slice(0, 120);
  if (code.length < 3 || !title) redirect(`/admin/billing/offers?error=${encodeURIComponent("Give the offer a code (3+ characters) and a title.")}`);

  const kind = formData.get("kind") === "flat" ? "flat" : "percent";
  const value = money(formData.get("value")) ?? 0;
  if (kind === "percent" && value > 100) redirect(`/admin/billing/offers?error=${encodeURIComponent("A percentage offer cannot exceed 100%.")}`);
  const date = (field: string) => {
    const raw = String(formData.get(field) ?? "");
    return /^\d{4}-\d{2}-\d{2}$/.test(raw) ? raw : null;
  };
  const region = String(formData.get("region") ?? "all");

  const values = {
    code,
    title,
    description: String(formData.get("description") ?? "").trim().slice(0, 300) || null,
    kind,
    value,
    categories: formData.getAll("categories").map(String).filter(Boolean),
    min_subtotal: money(formData.get("min_subtotal")) ?? 0,
    region: ["all", "IN", "INT"].includes(region) ? region : "all",
    valid_from: date("valid_from"),
    valid_until: date("valid_until"),
    active: formData.get("active") === "on",
    updated_at: new Date().toISOString(),
  };

  const supabase = createClient();
  const { error } = UUID.test(id)
    ? await supabase.from("billing_offers").update(values).eq("id", id)
    : await supabase.from("billing_offers").insert(values);

  if (error) {
    const message = error.code === "23505" ? "That code already exists." : "Could not save the offer. Has migration 0032 been run?";
    redirect(`/admin/billing/offers?error=${encodeURIComponent(message)}`);
  }
  revalidatePath("/admin/billing/offers");
  redirect("/admin/billing/offers?saved=1");
}

export async function deleteOffer(formData: FormData) {
  await requireAdmin();
  const id = String(formData.get("id") ?? "");
  if (!UUID.test(id)) return;
  const supabase = createClient();
  await supabase.from("billing_offers").delete().eq("id", id);
  revalidatePath("/admin/billing/offers");
  redirect("/admin/billing/offers?saved=1");
}
