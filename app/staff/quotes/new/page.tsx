import { requireTeamMember } from "@/lib/auth";
import { getBillingSettings } from "@/lib/admin/billing-settings";
import { getCatalog } from "@/lib/admin/catalog";
import BillingForm from "@/components/admin/billing-form";
import { saveStaffQuote } from "../actions";

export default async function NewStaffQuotePage() {
  await requireTeamMember();

  const [settings, catalog] = await Promise.all([getBillingSettings(), getCatalog()]);

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
          presets={catalog.presets}
          packages={catalog.packages}
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
