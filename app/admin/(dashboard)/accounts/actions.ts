"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { requirePermission, recordAudit } from "@/lib/auth";
import { PAYMENT_METHODS } from "@/lib/admin/billing";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function back(formData: FormData) {
  const target = String(formData.get("redirect_to") ?? "");
  return target.startsWith("/admin/accounts") ? target : "/admin/accounts/ledger";
}

function flag(path: string, value: string) {
  return `${path}${path.includes("?") ? "&" : "?"}${value}`;
}

const money = (value: FormDataEntryValue | null) => {
  const number = Number(value ?? 0);
  return Number.isFinite(number) && number > 0 ? Math.round(number * 100) / 100 : 0;
};

export async function saveLedgerEntry(formData: FormData) {
  const actor = await requirePermission("accounts");
  const target = back(formData);

  const id = String(formData.get("id") ?? "");
  const entryType = formData.get("entry_type") === "income" ? "income" : "expense";
  const entryDate = String(formData.get("entry_date") ?? "");
  const amount = money(formData.get("amount"));
  const gstRate = Math.min(100, money(formData.get("gst_rate")));
  const gstIncluded = formData.get("gst_included") !== "off";
  const method = String(formData.get("payment_method") ?? "bank_transfer");
  const text = (field: string, max = 300) => String(formData.get(field) ?? "").trim().slice(0, max) || null;

  if (!/^\d{4}-\d{2}-\d{2}$/.test(entryDate)) redirect(flag(target, `error=${encodeURIComponent("Enter the date.")}`));
  if (!(amount > 0)) redirect(flag(target, `error=${encodeURIComponent("Enter the amount.")}`));

  // The amount entered is the total paid. If GST was added on top, gross it up.
  const gross = gstIncluded ? amount : Math.round(amount * (1 + gstRate / 100) * 100) / 100;
  const typedGst = money(formData.get("gst_amount"));
  const gstAmount = typedGst > 0 ? typedGst : Math.round((gross - gross / (1 + gstRate / 100)) * 100) / 100;

  const values = {
    entry_type: entryType,
    entry_date: entryDate,
    category: text("category", 80) ?? (entryType === "income" ? "Other income" : "Other expense"),
    party_name: text("party_name", 160),
    party_gstin: text("party_gstin", 20)?.toUpperCase() ?? null,
    description: text("description", 500),
    amount: gross,
    gst_rate: gstRate,
    gst_amount: Math.min(gstAmount, gross),
    tds_amount: money(formData.get("tds_amount")),
    currency: (text("currency", 3) ?? "INR").toUpperCase(),
    payment_method: PAYMENT_METHODS.some((entry) => entry.value === method) ? method : "other",
    reference: text("reference", 120),
    bill_number: text("bill_number", 80),
    updated_at: new Date().toISOString(),
  };

  const supabase = createClient();
  const { error } = UUID.test(id)
    ? await supabase.from("ledger_entries").update(values).eq("id", id)
    : await supabase.from("ledger_entries").insert({ ...values, created_by: actor.id });

  if (error) redirect(flag(target, `error=${encodeURIComponent("Could not save. Has migration 0033 been run?")}`));

  await recordAudit(UUID.test(id) ? "update" : "create", "ledger_entries", UUID.test(id) ? id : null, { entryType, amount: gross });
  revalidatePath("/admin/accounts");
  revalidatePath("/admin/accounts/ledger");
  redirect(flag(target, "saved=1"));
}

export async function deleteLedgerEntry(formData: FormData) {
  await requirePermission("accounts");
  const id = String(formData.get("id") ?? "");
  const target = back(formData);
  if (!UUID.test(id)) return;

  const supabase = createClient();
  await supabase.from("ledger_entries").delete().eq("id", id);
  await recordAudit("delete", "ledger_entries", id);
  revalidatePath("/admin/accounts");
  revalidatePath("/admin/accounts/ledger");
  redirect(flag(target, "deleted=1"));
}
