import "server-only";

import { createClient } from "@/lib/supabase/server";
import { getBillingSettings } from "@/lib/admin/billing-settings";
import { formatMoney } from "@/lib/admin/billing";
import { formatLongDate, type LegalTemplate } from "@/lib/legal-templates";

type Values = Record<string, string>;

const iso = (value: string | null | undefined) => (value ? String(value).slice(0, 10) : "");

/** Company letterhead values shared by every template. */
export async function companyValues(): Promise<Values> {
  const settings = await getBillingSettings();
  const supabase = createClient();
  const { data } = await supabase
    .from("site_settings")
    .select("key, value")
    .in("key", ["legal_jurisdiction", "legal_reference_prefix"]);
  const extra: Values = {};
  for (const row of (data ?? []) as { key: string; value: { text?: string } | null }[]) {
    extra[row.key] = row.value?.text ?? "";
  }

  return {
    company_legal_name: settings.billing_legal_name || "LYNVO CREATIVE SOLUTIONS LLP",
    company_brand: settings.billing_brand_name || "LYNVO",
    company_address: (settings.billing_registered_address || "").replace(/\s*\n\s*/g, ", "),
    company_email: settings.billing_email,
    company_phone: settings.billing_phone,
    company_website: settings.billing_website,
    company_llpin: settings.billing_llpin,
    company_gstin: settings.billing_gstin,
    signatory_name: settings.doc_signatory_name || "Authorised signatory",
    signatory_title: settings.doc_signatory_title || "Designated Partner",
    jurisdiction: extra.legal_jurisdiction ?? "",
    payment_schedule: settings.billing_payment_terms,
    today: formatLongDate(new Date().toISOString().slice(0, 10)),
  };
}

/** Client, project and quote values; raw field defaults (dates as ISO, money as numbers). */
export async function clientValues(clientId: string, engagementId?: string | null, quoteId?: string | null) {
  const supabase = createClient();
  const [{ data: client }, { data: engagement }, { data: quote }] = await Promise.all([
    supabase.from("clients").select("*").eq("id", clientId).maybeSingle(),
    engagementId
      ? supabase.from("client_engagements").select("*").eq("id", engagementId).maybeSingle()
      : Promise.resolve({ data: null }),
    quoteId
      ? supabase.from("billing_documents").select("number, total, currency").eq("id", quoteId).maybeSingle()
      : Promise.resolve({ data: null }),
  ]);

  if (!client) return null;
  const c = client as Record<string, any>;
  const e = engagement as Record<string, any> | null;
  const q = quote as { number: string; total: number; currency: string } | null;

  const party: Values = {
    client_name: c.name,
    client_contact: c.contact_name ?? "",
    client_email: c.email ?? "",
    client_address: (c.address ?? "").replace(/\s*\n\s*/g, ", "),
    client_gstin: c.gstin ?? "",
  };

  const defaults: Values = {
    project_title: e?.title ?? "",
    project_url: c.website ?? "",
    delivery_date: iso(e?.delivered_at ?? e?.target_date),
    start_date: iso(e?.start_date) || new Date().toISOString().slice(0, 10),
    covered_assets: c.website ?? "",
    client_contact_details: [c.contact_name, c.phone].filter(Boolean).join(", "),
    quote_number: q?.number ?? "",
    project_value: q ? formatMoney(Number(q.total), q.currency) : "",
  };

  return { client: c, party, defaults };
}

/** Staff member values; reporting manager resolved from manager_id. */
export async function staffValues(profileId: string) {
  const supabase = createClient();
  const { data: person } = await supabase
    .from("profiles")
    .select("id, display_name, email, title, department, employment_type, joined_on, ends_on, phone, manager_id")
    .eq("id", profileId)
    .maybeSingle();
  if (!person) return null;
  const p = person as Record<string, any>;

  let managerName = "";
  if (p.manager_id) {
    const { data: manager } = await supabase.from("profiles").select("display_name, email").eq("id", p.manager_id).maybeSingle();
    managerName = (manager as { display_name: string | null; email: string } | null)?.display_name ?? "";
  }

  const party: Values = {
    name: p.display_name ?? p.email,
    email: p.email,
    title: p.title ?? "",
    department: p.department ?? "",
    employment_type: p.employment_type ?? "",
    joined_on: p.joined_on ? formatLongDate(iso(p.joined_on)) : "",
    ends_on: p.ends_on ? formatLongDate(iso(p.ends_on)) : "",
    phone: p.phone ?? "",
  };

  const defaults: Values = {
    position: p.title ?? "",
    department: p.department ?? "",
    employment_type: p.employment_type ?? "",
    start_date: iso(p.joined_on),
    end_date: iso(p.ends_on),
    last_day: iso(p.ends_on),
    reporting_to: managerName,
    mentor: managerName,
    pay_month: new Date().toLocaleDateString("en-IN", { month: "long", year: "numeric" }),
  };

  return { person: p, party, defaults };
}

/** Field starting values: autofill first, then the template's own default. */
export function initialFieldValues(template: LegalTemplate, autofill: Values) {
  const values: Values = {};
  for (const field of template.fields) values[field.key] = autofill[field.key] || field.default || "";
  return values;
}

export function readFieldValues(template: LegalTemplate, formData: FormData) {
  const values: Values = {};
  for (const field of template.fields) {
    values[field.key] = String(formData.get(`field:${field.key}`) ?? "").trim().slice(0, 8000);
  }
  return values;
}
