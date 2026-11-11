"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useFormState } from "react-dom";
import { Trash2 } from "lucide-react";
import { saveDocument, type BillingState } from "@/app/admin/(dashboard)/billing/actions";
import {
  CATEGORY_OPTIONS,
  DOC_STATUSES,
  MANUAL_STATUSES,
  STATUS_LABELS,
  RECURRING_OPTIONS,
  REGIONS,
  calculateTotals,
  currencyForRegion,
  evaluateOffer,
  formatMoney,
  recurringTotals,
  type DocType,
  type LineItem,
  type Offer,
  type Recurring,
  type Region,
} from "@/lib/admin/billing";
import SubmitButton from "./submit-button";
import CatalogPicker from "./catalog-picker";

export interface PresetItem {
  id: string;
  name: string;
  description: string | null;
  category: string | null;
  unit: string | null;
  unit_price: number;
  unit_price_intl: number;
  price_from: boolean;
  recurring: Recurring;
  tax_rate: number;
  hsn_sac: string | null;
}

export interface PackagePreset {
  id: string;
  name: string;
  description: string | null;
  category: string;
  price_inr: number;
  price_intl: number;
  price_from: boolean;
  recurring: Recurring;
  includes: string[] | null;
  badge: string | null;
  compare_inr?: number | null;
  compare_intl?: number | null;
}

export interface ClientOption {
  id: string;
  name: string;
  contact_name?: string | null;
  email?: string | null;
  phone?: string | null;
  address?: string | null;
  gstin?: string | null;
  region?: Region;
}

type BillTo = { client_id: string; name: string; email: string; phone: string; gstin: string; address: string };

export interface DocumentRecord {
  id: string;
  doc_type: DocType;
  number: string;
  status: string;
  issue_date: string;
  due_date: string | null;
  client_name: string;
  client_email: string | null;
  client_phone: string | null;
  client_address: string | null;
  client_gstin: string | null;
  currency: string;
  region: Region | null;
  client_id: string | null;
  discount_amount: number;
  discount_percent?: number | null;
  offer_code?: string | null;
  notes: string | null;
  terms: string | null;
}

type Row = {
  key: string;
  name: string;
  description: string;
  category: string;
  recurring: Recurring;
  unit: string;
  hsn_sac: string;
  quantity: string;
  unit_price: string;
  tax_rate: string;
};

const initialState: BillingState = { ok: false, message: "" };

const inputClass =
  "mt-1 w-full rounded-card border border-border bg-surface px-3 py-2 text-sm focus:border-brand-700 focus:outline-none";

let rowCounter = 0;
function emptyRow(): Row {
  rowCounter += 1;
  return {
    key: `row-${rowCounter}`,
    name: "",
    description: "",
    category: "Other",
    recurring: "one_time",
    unit: "",
    hsn_sac: "",
    quantity: "1",
    unit_price: "0",
    tax_rate: "0",
  };
}

function toLineItem(row: Row): LineItem {
  return {
    name: row.name,
    description: null,
    category: row.category,
    recurring: row.recurring,
    unit: null,
    hsn_sac: null,
    quantity: Number(row.quantity) || 0,
    unit_price: Number(row.unit_price) || 0,
    tax_rate: Number(row.tax_rate) || 0,
    line_total: 0,
  };
}

