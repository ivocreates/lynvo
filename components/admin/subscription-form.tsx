import { SUBSCRIPTION_CYCLES, todayIso } from "@/lib/admin/billing";
import { saveSubscription } from "@/app/admin/(dashboard)/billing/actions";
import SubmitButton from "./submit-button";

const FIELD =
  "mt-1 w-full rounded-card border border-border bg-canvas-warm px-3 py-2 text-sm focus:border-brand-700 focus:outline-none";
const LABEL = "block text-xs uppercase tracking-[0.18em] text-text-primary/60";

export type SubscriptionRecord = {
  id: string;
  client_id: string;
  name: string;
  description: string | null;
  category: string;
  amount: number;
  tax_rate: number;
  currency: string;
  cycle: string;
  start_date: string;
  next_invoice_on: string | null;
  status: string;
  notes: string | null;
};

/** Plans offered as one-click starting points; prices mirror the catalogue. */
const PLAN_HINTS = [
  "Essential Care — ₹999 / month",
  "Business Care — ₹1,999 / month",
  "Premium Care — ₹3,999 / month",
  "Managed Hosting — ₹5,000 / year",
  "Domain Management — ₹1,000 / year",
  "SEO Growth Retainer — ₹9,999 / month",
  "Social Media Design Retainer — ₹4,999 / month",
];

export default function SubscriptionForm({
  clients,
  subscription,
  fixedClientId,
  redirectTo,
}: {
  clients: { id: string; name: string }[];
  subscription?: SubscriptionRecord;
  fixedClientId?: string;
  redirectTo: string;
}) {
  const id = subscription?.id ?? "new";

  return (
    <form action={saveSubscription} className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {subscription && <input type="hidden" name="id" value={subscription.id} />}
      <input type="hidden" name="redirect_to" value={redirectTo} />
      {fixedClientId ? (
        <input type="hidden" name="client_id" value={fixedClientId} />
      ) : (
        <div className="lg:col-span-2">
          <label htmlFor={`sub-client-${id}`} className={LABEL}>
            Client
          </label>
          <select id={`sub-client-${id}`} name="client_id" required defaultValue={subscription?.client_id ?? ""} className={FIELD}>
            <option value="" disabled>
              Choose a client...
            </option>
            {clients.map((client) => (
              <option key={client.id} value={client.id}>
                {client.name}
              </option>
            ))}
          </select>
        </div>
      )}
      <div className="lg:col-span-2">
        <label htmlFor={`sub-name-${id}`} className={LABEL}>
          Service
        </label>
        <input
          id={`sub-name-${id}`}
          name="name"
          required
          list="subscription-plans"
          defaultValue={subscription?.name ?? ""}
          placeholder="e.g. Business Care maintenance"
          className={FIELD}
        />
        <datalist id="subscription-plans">
          {PLAN_HINTS.map((hint) => (
            <option key={hint} value={hint.split(" — ")[0]}>
              {hint}
            </option>
          ))}
        </datalist>
      </div>
      <div>
        <label htmlFor={`sub-amount-${id}`} className={LABEL}>
          Amount per cycle
        </label>
        <input id={`sub-amount-${id}`} name="amount" type="number" step="0.01" min="0" required defaultValue={subscription?.amount ?? ""} className={FIELD} />
      </div>
      <div>
        <label htmlFor={`sub-cycle-${id}`} className={LABEL}>
          Billing cycle
        </label>
        <select id={`sub-cycle-${id}`} name="cycle" defaultValue={subscription?.cycle ?? "monthly"} className={FIELD}>
          {SUBSCRIPTION_CYCLES.map((cycle) => (
            <option key={cycle.value} value={cycle.value}>
              {cycle.label}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label htmlFor={`sub-tax-${id}`} className={LABEL}>
          Tax %
        </label>
        <input id={`sub-tax-${id}`} name="tax_rate" type="number" step="0.01" min="0" max="100" defaultValue={subscription?.tax_rate ?? 0} className={FIELD} />
      </div>
      <div>
        <label htmlFor={`sub-currency-${id}`} className={LABEL}>
          Currency
        </label>
        <input id={`sub-currency-${id}`} name="currency" defaultValue={subscription?.currency ?? "INR"} className={FIELD} />
      </div>
      <div>
        <label htmlFor={`sub-start-${id}`} className={LABEL}>
          Start date
        </label>
        <input id={`sub-start-${id}`} name="start_date" type="date" defaultValue={subscription?.start_date ?? todayIso()} className={FIELD} />
      </div>
      <div>
        <label htmlFor={`sub-next-${id}`} className={LABEL}>
          Next invoice on
        </label>
        <input id={`sub-next-${id}`} name="next_invoice_on" type="date" defaultValue={subscription?.next_invoice_on ?? ""} className={FIELD} />
      </div>
      <div>
        <label htmlFor={`sub-category-${id}`} className={LABEL}>
          Category
        </label>
        <select id={`sub-category-${id}`} name="category" defaultValue={subscription?.category ?? "Maintenance"} className={FIELD}>
          {["Maintenance", "Infrastructure", "Hosting", "SEO", "Graphic Design", "Support", "Other"].map((category) => (
            <option key={category} value={category}>
              {category}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label htmlFor={`sub-status-${id}`} className={LABEL}>
          Status
        </label>
        <select id={`sub-status-${id}`} name="status" defaultValue={subscription?.status ?? "active"} className={FIELD}>
          <option value="active">Active</option>
          <option value="paused">Paused</option>
          <option value="cancelled">Cancelled</option>
        </select>
      </div>
      <div className="sm:col-span-2 lg:col-span-4">
        <label htmlFor={`sub-desc-${id}`} className={LABEL}>
          What is included (printed on the invoice)
        </label>
        <input id={`sub-desc-${id}`} name="description" defaultValue={subscription?.description ?? ""} className={FIELD} />
      </div>
      <div className="sm:col-span-2 lg:col-span-4">
        <SubmitButton>{subscription ? "Save changes" : "Add subscription"}</SubmitButton>
      </div>
    </form>
  );
}
