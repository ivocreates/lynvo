import { notFound } from "next/navigation";
import { requireTeamMember } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { getBillingSettings } from "@/lib/admin/billing-settings";
import BillingForm, { type PresetItem } from "@/components/admin/billing-form";
import type { LineItem } from "@/lib/admin/billing";
import { saveStaffQuote } from "../actions";

export default async function EditStaffQuotePage({ params }: { params: { id: string } }) {
  const profile = await requireTeamMember();

  const supabase = createClient();
  const { data: document } = await supabase
    .from("billing_documents")
    .select("*")
    .eq("id", params.id)
    .eq("created_by", profile.id)
    .eq("status", "draft")
    .maybeSingle();

  if (!document) notFound();

  const [{ data: itemRows }, { data: presetRows }, settings] = await Promise.all([
    supabase
      .from("billing_document_items")
      .select("name, description, unit, hsn_sac, quantity, unit_price, tax_rate, line_total")
      .eq("document_id", params.id)
      .order("position", { ascending: true }),
    supabase
      .from("billing_items")
      .select("id, name, description, unit, unit_price, tax_rate, hsn_sac")
      .eq("active", true)
      .order("order", { ascending: true }),
    getBillingSettings(),
  ]);

  return (
    <div>
      <p className="section-stamp">SALES</p>
      <h1 className="mt-2 font-display text-3xl font-semibold text-ink-900">Edit quote</h1>

      <div className="mt-8">
        <BillingForm
          docType="quote"
          document={document as any}
          items={(itemRows ?? []) as LineItem[]}
          presets={(presetRows ?? []) as PresetItem[]}
          defaults={{
            currency: settings.billing_currency || "INR",
            terms: settings.billing_quote_terms,
          }}
          action={saveStaffQuote}
          canSetStatus={false}
        />
      </div>
    </div>
  );
}