export default function BillingForm({
  docType,
  document,
  items,
  presets,
  packages = [],
  offers = [],
  clients = [],
  defaults,
  action = saveDocument,
  canSetStatus = true,
  initialClientId,
  cancelHref,
}: {
  docType: DocType;
  document?: DocumentRecord;
  items?: LineItem[];
  presets: PresetItem[];
  packages?: PackagePreset[];
  offers?: Offer[];
  clients?: ClientOption[];
  defaults: { currency: string; terms: string };
  action?: (state: BillingState, formData: FormData) => Promise<BillingState>;
  canSetStatus?: boolean;
  initialClientId?: string;
  cancelHref?: string;
}) {
  const [state, formAction] = useFormState(action, initialState);

  const [rows, setRows] = useState<Row[]>(() => {
    if (!items || items.length === 0) return [emptyRow()];
    return items.map((item) => ({
      ...emptyRow(),
      name: item.name,
      description: item.description ?? "",
      category: item.category ?? "Other",
      recurring: item.recurring ?? "one_time",
      unit: item.unit ?? "",
      hsn_sac: item.hsn_sac ?? "",
      quantity: String(item.quantity),
      unit_price: String(item.unit_price),
      tax_rate: String(item.tax_rate),
    }));
  });

  const [discount, setDiscount] = useState(String(document?.discount_amount ?? 0));
  const [discountMode, setDiscountMode] = useState<"percent" | "flat">(document?.discount_percent ? "percent" : "flat");
  const [discountPercent, setDiscountPercent] = useState(String(document?.discount_percent ?? 0));
  const [offerCode, setOfferCode] = useState(document?.offer_code ?? "");
  const [region, setRegion] = useState<Region>(document?.region ?? "IN");
  const [currency, setCurrency] = useState(document?.currency || defaults.currency || "INR");
  const [billTo, setBillTo] = useState<BillTo>(() => {
    const preset = !document && initialClientId ? clients.find((client) => client.id === initialClientId) : undefined;
    return {
      client_id: document?.client_id ?? preset?.id ?? "",
      name: document?.client_name ?? preset?.name ?? "",
      email: document?.client_email ?? preset?.email ?? "",
      phone: document?.client_phone ?? preset?.phone ?? "",
      gstin: document?.client_gstin ?? preset?.gstin ?? "",
      address: document?.client_address ?? preset?.address ?? "",
    };
  });
  function pickClient(id: string) {
    const client = clients.find((entry) => entry.id === id);
    if (!client) {
      setBillTo((current) => ({ ...current, client_id: "" }));
      return;
    }
    setBillTo({
      client_id: client.id,
      name: client.name,
      email: client.email ?? "",
      phone: client.phone ?? "",
      gstin: client.gstin ?? "",
      address: client.address ?? "",
    });
    if (!document && client.region && client.region !== region) changeRegion(client.region);
  }

  const lockedStatus = document && ["paid", "partially_paid"].includes(document.status) ? document.status : null;
  const statusOptions = DOC_STATUSES.filter((status) => MANUAL_STATUSES[docType].includes(status.value));

  const lineItems = useMemo(() => rows.map(toLineItem), [rows]);
  const oneOffSubtotal = useMemo(
    () => lineItems.filter((item) => item.recurring === "one_time").reduce((sum, item) => sum + item.quantity * item.unit_price, 0),
    [lineItems]
  );
  const activeOffer = offers.find((offer) => offer.code === offerCode) ?? null;
  const offerCheck = activeOffer ? evaluateOffer(activeOffer, lineItems, region) : null;
  const effectiveDiscount =
    offerCheck && offerCheck.ok
      ? offerCheck.discount
      : discountMode === "percent"
        ? Math.round(oneOffSubtotal * (Math.min(100, Math.max(0, Number(discountPercent) || 0)) / 100) * 100) / 100
        : Number(discount) || 0;
  const totals = useMemo(() => calculateTotals(lineItems, effectiveDiscount), [lineItems, effectiveDiscount]);
  const addedNames = useMemo(() => {
    const map = new Map<string, number>();
    for (const row of rows) if (row.name.trim()) map.set(row.name, (map.get(row.name) ?? 0) + (Number(row.quantity) || 0));
    return map;
  }, [rows]);
  const recurring = useMemo(() => recurringTotals(lineItems), [lineItems]);

  function updateRow(key: string, patch: Partial<Row>) {
    setRows((current) => current.map((row) => (row.key === key ? { ...row, ...patch } : row)));
  }

  /** Replaces the placeholder empty row the editor starts with. */
  function appendRow(row: Row) {
    setRows((current) => {
      const meaningful = current.filter((entry) => entry.name.trim() !== "");
      return [...meaningful, row];
    });
  }

  function changeRegion(next: Region) {
    setRegion(next);
    setCurrency(currencyForRegion(next));
  }

  function addPreset(presetId: string) {
    const preset = presets.find((entry) => entry.id === presetId);
    if (!preset) return;

    const price = region === "INT" ? preset.unit_price_intl : preset.unit_price;

    const existing = rows.find((row) => row.name === preset.name && row.unit_price === String(price));
    if (existing) {
      updateRow(existing.key, { quantity: String((Number(existing.quantity) || 0) + 1) });
      return;
    }

    appendRow({
      ...emptyRow(),
      name: preset.name,
      description: preset.description ?? (preset.price_from ? "Starting price; final scope may vary." : ""),
      category: preset.category ?? "Other",
      recurring: preset.recurring ?? "one_time",
      unit: preset.unit ?? "",
      hsn_sac: preset.hsn_sac ?? "",
      quantity: "1",
      unit_price: String(price),
      tax_rate: String(preset.tax_rate ?? 0),
    });
  }

  function addPackage(packageId: string) {
    const preset = packages.find((entry) => entry.id === packageId);
    if (!preset) return;

    const price = region === "INT" ? preset.price_intl : preset.price_inr;
    const scope = (preset.includes ?? []).map((entry) => `• ${entry}`).join("\n");

    appendRow({
      ...emptyRow(),
      name: preset.name,
      description: [preset.description, scope].filter(Boolean).join("\n"),
      category: preset.category,
      recurring: preset.recurring,
      unit: preset.recurring === "one_time" ? "package" : preset.recurring === "monthly" ? "month" : "year",
      quantity: "1",
      unit_price: String(price),
    });
  }

  const label = docType === "invoice" ? "Invoice" : "Quote";

  return (
    <form action={formAction} className="space-y-8">
      <input type="hidden" name="doc_type" value={docType} />
      <input type="hidden" name="region" value={region} />
      {document && <input type="hidden" name="__id" value={document.id} />}
      {document && <input type="hidden" name="number" value={document.number} />}

      <section className="rounded-card border border-border bg-surface p-5">
        <h2 className="font-display text-lg font-semibold text-ink-900">{label} details</h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <label htmlFor="number-display" className="block text-sm font-medium text-ink-900">
              Number
            </label>
            <input
              id="number-display"
              value={document?.number ?? "Generated on save"}
              readOnly
              className={`${inputClass} text-text-primary/60`}
            />
          </div>
          <div>
            <label htmlFor="status" className="block text-sm font-medium text-ink-900">
              Status
            </label>
            {canSetStatus && lockedStatus ? (
              <>
                <input type="hidden" name="status" value={lockedStatus} />
                <input
                  id="status"
                  value={`${STATUS_LABELS[lockedStatus]} — follows recorded payments`}
                  readOnly
                  className={`${inputClass} text-text-primary/60`}
                />
              </>
            ) : canSetStatus ? (
              <select
                id="status"
                name="status"
                defaultValue={
                  document && MANUAL_STATUSES[docType].includes(document.status) ? document.status : "draft"
                }
                className={inputClass}
              >
                {statusOptions.map((status) => (
                  <option key={status.value} value={status.value}>
                    {status.label}
                  </option>
                ))}
              </select>
            ) : (
              <input
                id="status"
                value="Draft — sent for review"
                readOnly
                className={`${inputClass} text-text-primary/60`}
              />
            )}
          </div>
          <div>
            <label htmlFor="issue_date" className="block text-sm font-medium text-ink-900">
              Issue date
            </label>
            <input
              id="issue_date"
              name="issue_date"
              type="date"
              defaultValue={document?.issue_date ?? new Date().toISOString().slice(0, 10)}
              className={inputClass}
            />
          </div>
          <div>
            <label htmlFor="due_date" className="block text-sm font-medium text-ink-900">
              {docType === "invoice" ? "Due date" : "Valid until"}
            </label>
            <input
              id="due_date"
              name="due_date"
              type="date"
              defaultValue={document?.due_date ?? ""}
              className={inputClass}
            />
          </div>
          <div>
            <label htmlFor="region" className="block text-sm font-medium text-ink-900">
              Pricing region
            </label>
            <select
              id="region"
              value={region}
              onChange={(event) => changeRegion(event.target.value as Region)}
              className={inputClass}
            >
              {REGIONS.map((entry) => (
                <option key={entry.value} value={entry.value}>
                  {entry.label}
                </option>
              ))}
            </select>
            <p className="mt-1 text-xs text-text-primary/60">
              Catalog items are added at the {region === "INT" ? "international" : "India"} price.
            </p>
          </div>
        </div>
      </section>

      <section className="rounded-card border border-border bg-surface p-5">
        <h2 className="font-display text-lg font-semibold text-ink-900">Bill to</h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          {clients.length > 0 && (
            <div className="sm:col-span-2">
              <label htmlFor="client_id" className="block text-sm font-medium text-ink-900">
                Client account
              </label>
              <select
                id="client_id"
                name="client_id"
                value={billTo.client_id}
                onChange={(event) => pickClient(event.target.value)}
                className={inputClass}
              >
                <option value="">New client (type the details below)</option>
                {clients.map((client) => (
                  <option key={client.id} value={client.id}>
                    {client.name}
                    {client.contact_name ? ` — ${client.contact_name}` : ""}
                  </option>
                ))}
              </select>
              <p className="mt-1 text-xs text-text-primary/60">
                Picking an account fills in the details below. Linked documents show in the client&apos;s account and
                portal once sent.
              </p>
            </div>
          )}
          {canSetStatus && !billTo.client_id && (
            <label className="flex items-center gap-2 text-sm text-ink-900 sm:col-span-2">
              <input type="checkbox" name="create_client" defaultChecked className="h-4 w-4 accent-brand-700" />
              Create a client account for this client (or reuse one with the same name)
            </label>
          )}
          <div>
            <label htmlFor="client_name" className="block text-sm font-medium text-ink-900">
              Client name <span className="text-error">*</span>
            </label>
            <input
              id="client_name"
              name="client_name"
              required
              value={billTo.name}
              onChange={(event) => setBillTo((current) => ({ ...current, name: event.target.value }))}
              className={inputClass}
            />
          </div>
          <div>
            <label htmlFor="client_email" className="block text-sm font-medium text-ink-900">
              Email
            </label>
            <input
              id="client_email"
              name="client_email"
              type="email"
              value={billTo.email}
              onChange={(event) => setBillTo((current) => ({ ...current, email: event.target.value }))}
              className={inputClass}
            />
          </div>
          <div>
            <label htmlFor="client_phone" className="block text-sm font-medium text-ink-900">
              Phone
            </label>
            <input
              id="client_phone"
              name="client_phone"
              value={billTo.phone}
              onChange={(event) => setBillTo((current) => ({ ...current, phone: event.target.value }))}
              className={inputClass}
            />
          </div>
          <div>
            <label htmlFor="client_gstin" className="block text-sm font-medium text-ink-900">
              GSTIN
            </label>
            <input
              id="client_gstin"
              name="client_gstin"
              value={billTo.gstin}
              onChange={(event) => setBillTo((current) => ({ ...current, gstin: event.target.value }))}
              className={inputClass}
            />
          </div>
          <div className="sm:col-span-2">
            <label htmlFor="client_address" className="block text-sm font-medium text-ink-900">
              Address
            </label>
            <textarea
              id="client_address"
              name="client_address"
              rows={3}
              value={billTo.address}
              onChange={(event) => setBillTo((current) => ({ ...current, address: event.target.value }))}
              className={inputClass}
            />
          </div>
        </div>
      </section>

      <section className="rounded-card border border-border bg-surface p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="font-display text-lg font-semibold text-ink-900">Line items</h2>
        </div>

        <CatalogPicker
          presets={presets}
          packages={packages}
          region={region}
          added={addedNames}
          onAddItem={addPreset}
          onAddPackage={addPackage}
        />

        {presets.length === 0 && (
          <p className="mt-3 text-sm text-text-primary/70">
            No catalog items yet.{" "}
            <Link href="/admin/billing-items/new" className="text-brand-700 underline">
              Create one
            </Link>{" "}
            to reuse prices across documents.
          </p>
        )}

        <div className="mt-4 space-y-4">
          {rows.map((row, index) => {
            const lineTotal = (Number(row.quantity) || 0) * (Number(row.unit_price) || 0);

            return (
              <div key={row.key} className="rounded-card border border-border p-4">
                <div className="grid gap-3 lg:grid-cols-12">
                  <div className="lg:col-span-5">
                    <label htmlFor={`item-name-${row.key}`} className="block text-sm font-medium text-ink-900">
                      Item
                    </label>
                    <input
                      id={`item-name-${row.key}`}
                      name={`items[${index}][name]`}
                      value={row.name}
                      onChange={(event) => updateRow(row.key, { name: event.target.value })}
                      className={inputClass}
                    />
                  </div>
                  <div className="lg:col-span-2">
                    <label htmlFor={`item-qty-${row.key}`} className="block text-sm font-medium text-ink-900">
                      Qty
                    </label>
                    <input
                      id={`item-qty-${row.key}`}
                      name={`items[${index}][quantity]`}
                      type="number"
                      step="0.01"
                      min="0"
                      value={row.quantity}
                      onChange={(event) => updateRow(row.key, { quantity: event.target.value })}
                      className={inputClass}
                    />
                  </div>
                  <div className="lg:col-span-2">
                    <label htmlFor={`item-price-${row.key}`} className="block text-sm font-medium text-ink-900">
                      Unit price
                    </label>
                    <input
                      id={`item-price-${row.key}`}
                      name={`items[${index}][unit_price]`}
                      type="number"
                      step="0.01"
                      min="0"
                      value={row.unit_price}
                      onChange={(event) => updateRow(row.key, { unit_price: event.target.value })}
                      className={inputClass}
                    />
                  </div>
                  <div className="lg:col-span-2">
                    <label htmlFor={`item-tax-${row.key}`} className="block text-sm font-medium text-ink-900">
                      Tax %
                    </label>
                    <input
                      id={`item-tax-${row.key}`}
                      name={`items[${index}][tax_rate]`}
                      type="number"
                      step="0.01"
                      min="0"
                      max="100"
                      value={row.tax_rate}
                      onChange={(event) => updateRow(row.key, { tax_rate: event.target.value })}
                      className={inputClass}
                    />
                  </div>
                  <div className="flex items-end justify-end lg:col-span-1">
                    <button
                      type="button"
                      onClick={() => setRows((current) => (current.length === 1 ? current : current.filter((entry) => entry.key !== row.key)))}
                      disabled={rows.length === 1}
                      aria-label={`Remove line ${index + 1}`}
                      className="mb-1 rounded-card border border-border p-2 text-text-primary/70 hover:bg-canvas-warm disabled:opacity-40"
                    >
                      <Trash2 aria-hidden="true" className="h-4 w-4" />
                    </button>
                  </div>
                </div>

                <div className="mt-3 grid gap-3 lg:grid-cols-12">
                  <div className="lg:col-span-6">
                    <label htmlFor={`item-desc-${row.key}`} className="block text-sm font-medium text-ink-900">
                      Description
                    </label>
                    <textarea
                      id={`item-desc-${row.key}`}
                      name={`items[${index}][description]`}
                      rows={row.description.includes("\n") ? 5 : 1}
                      value={row.description}
                      onChange={(event) => updateRow(row.key, { description: event.target.value })}
                      className={inputClass}
                    />
                  </div>
                  <div className="lg:col-span-3">
                    <label htmlFor={`item-cat-${row.key}`} className="block text-sm font-medium text-ink-900">
                      Category
                    </label>
                    <select
                      id={`item-cat-${row.key}`}
                      name={`items[${index}][category]`}
                      value={row.category}
                      onChange={(event) => updateRow(row.key, { category: event.target.value })}
                      className={inputClass}
                    >
                      {CATEGORY_OPTIONS.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="lg:col-span-3">
                    <label htmlFor={`item-recurring-${row.key}`} className="block text-sm font-medium text-ink-900">
                      Billing cycle
                    </label>
                    <select
                      id={`item-recurring-${row.key}`}
                      name={`items[${index}][recurring]`}
                      value={row.recurring}
                      onChange={(event) => updateRow(row.key, { recurring: event.target.value as Recurring })}
                      className={inputClass}
                    >
                      {RECURRING_OPTIONS.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="mt-3 grid gap-3 lg:grid-cols-12">
                  <div className="lg:col-span-3">
                    <label htmlFor={`item-unit-${row.key}`} className="block text-sm font-medium text-ink-900">
                      Unit
                    </label>
                    <input
                      id={`item-unit-${row.key}`}
                      name={`items[${index}][unit]`}
                      value={row.unit}
                      onChange={(event) => updateRow(row.key, { unit: event.target.value })}
                      className={inputClass}
                    />
                  </div>
                  <div className="lg:col-span-3">
                    <label htmlFor={`item-hsn-${row.key}`} className="block text-sm font-medium text-ink-900">
                      HSN / SAC
                    </label>
                    <input
                      id={`item-hsn-${row.key}`}
                      name={`items[${index}][hsn_sac]`}
                      value={row.hsn_sac}
                      onChange={(event) => updateRow(row.key, { hsn_sac: event.target.value })}
                      className={inputClass}
                    />
                  </div>
                  <div className="flex items-end justify-end lg:col-span-6">
                    <p className="pb-2 text-sm font-medium text-ink-900">
                      {formatMoney(lineTotal, currency)}
                      {row.recurring === "monthly" ? " / month" : row.recurring === "yearly" ? " / year" : ""}
                    </p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        <button
          type="button"
          onClick={() => setRows((current) => [...current, emptyRow()])}
          className="mt-4 rounded-card border border-border px-4 py-2 text-sm font-medium text-ink-900 hover:bg-canvas-warm"
        >
          Add line
        </button>
      </section>

      <section className="rounded-card border border-border bg-surface p-5">
        <h2 className="font-display text-lg font-semibold text-ink-900">Totals</h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="currency" className="block text-sm font-medium text-ink-900">
              Currency
            </label>
            <input
              id="currency"
              name="currency"
              value={currency}
              onChange={(event) => setCurrency(event.target.value.toUpperCase())}
              className={inputClass}
            />
          </div>
          <div>
            <span className="block text-sm font-medium text-ink-900">Discount</span>
            <input type="hidden" name="discount_amount" value={effectiveDiscount} />
            <input type="hidden" name="discount_percent" value={!activeOffer && discountMode === "percent" ? discountPercent : activeOffer?.kind === "percent" ? String(activeOffer.value) : ""} />
            <input type="hidden" name="offer_code" value={offerCheck && offerCheck.ok ? offerCode : ""} />
            <div className="mt-1 flex gap-2">
              <div className="flex rounded-card border border-border bg-surface p-0.5 text-sm" role="group" aria-label="Discount type">
                {(["percent", "flat"] as const).map((mode) => (
                  <button
                    key={mode}
                    type="button"
                    disabled={Boolean(activeOffer)}
                    onClick={() => setDiscountMode(mode)}
                    className={`rounded-card px-3 py-1 disabled:opacity-40 ${discountMode === mode ? "bg-ink-900 text-text-inverse" : "text-ink-900"}`}
                  >
                    {mode === "percent" ? "%" : currency}
                  </button>
                ))}
              </div>
              {discountMode === "percent" ? (
                <input
                  aria-label="Discount percent"
                  type="number"
                  step="0.5"
                  min="0"
                  max="100"
                  disabled={Boolean(activeOffer)}
                  value={discountPercent}
                  onChange={(event) => setDiscountPercent(event.target.value)}
                  className={`${inputClass} mt-0 disabled:opacity-40`}
                />
              ) : (
                <input
                  aria-label="Discount amount"
                  type="number"
                  step="0.01"
                  min="0"
                  disabled={Boolean(activeOffer)}
                  value={discount}
                  onChange={(event) => setDiscount(event.target.value)}
                  className={`${inputClass} mt-0 disabled:opacity-40`}
                />
              )}
            </div>
            {discountMode === "percent" && !activeOffer && Number(discountPercent) > 0 && (
              <p className="mt-1 text-xs text-text-primary/60">= {formatMoney(effectiveDiscount, currency)} off the one-time items</p>
            )}
          </div>
          {offers.length > 0 && (
            <div className="sm:col-span-2">
              <label htmlFor="offer" className="block text-sm font-medium text-ink-900">
                Offer / promo code
              </label>
              <select id="offer" value={offerCode} onChange={(event) => setOfferCode(event.target.value)} className={inputClass}>
                <option value="">No offer</option>
                {offers.map((offer) => {
                  const check = evaluateOffer(offer, lineItems, region);
                  return (
                    <option key={offer.id} value={offer.code}>
                      {offer.code} — {offer.title} ({offer.kind === "percent" ? `${offer.value}%` : formatMoney(offer.value, currency)})
                      {check.ok ? ` · saves ${formatMoney(check.discount, currency)}` : " · not applicable"}
                    </option>
                  );
                })}
              </select>
              {activeOffer && offerCheck && (
                <p className={`mt-1 text-xs ${offerCheck.ok ? "text-success" : "text-error"}`}>
                  {offerCheck.ok
                    ? `${activeOffer.description ?? activeOffer.title} — ${formatMoney(offerCheck.discount, currency)} off. Replaces the manual discount.`
                    : `Not applicable: ${offerCheck.reason}`}
                </p>
              )}
            </div>
          )}
        </div>

        <dl className="mt-5 space-y-2 border-t border-border pt-4 text-sm">
          <div className="flex justify-between">
            <dt className="text-text-primary/70">Subtotal</dt>
            <dd className="text-ink-900">{formatMoney(totals.subtotal, currency)}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-text-primary/70">
              Discount
              {offerCheck && offerCheck.ok ? ` (${offerCode})` : discountMode === "percent" && Number(discountPercent) > 0 ? ` (${discountPercent}%)` : ""}
            </dt>
            <dd className="text-ink-900">−{formatMoney(totals.discount, currency)}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-text-primary/70">Tax</dt>
            <dd className="text-ink-900">{formatMoney(totals.taxAmount, currency)}</dd>
          </div>
          <div className="flex justify-between border-t border-border pt-2 text-base font-semibold">
            <dt className="text-ink-900">Project total</dt>
            <dd className="text-ink-900">{formatMoney(totals.total, currency)}</dd>
          </div>
          {recurring.map((entry) => (
            <div key={entry.cycle} className="flex justify-between text-sm">
              <dt className="text-text-primary/70">{entry.label} services</dt>
              <dd className="text-ink-900">
                {formatMoney(entry.amount, currency)}
                {entry.suffix}
              </dd>
            </div>
          ))}
        </dl>

        {recurring.length > 0 && (
          <p className="mt-3 text-xs text-text-primary/60">
            Recurring services are quoted separately and are not part of the project total.
          </p>
        )}
      </section>

      <section className="rounded-card border border-border bg-surface p-5">
        <h2 className="font-display text-lg font-semibold text-ink-900">Notes and terms</h2>
        <div className="mt-4 space-y-4">
          <div>
            <label htmlFor="notes" className="block text-sm font-medium text-ink-900">
              Notes
            </label>
            <textarea id="notes" name="notes" rows={3} defaultValue={document?.notes ?? ""} className={inputClass} />
          </div>
          <div>
            <label htmlFor="terms" className="block text-sm font-medium text-ink-900">
              Terms
            </label>
            <textarea
              id="terms"
              name="terms"
              rows={4}
              defaultValue={document?.terms ?? defaults.terms}
              className={inputClass}
            />
          </div>
        </div>
      </section>

      {state.message && (
        <p role="status" className={`text-sm ${state.ok ? "text-success" : "text-error"}`}>
          {state.message}
        </p>
      )}

      <div className="flex items-center gap-3 border-t border-border pt-5">
        <SubmitButton>Save {label.toLowerCase()}</SubmitButton>
        <Link href={cancelHref ?? (document ? `/admin/billing/${document.id}` : "/admin/billing")} className="text-sm text-text-primary/70 underline">
          Cancel
        </Link>
      </div>
    </form>
  );
}
