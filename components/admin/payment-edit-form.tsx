import { PAYMENT_METHODS } from "@/lib/admin/billing";
import { updatePayment } from "@/app/admin/(dashboard)/billing/actions";
import SubmitButton from "./submit-button";

const FIELD = "mt-1 w-full rounded-card border border-border bg-surface px-2 py-1.5 text-sm focus:border-brand-700 focus:outline-none";

export type EditablePayment = {
  id: string;
  amount: number;
  tds_amount?: number | null;
  paid_on: string;
  method: string;
  reference: string | null;
  notes: string | null;
};

/** Inline correction of a recorded payment (wrong date, amount, method...). */
export default function PaymentEditForm({ payment, redirectTo }: { payment: EditablePayment; redirectTo: string }) {
  return (
    <details className="mt-2">
      <summary className="cursor-pointer text-xs text-brand-700 underline">Edit</summary>
      <form action={updatePayment} className="mt-2 grid gap-2 rounded-card border border-border bg-canvas-warm/60 p-3 sm:grid-cols-3">
        <input type="hidden" name="payment_id" value={payment.id} />
        <input type="hidden" name="redirect_to" value={redirectTo} />
        <label className="text-xs text-text-primary/70">
          Date received
          <input name="paid_on" type="date" required defaultValue={payment.paid_on} className={FIELD} />
        </label>
        <label className="text-xs text-text-primary/70">
          Amount received
          <input name="amount" type="number" step="0.01" min="0" required defaultValue={Number(payment.amount)} className={FIELD} />
        </label>
        <label className="text-xs text-text-primary/70">
          TDS deducted
          <input name="tds_amount" type="number" step="0.01" min="0" defaultValue={Number(payment.tds_amount ?? 0)} className={FIELD} />
        </label>
        <label className="text-xs text-text-primary/70">
          Method
          <select name="method" defaultValue={payment.method} className={FIELD}>
            {PAYMENT_METHODS.map((method) => (
              <option key={method.value} value={method.value}>
                {method.label}
              </option>
            ))}
          </select>
        </label>
        <label className="text-xs text-text-primary/70">
          Reference / UTR
          <input name="reference" defaultValue={payment.reference ?? ""} className={FIELD} />
        </label>
        <label className="text-xs text-text-primary/70">
          Note
          <input name="notes" defaultValue={payment.notes ?? ""} className={FIELD} />
        </label>
        <div className="sm:col-span-3">
          <SubmitButton pendingLabel="Saving...">Save payment</SubmitButton>
        </div>
      </form>
    </details>
  );
}
