import "server-only";

import { isManager, isSuperAdmin, myClientId, hasPermission, type DbContext } from "./context";
import type { Executor } from "./query";
import { DbFailure } from "./errors";

/**
 * The Postgres triggers, as hooks around writes. `system` runs with policies
 * off (SECURITY DEFINER). Throwing DbFailure aborts the write.
 */

type Row = Record<string, unknown>;

export interface TableHooks {
  beforeInsert?(system: Executor, ctx: DbContext, row: Row): Promise<void> | void;
  afterInsert?(system: Executor, ctx: DbContext, row: Row): Promise<void> | void;
  beforeUpdate?(system: Executor, ctx: DbContext, old: Row, next: Row): Promise<void> | void;
  afterUpdate?(system: Executor, ctx: DbContext, old: Row, next: Row): Promise<void> | void;
  beforeDelete?(system: Executor, ctx: DbContext, old: Row): Promise<void> | void;
  afterDelete?(system: Executor, ctx: DbContext, old: Row): Promise<void> | void;
}

const fail = (message: string): never => {
  throw new DbFailure(message);
};

const now = () => new Date().toISOString();

/** Reverts fields a caller is not allowed to change. */
function keep(old: Row, next: Row, fields: string[]) {
  for (const field of fields) next[field] = old[field];
}

/** refresh_billing_document_payments(): amount_paid and paid status follow payments. */
export async function refreshDocumentPayments(system: Executor, documentId: unknown) {
  if (!documentId) return;
  const [{ data: doc }, { data: payments }] = await Promise.all([
    system.from("billing_documents").select("id, doc_type, status, total").eq("id", documentId).maybeSingle(),
    system.from("billing_payments").select("amount, tds_amount").eq("document_id", documentId),
  ]);
  if (!doc) return;
  const paid = Math.round(((payments ?? []) as Row[]).reduce((sum, row) => sum + Number(row.amount) + Number(row.tds_amount ?? 0), 0) * 100) / 100;
  const total = Number(doc.total);
  let status = String(doc.status);
  if (doc.doc_type === "invoice" && !["draft", "cancelled"].includes(status)) {
    if (paid >= total && total > 0) status = "paid";
    else if (paid > 0) status = "partially_paid";
    else if (["paid", "partially_paid"].includes(status)) status = "sent";
  }
  await system.from("billing_documents").update({ amount_paid: paid, status }).eq("id", documentId);
}

