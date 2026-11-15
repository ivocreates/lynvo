import "server-only";

import { hasPermission, myClientId } from "./context";
import { refreshDocumentPayments } from "./hooks";
import type { DbResult } from "./query";
import type { Client } from "./server";

/** The Postgres functions the app calls through db.rpc(). */
export async function runRpc(client: Client, name: string, args: Record<string, unknown>): Promise<DbResult> {
  const ok = (data: unknown): DbResult => ({ data, error: null, count: null, status: 200 });
  const failure = (message: string, code = "P0001"): DbResult => ({ data: null, error: { message, code }, count: null, status: 400 });
  const { ctx } = client;

  switch (name) {
    case "refresh_billing_document_payments": {
      if (!ctx.bypass && !hasPermission(ctx, "billing.manage")) return ok(null);
      await refreshDocumentPayments(client.system(), args.doc);
      return ok(null);
    }

    case "client_accept_quote": {
      const clientId = myClientId(ctx);
      if (!clientId) return failure("Only a client can accept a quote");
      const signer = String(args.signer ?? "").trim() || null;
      const { data: quote } = await client
        .system()
        .from("billing_documents")
        .select("id")
        .eq("id", args.doc)
        .eq("client_id", clientId)
        .eq("doc_type", "quote")
        .eq("status", "sent")
        .maybeSingle();
      if (!quote) return ok(false);
      const { error } = await client
        .withFlags(["client_accept"])
        .from("billing_documents")
        .update({ status: "accepted", accepted_at: new Date().toISOString(), accepted_by_name: signer })
        .eq("id", args.doc);
      return error ? failure(error.message) : ok(true);
    }

    case "client_sign_agreement": {
      const clientId = myClientId(ctx);
      if (!clientId) return failure("Only a client can sign");
      const signer = String(args.signer ?? "").trim();
      if (signer.length < 2) return failure("A name is required");
      const system = (client.system() as Client).withFlags(["agreement_sign"]);
      const { data: agreement } = await system.from("client_agreements").select("id").eq("id", args.agreement).eq("client_id", clientId).eq("status", "sent").maybeSingle();
      if (!agreement) return ok(false);
      const { error } = await system
        .from("client_agreements")
        .update({ status: "signed", signer_name: signer, signer_designation: String(args.designation ?? "").trim() || null, signed_at: new Date().toISOString() })
        .eq("id", args.agreement);
      return error ? failure(error.message) : ok(true);
    }

    case "verify_certificate": {
      const code = String(args.p_code ?? "").trim().toUpperCase();
      const { data } = await client
        .system()
        .from("certificates")
        .select("code, cert_type, status, recipient_name, role_title, department, start_date, end_date, summary, skills, issued_on")
        .eq("code", code)
        .in("status", ["issued", "revoked"])
        .limit(1);
      return ok(data ?? []);
    }

    default:
      return failure(`Unknown function ${name}`, "PGRST202");
  }
}
