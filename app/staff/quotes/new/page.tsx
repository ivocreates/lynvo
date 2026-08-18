import { requireTeamMember } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { getBillingSettings } from "@/lib/admin/billing-settings";
import BillingForm, { type PresetItem } from "@/components/admin/billing-form";
import { saveStaffQuote } from "../actions";

export default async function NewStaffQuotePage() {
  await requireTeamMember();

  const settings = await getBillingSettings();

  const supabase = createClient();
  const { data } = await supabase
    .from("billing_items")
    .select("id, name, description, unit, unit_price, tax_rate, hsn_sac")
    .eq("active", true)
    .order("order", { ascending: true });

  return (
    <div>
      <p className="section-stamp">SALES</p>
      <h1 className="mt-2 font-display text-3xl font-semibold text-ink-900">New quote</h1>
      <p className="mt-2 max-w-2xl text-sm leading-6 text-text-primary/75">
        Pick items from the catalogue or add your own lines. The quote is saved as a draft for partner review.
      </p>

      <div className="mt-8">
        <BillingForm
          docType="quote"
          presets={(data ?? []) as PresetItem[]}
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