export const HOOKS: Record<string, TableHooks> = {
  profiles: {
    async beforeUpdate(system, ctx, old, next) {
      // enforce_profile_privileges + prevent_last_super_admin_removal
      if (!ctx.bypass && (next.role !== old.role || next.is_active !== old.is_active) && !isSuperAdmin(ctx)) {
        fail("Only a super admin can change role or is_active");
      }
      if (!ctx.bypass) {
        next.id = old.id;
        next.email = old.email;
      }
      if (old.role === "super_admin" && (next.role !== "super_admin" || next.is_active === false)) {
        const { count } = await system.from("profiles").select("id", { count: "exact", head: true }).eq("role", "super_admin").eq("is_active", true);
        if ((count ?? 0) <= 1) fail("Cannot remove the last active super admin");
      }
    },
    async beforeDelete(system, _ctx, old) {
      if (old.role === "super_admin" && old.is_active) {
        const { count } = await system.from("profiles").select("id", { count: "exact", head: true }).eq("role", "super_admin").eq("is_active", true);
        if ((count ?? 0) <= 1) fail("Cannot remove the last active super admin");
      }
    },
  },

  billing_documents: {
    beforeUpdate(_system, ctx, old, next) {
      if (!ctx.bypass && ctx.role === "client") {
        if (!ctx.flags.has("client_accept")) fail("Clients cannot modify billing documents");
        // A client may only accept: nothing else changes.
        const allowed = { status: next.status, accepted_at: next.accepted_at, accepted_by_name: next.accepted_by_name, updated_at: next.updated_at };
        Object.assign(next, old, allowed);
        return;
      }
      if (!ctx.bypass && !hasPermission(ctx, "billing.manage")) {
        keep(old, next, ["status", "doc_type", "number", "created_by", "client_id", "amount_paid", "source_quote_id"]);
      }
      if (next.status === "sent" && old.status !== "sent" && !next.sent_at) next.sent_at = now();
      if (next.status === "accepted" && old.status !== "accepted" && !next.accepted_at) next.accepted_at = now();
    },
  },

  billing_payments: {
    async beforeInsert(system, _ctx, row) {
      const { data: doc } = await system.from("billing_documents").select("client_id, currency").eq("id", row.document_id).maybeSingle();
      if (doc) {
        row.client_id = doc.client_id;
        row.currency = doc.currency;
      }
    },
    async beforeUpdate(system, _ctx, _old, next) {
      const { data: doc } = await system.from("billing_documents").select("client_id, currency").eq("id", next.document_id).maybeSingle();
      if (doc) {
        next.client_id = doc.client_id;
        next.currency = doc.currency;
      }
    },
    afterInsert: (system, _ctx, row) => refreshDocumentPayments(system, row.document_id),
    async afterUpdate(system, _ctx, old, next) {
      if (old.document_id !== next.document_id) await refreshDocumentPayments(system, old.document_id);
      await refreshDocumentPayments(system, next.document_id);
    },
    afterDelete: (system, _ctx, old) => refreshDocumentPayments(system, old.document_id),
  },

  client_deliverables: {
    beforeUpdate(_system, ctx, old, next) {
      if (ctx.bypass || hasPermission(ctx, "clients.manage")) return;
      keep(old, next, [
        "engagement_id", "title", "description", "kind", "url", "version", "due_date", "delivered_at", "visible_to_client", "position",
        "file_key", "file_name", "file_size", "file_type", "release_rule", "invoice_id", "released_at", "download_count", "last_downloaded_at",
      ]);
      if (!["approved", "revision_requested"].includes(String(next.status))) fail("A client may only approve or request changes");
      next.reviewed_at = now();
    },
  },

  staff_documents: {
    beforeUpdate(_system, ctx, old, next) {
      if (ctx.bypass || isManager(ctx)) return;
      keep(old, next, [
        "doc_type",
        "status",
        "audience",
        "title",
        "reference",
        "body",
        "recipient_id",
        "issue_date",
        "effective_from",
        "effective_to",
        "created_by",
        "signature_required",
      ]);
    },
  },

  staff_tasks: {
    beforeUpdate(_system, ctx, old, next) {
      if (!ctx.bypass && !isManager(ctx)) {
        keep(old, next, ["title", "description", "priority", "assignee_id", "created_by", "project_id", "due_date", "reviewed_at", "reviewed_by", "review_note"]);
        if (next.status === "approved" && old.status !== "approved") fail("Only a manager can approve a task");
      }
      if (next.status === "working" && old.status !== "working" && !next.started_at) next.started_at = now();
      if (next.status === "completed" && old.status !== "completed") next.completed_at = now();
    },
  },

  client_agreements: {
    beforeUpdate(_system, ctx, old, next) {
      if (old.status === "signed" && !ctx.flags.has("agreement_sign")) {
        keep(old, next, ["body", "title", "field_values", "signer_name", "signer_designation", "signed_at"]);
        if (!["signed", "void"].includes(String(next.status))) next.status = old.status;
      }
      if (next.status === "sent" && old.status !== "sent" && !next.sent_at) next.sent_at = now();
    },
  },

  reviews: {
    async beforeInsert(system, ctx, row) {
      // enforce_client_review_insert: a client's review is attributed to their account and moderated.
      if (ctx.bypass || ctx.role !== "client") return;
      const clientId = myClientId(ctx);
      const { data: client } = clientId ? await system.from("clients").select("name, contact_name").eq("id", clientId).maybeSingle() : { data: null };
      if (!client) fail("A linked client account is required");
      const linked = client as Row;
      row.client_id = clientId;
      row.author_name = String(linked.contact_name ?? "").trim() || linked.name;
      row.author_role = "Client";
      row.status = "pending";
      row.featured = false;
    },
  },

  certificates: {
    async beforeInsert(system, _ctx, row) {
      if (row.code) return;
      const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
      for (let attempt = 0; attempt < 20; attempt += 1) {
        const random = crypto.getRandomValues(new Uint8Array(6));
        const candidate = `LYNVO-${new Date().getFullYear()}-${Array.from(random, (byte) => alphabet[byte % alphabet.length]).join("")}`;
        const { data } = await system.from("certificates").select("id").eq("code", candidate).maybeSingle();
        if (!data) {
          row.code = candidate;
          return;
        }
      }
      fail("Could not allocate a unique certificate code");
    },
  },

  crm_activities: {
    async afterInsert(system, _ctx, activity) {
      // crm_activity_logged: keep the lead's stage, follow-up and last contact current.
      const { data: lead } = await system.from("crm_leads").select("*").eq("id", activity.lead_id).maybeSingle();
      if (!lead) return;
      const contact = ["call", "email", "whatsapp", "meeting", "visit"].includes(String(activity.kind));
      const today = now().slice(0, 10);
      const updates: Row = {};
      if (contact) {
        const occurred = String(activity.occurred_at ?? now());
        updates.last_contacted_at = !lead.last_contacted_at || String(lead.last_contacted_at) < occurred ? occurred : lead.last_contacted_at;
      }
      if (activity.follow_up_on) updates.next_follow_up = activity.follow_up_on;
      else if (contact && lead.next_follow_up && String(lead.next_follow_up) <= today) updates.next_follow_up = null;

      const status = String(lead.status);
      let nextStatus = status;
      if (!["won", "lost"].includes(status)) {
        if (activity.outcome === "meeting_booked") nextStatus = "meeting";
        else if (activity.outcome === "proposal_requested") nextStatus = "proposal";
        else if (activity.outcome === "callback" || activity.follow_up_on) {
          if (["new", "researching", "contacted"].includes(status)) nextStatus = "follow_up";
        } else if (contact && ["new", "researching"].includes(status)) nextStatus = "contacted";
        else if (activity.kind === "research" && status === "new") nextStatus = "researching";
      }
      if (nextStatus !== status) updates.status = nextStatus;
      if (Object.keys(updates).length) await system.from("crm_leads").update(updates).eq("id", activity.lead_id);
    },
  },
};
