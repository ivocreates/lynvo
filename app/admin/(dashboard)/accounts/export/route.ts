import { NextResponse, type NextRequest } from "next/server";
import { getCurrentProfile, can } from "@/lib/auth";
import { csvEscape, fyLabel, fyOf } from "@/lib/accounts";
import { loadFinancialYear } from "@/lib/accounts-data";
import { todayIso } from "@/lib/admin/billing";

/** CSV exports for the CA: the full ledger, or the GST invoice register. */
export async function GET(request: NextRequest) {
  const profile = await getCurrentProfile();
  if (!profile || !(await can(profile, "accounts"))) {
    return new NextResponse("Not allowed", { status: 403 });
  }

  const fyParam = Number(request.nextUrl.searchParams.get("fy"));
  const fy = Number.isInteger(fyParam) && fyParam >= 2015 ? fyParam : fyOf(todayIso());
  const type = request.nextUrl.searchParams.get("type") === "invoices" ? "invoices" : "ledger";
  const { rows, invoices } = await loadFinancialYear(fy);

  let lines: unknown[][];
  if (type === "invoices") {
    lines = [
      ["Invoice no.", "Date", "Client", "Client GSTIN", "Taxable value", "GST", "Invoice total", "Currency"],
      ...invoices.map((doc) => [
        doc.number,
        doc.issue_date,
        doc.client_name,
        doc.client_gstin ?? "",
        (Number(doc.subtotal) - Number(doc.discount_amount)).toFixed(2),
        Number(doc.tax_amount).toFixed(2),
        Number(doc.total).toFixed(2),
        doc.currency,
      ]),
    ];
  } else {
    lines = [
      ["Date", "Type", "Category", "Party", "Party GSTIN", "Description", "Bill / invoice no.", "Total (incl. GST)", "GST", "Net of GST", "TDS", "Currency", "Paid by", "Reference", "Source"],
      ...[...rows]
        .sort((a, b) => a.entry_date.localeCompare(b.entry_date))
        .map((row) => [
          row.entry_date,
          row.entry_type,
          row.category,
          row.party_name ?? "",
          row.party_gstin ?? "",
          row.description ?? "",
          row.bill_number ?? "",
          row.amount.toFixed(2),
          row.gst_amount.toFixed(2),
          (row.amount - row.gst_amount).toFixed(2),
          row.tds_amount.toFixed(2),
          row.currency,
          row.payment_method,
          row.reference ?? "",
          row.source === "invoice" ? "LYNVO invoice payment" : "Manual entry",
        ]),
    ];
  }

  // BOM so Excel opens the ₹ sign and Indian names correctly.
  const csv = "﻿" + lines.map((line) => line.map(csvEscape).join(",")).join("\r\n");
  const filename = `lynvo-${type === "invoices" ? "invoice-register" : "ledger"}-${fyLabel(fy).replace(/\s+/g, "-")}.csv`;

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
}
