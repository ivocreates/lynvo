"use client";

import { useState } from "react";
import { convertQuote } from "@/app/admin/(dashboard)/billing/actions";
import { formatMoney } from "@/lib/admin/billing";
import SubmitButton from "./submit-button";

type Mode = "percent" | "amount" | "balance" | "full";

const inputClass =
  "mt-1 w-full rounded-card border border-border bg-surface px-3 py-2 text-sm focus:border-brand-700 focus:outline-none";

/** Raises an advance, milestone, balance or full invoice from an accepted quote. */
export default function ConvertQuoteForm({
  quoteId,
  total,
  invoiced,
  currency,
  defaultPercent,
  hasRecurring,
}: {
  quoteId: string;
  total: number;
  invoiced: number;
  currency: string;
  defaultPercent: number;
  hasRecurring: boolean;
}) {
  const remaining = Math.max(0, Math.round((total - invoiced) * 100) / 100);
  const nothingInvoiced = invoiced <= 0;
  const [mode, setMode] = useState<Mode>(nothingInvoiced ? "percent" : "balance");
  const [percent, setPercent] = useState(String(defaultPercent || 40));
  const [amount, setAmount] = useState(String(Math.round(remaining / 2)));

  const preview =
    mode === "percent"
      ? Math.round(total * (Number(percent) || 0)) / 100
      : mode === "amount"
        ? Number(amount) || 0
        : mode === "balance"
          ? remaining
          : total;

  const options: { value: Mode; label: string; help: string; disabled?: boolean }[] = [
    {
      value: "percent",
      label: nothingInvoiced ? "Advance (percentage)" : "Milestone (percentage)",
      help: "A share of the project value, e.g. 40% upfront.",
    },
    { value: "amount", label: nothingInvoiced ? "Advance (fixed amount)" : "Milestone (fixed amount)", help: "Any amount up to what is left." },
    { value: "balance", label: "Remaining balance", help: "Everything not yet invoiced.", disabled: nothingInvoiced },
    { value: "full", label: "Full invoice with all line items", help: "One invoice for the whole quote.", disabled: !nothingInvoiced },
  ];

  if (remaining <= 0) {
    return (
      <p className="rounded-card border border-success/40 bg-success/10 px-4 py-3 text-sm text-success">
        This quote has been invoiced in full.
      </p>
    );
  }

  return (
    <form action={convertQuote} className="space-y-4">
      <input type="hidden" name="quote_id" value={quoteId} />
      <input type="hidden" name="mode" value={mode} />
      <input type="hidden" name="value" value={mode === "percent" ? percent : mode === "amount" ? amount : "0"} />

      <fieldset className="grid gap-2 sm:grid-cols-2">
        <legend className="sr-only">What to invoice</legend>
        {options.map((option) => (
          <label
            key={option.value}
            className={`flex cursor-pointer gap-3 rounded-card border p-3 text-sm ${
              mode === option.value ? "border-brand-700 bg-brand-700/5" : "border-border"
            } ${option.disabled ? "cursor-not-allowed opacity-40" : ""}`}
          >
            <input
              type="radio"
              name="mode-choice"
              value={option.value}
              checked={mode === option.value}
              disabled={option.disabled}
              onChange={() => setMode(option.value)}
              className="mt-0.5 accent-brand-700"
            />
            <span>
              <span className="font-medium text-ink-900">{option.label}</span>
              <span className="block text-xs text-text-primary/60">{option.help}</span>
            </span>
          </label>
        ))}
      </fieldset>

      <div className="grid gap-4 sm:grid-cols-3">
        {mode === "percent" && (
          <div>
            <label htmlFor="convert-percent" className="block text-sm font-medium text-ink-900">
              Percentage
            </label>
            <input
              id="convert-percent"
              type="number"
              min="1"
              max="100"
              step="0.5"
              value={percent}
              onChange={(event) => setPercent(event.target.value)}
              className={inputClass}
            />
          </div>
        )}
        {mode === "amount" && (
          <div>
            <label htmlFor="convert-amount" className="block text-sm font-medium text-ink-900">
              Amount (incl. tax)
            </label>
            <input
              id="convert-amount"
              type="number"
              min="1"
              step="0.01"
              value={amount}
              onChange={(event) => setAmount(event.target.value)}
              className={inputClass}
            />
          </div>
        )}
        <div>
          <label htmlFor="due_in_days" className="block text-sm font-medium text-ink-900">
            Due in (days)
          </label>
          <input id="due_in_days" name="due_in_days" type="number" min="0" max="120" defaultValue={7} className={inputClass} />
        </div>
        <div className="flex items-end">
          <p className="pb-2 text-sm text-text-primary/70">
            Invoice total{" "}
            <span className={`font-semibold ${preview > remaining + 0.01 ? "text-error" : "text-ink-900"}`}>
              {formatMoney(preview, currency)}
            </span>
            <span className="block text-xs">
              {formatMoney(Math.max(0, remaining - preview), currency)} left to invoice after this
            </span>
          </p>
        </div>
      </div>

      <div className="space-y-2 text-sm text-ink-900">
        <label className="flex items-center gap-2">
          <input type="checkbox" name="issue_now" className="h-4 w-4 accent-brand-700" />
          Issue immediately (status Sent, visible in the client portal)
        </label>
        {hasRecurring && nothingInvoiced && (
          <label className="flex items-center gap-2">
            <input type="checkbox" name="create_subscriptions" defaultChecked className="h-4 w-4 accent-brand-700" />
            Set up the quote&apos;s monthly / yearly items as recurring maintenance for this client
          </label>
        )}
      </div>

      <SubmitButton>Create invoice</SubmitButton>
    </form>
  );
}
