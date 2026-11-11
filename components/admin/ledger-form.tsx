import { PAYMENT_METHODS, todayIso } from "@/lib/admin/billing";
import { EXPENSE_CATEGORIES, GST_RATES, INCOME_CATEGORIES } from "@/lib/accounts";
import type { LedgerRow } from "@/lib/accounts-data";
import { saveLedgerEntry } from "@/app/admin/(dashboard)/accounts/actions";
import SubmitButton from "./submit-button";

const FIELD = "mt-1 w-full rounded-card border border-border bg-canvas-warm px-3 py-2 text-sm focus:border-brand-700 focus:outline-none";
const LABEL = "block text-xs uppercase tracking-[0.18em] text-text-primary/60";

/** Add or edit a manual income / expense entry. Works for any past date. */
export default function LedgerForm({ entry, redirectTo }: { entry?: LedgerRow; redirectTo: string }) {
  const key = entry?.id ?? "new";
  return (
    <form action={saveLedgerEntry} className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {entry && <input type="hidden" name="id" value={entry.id} />}
      <input type="hidden" name="redirect_to" value={redirectTo} />
      {/* The amount stored is always the total incl. GST. */}
      <input type="hidden" name="gst_included" value="on" />
      <label>
        <span className={LABEL}>Type</span>
        <select name="entry_type" defaultValue={entry?.entry_type ?? "expense"} className={FIELD}>
          <option value="expense">Expense (money out)</option>
          <option value="income">Income (money in)</option>
        </select>
      </label>
      <label>
        <span className={LABEL}>Date</span>
        <input name="entry_date" type="date" required defaultValue={entry?.entry_date ?? todayIso()} className={FIELD} />
      </label>
      <label className="lg:col-span-2">
        <span className={LABEL}>Category</span>
        <select name="category" defaultValue={entry?.category ?? "Software & subscriptions"} className={FIELD}>
          <optgroup label="Expenses">
            {EXPENSE_CATEGORIES.map((category) => (
              <option key={category} value={category}>
                {category}
              </option>
            ))}
          </optgroup>
          <optgroup label="Income (not from LYNVO invoices)">
            {INCOME_CATEGORIES.map((category) => (
              <option key={category} value={category}>
                {category}
              </option>
            ))}
          </optgroup>
        </select>
      </label>
      <label>
        <span className={LABEL}>Total amount (incl. GST)</span>
        <input name="amount" type="number" step="0.01" min="0" required defaultValue={entry?.amount ?? ""} className={FIELD} />
      </label>
      <label>
        <span className={LABEL}>GST rate</span>
        <select name="gst_rate" defaultValue={String(entry?.gst_rate ?? 0)} className={FIELD}>
          {GST_RATES.map((rate) => (
            <option key={rate} value={rate}>
              {rate === 0 ? "No GST / exempt" : `${rate}%`}
            </option>
          ))}
        </select>
      </label>
      <label>
        <span className={LABEL}>GST amount (optional)</span>
        <input name="gst_amount" type="number" step="0.01" min="0" defaultValue={entry?.gst_amount || ""} placeholder="Worked out from the rate" className={FIELD} />
      </label>
      <label>
        <span className={LABEL}>TDS deducted</span>
        <input name="tds_amount" type="number" step="0.01" min="0" defaultValue={entry?.tds_amount || ""} className={FIELD} />
      </label>
      <label className="lg:col-span-2">
        <span className={LABEL}>Paid to / received from</span>
        <input name="party_name" defaultValue={entry?.party_name ?? ""} placeholder="Vendor, freelancer or client" className={FIELD} />
      </label>
      <label>
        <span className={LABEL}>Their GSTIN</span>
        <input name="party_gstin" defaultValue={entry?.party_gstin ?? ""} className={`${FIELD} uppercase`} />
      </label>
      <label>
        <span className={LABEL}>Bill / invoice no.</span>
        <input name="bill_number" defaultValue={entry?.bill_number ?? ""} className={FIELD} />
      </label>
      <label>
        <span className={LABEL}>Paid by</span>
        <select name="payment_method" defaultValue={entry?.payment_method ?? "bank_transfer"} className={FIELD}>
          {PAYMENT_METHODS.map((method) => (
            <option key={method.value} value={method.value}>
              {method.label}
            </option>
          ))}
        </select>
      </label>
      <label>
        <span className={LABEL}>Reference / UTR</span>
        <input name="reference" defaultValue={entry?.reference ?? ""} className={FIELD} />
      </label>
      <label>
        <span className={LABEL}>Currency</span>
        <input name="currency" defaultValue={entry?.currency ?? "INR"} maxLength={3} className={`${FIELD} uppercase`} />
      </label>
      <label className="sm:col-span-2 lg:col-span-4">
        <span className={LABEL}>Description</span>
        <input name="description" defaultValue={entry?.description ?? ""} placeholder="e.g. Figma annual plan, Google Ads October" className={FIELD} />
      </label>
      <div className="sm:col-span-2 lg:col-span-4">
        <SubmitButton>{entry ? "Save changes" : "Add entry"}</SubmitButton>
        <span className="ml-3 text-xs text-text-primary/60" id={`hint-${key}`}>
          Payments against LYNVO invoices are added automatically — don&apos;t enter them twice.
        </span>
      </div>
    </form>
  );
}
