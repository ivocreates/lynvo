import "server-only";

import {
  hasPermission,
  isAdmin,
  isManager,
  isStaff,
  isTeamMember,
  myClientId,
  type DbContext,
} from "./context";
import type { Executor } from "./query";

/**
 * Row-level security, ported from the Supabase policies (migrations
 * 0001–0033). Each command returns OR-ed clauses: `true` allows every row,
 * `false` allows none, `{ sql, params }` filters rows. Table name is the
 * unaliased base table, so clauses can reference columns as "table".col.
 *
 * Inserts and update WITH CHECK rules receive the new row (and a system
 * executor for lookups) and return whether it is allowed.
 */

export type Clause = boolean | { sql: string; params: unknown[] };

export interface TablePolicy {
  select?(ctx: DbContext): Clause[];
  insert?(ctx: DbContext, row: Record<string, unknown>, system: Executor): boolean | Promise<boolean>;
  update?(ctx: DbContext): Clause[];
  updateCheck?(ctx: DbContext, row: Record<string, unknown>, system: Executor): boolean | Promise<boolean>;
  delete?(ctx: DbContext): Clause[];
}

const sql = (text: string, ...params: unknown[]): Clause => ({ sql: text, params });
const perm = (ctx: DbContext, permission: string) => hasPermission(ctx, permission);
const CLIENT_VISIBLE_DOCS = "('sent', 'accepted', 'partially_paid', 'paid', 'overdue')";

/** Content tables: public rows readable by anyone; `website` permission manages; admins delete. */
function content(publicFilter: string, extraManage: (ctx: DbContext) => boolean = () => false): TablePolicy {
  const manage = (ctx: DbContext) => perm(ctx, "website") || extraManage(ctx);
  return {
    select: (ctx) => [manage(ctx), sql(publicFilter)],
    insert: (ctx) => manage(ctx),
    update: (ctx) => [manage(ctx)],
    updateCheck: (ctx) => manage(ctx),
    delete: (ctx) => [isAdmin(ctx), manage(ctx)],
  };
}

/** A table fully managed by one permission (or role tier), no other access. */
function managedBy(can: (ctx: DbContext) => boolean, extraRead: (ctx: DbContext) => Clause[] = () => []): TablePolicy {
  return {
    select: (ctx) => [can(ctx), ...extraRead(ctx)],
    insert: (ctx) => can(ctx),
    update: (ctx) => [can(ctx)],
    updateCheck: (ctx) => can(ctx),
    delete: (ctx) => [can(ctx)],
  };
}

async function ownsDraftDocument(ctx: DbContext, documentId: unknown, system: Executor) {
  if (!perm(ctx, "billing.draft") || !documentId) return false;
  const { data } = await system.from("billing_documents").select("id").eq("id", documentId).eq("created_by", ctx.userId).eq("status", "draft").maybeSingle();
  return Boolean(data);
}

async function ownsEngagement(ctx: DbContext, engagementId: unknown, system: Executor) {
  const client = myClientId(ctx);
  if (!client || !engagementId) return false;
  const { data } = await system.from("client_engagements").select("id").eq("id", engagementId).eq("client_id", client).maybeSingle();
  return Boolean(data);
}

export const POLICIES: Record<string, TablePolicy> = {
  // ---------------------------------------------------------------- platform
  profiles: {
    select: (ctx) => [isTeamMember(ctx), ctx.userId ? sql(`"profiles".id = ?`, ctx.userId) : false],
    insert: (ctx) => isAdmin(ctx),
    update: (ctx) => [isAdmin(ctx), isManager(ctx), ctx.userId ? sql(`"profiles".id = ?`, ctx.userId) : false],
    updateCheck: (ctx, row) => isAdmin(ctx) || isManager(ctx) || row.id === ctx.userId,
    delete: (ctx) => [isAdmin(ctx)],
  },
  role_permissions: managedBy(isAdmin, (ctx) => [isTeamMember(ctx)]),
  staff_permissions: managedBy(isAdmin, (ctx) => [isManager(ctx), ctx.userId ? sql(`"staff_permissions".user_id = ?`, ctx.userId) : false]),
  audit_logs: {
    select: (ctx) => [isStaff(ctx)],
    insert: (ctx, row) => isStaff(ctx) || (isTeamMember(ctx) && row.actor_id === ctx.userId),
    update: () => [false],
    delete: () => [false],
  },
  site_settings: {
    select: () => [true],
    insert: (ctx) => isStaff(ctx) || perm(ctx, "website"),
    update: (ctx) => [isStaff(ctx) || perm(ctx, "website")],
    updateCheck: (ctx) => isStaff(ctx) || perm(ctx, "website"),
    delete: (ctx) => [isStaff(ctx) || perm(ctx, "website")],
  },
  seo_settings: content("1"),
  media_assets: {
    select: (ctx) => [sql(`"media_assets".bucket = 'public-media'`), isStaff(ctx), perm(ctx, "website")],
    insert: (ctx) => isTeamMember(ctx),
    update: (ctx) => [isStaff(ctx) || perm(ctx, "website")],
    updateCheck: (ctx) => isStaff(ctx) || perm(ctx, "website"),
    delete: (ctx) => [isAdmin(ctx), perm(ctx, "website")],
  },

  // ---------------------------------------------------------------- website content
  services: content(`"services".active = 1`),
  projects: content(`"projects".status = 'published'`),
  blog_posts: content(`"blog_posts".status = 'published' AND "blog_posts".published_at <= strftime('%Y-%m-%dT%H:%M:%fZ', 'now')`),
  team_members: content(`"team_members".is_active = 1`),
  stats: content(`"stats".active = 1`),
  social_links: content(`"social_links".active = 1`),
  faqs: content(`"faqs".active = 1`),
  job_openings: content(`"job_openings".is_open = 1`),
  reviews: {
    select: (ctx) => [perm(ctx, "website"), sql(`"reviews".status = 'approved'`)],
    insert: (ctx, row) => perm(ctx, "website") || (Boolean(myClientId(ctx)) && row.client_id === myClientId(ctx) && row.status === "pending" && !row.featured),
    update: (ctx) => [perm(ctx, "website")],
    updateCheck: (ctx) => perm(ctx, "website"),
    delete: (ctx) => [isAdmin(ctx), perm(ctx, "website")],
  },
  contacts: {
    select: (ctx) => [isStaff(ctx), perm(ctx, "crm")],
    // Public form: validated in app/actions/contact.ts as well.
    insert: (ctx, row) =>
      isStaff(ctx) ||
      (row.status === "new" &&
        typeof row.name === "string" &&
        row.name.length >= 2 &&
        row.name.length <= 120 &&
        typeof row.message === "string" &&
        row.message.length >= 10 &&
        row.message.length <= 4000 &&
        /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(String(row.email ?? ""))),
    update: (ctx) => [isStaff(ctx), perm(ctx, "crm")],
    updateCheck: (ctx) => isStaff(ctx) || perm(ctx, "crm"),
    delete: (ctx) => [isAdmin(ctx)],
  },
  newsletter_subscribers: {
    select: (ctx) => [isStaff(ctx)],
    insert: (_ctx, row) => /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(String(row.email ?? "")) && String(row.email).length <= 320,
    delete: (ctx) => [isAdmin(ctx)],
  },

  // ---------------------------------------------------------------- team workspace
  staff_tasks: {
    select: (ctx) => [isManager(ctx), ctx.userId ? sql(`"staff_tasks".assignee_id = ? OR "staff_tasks".created_by = ?`, ctx.userId, ctx.userId) : false],
    insert: (ctx) => isManager(ctx),
    update: (ctx) => [isManager(ctx), ctx.userId ? sql(`"staff_tasks".assignee_id = ?`, ctx.userId) : false],
    updateCheck: (ctx, row) => isManager(ctx) || row.assignee_id === ctx.userId,
    delete: (ctx) => [isManager(ctx)],
  },
  staff_notes: {
    select: (ctx) => [
      ctx.userId ? sql(`"staff_notes".author_id = ?`, ctx.userId) : false,
      isTeamMember(ctx) ? sql(`"staff_notes".visibility = 'team'`) : false,
      isManager(ctx) ? sql(`"staff_notes".visibility = 'managers'`) : false,
    ],
    insert: (ctx, row) => isTeamMember(ctx) && row.author_id === ctx.userId,
    update: (ctx) => [ctx.userId ? sql(`"staff_notes".author_id = ?`, ctx.userId) : false],
    updateCheck: (ctx, row) => row.author_id === ctx.userId,
    delete: (ctx) => [isManager(ctx), ctx.userId ? sql(`"staff_notes".author_id = ?`, ctx.userId) : false],
  },
  staff_goals: {
    select: (ctx) => [isTeamMember(ctx)],
    insert: (ctx) => isManager(ctx),
    update: (ctx) => [isManager(ctx), ctx.userId ? sql(`"staff_goals".owner_id = ?`, ctx.userId) : false],
    updateCheck: (ctx, row) => isManager(ctx) || row.owner_id === ctx.userId,
    delete: (ctx) => [isManager(ctx)],
  },
  meetings: managedBy(isManager, (ctx) => [isTeamMember(ctx)]),
  staff_documents: {
    select: (ctx) => {
      if (isManager(ctx)) return [true];
      if (!ctx.userId) return [false];
      const roleClauses: string[] = [];
      if (isTeamMember(ctx)) roleClauses.push(`"staff_documents".audience = 'team'`);
      if (ctx.role && ["employee", "editor", "junior_partner"].includes(ctx.role)) roleClauses.push(`"staff_documents".audience = 'employees'`);
      if (ctx.role === "intern") roleClauses.push(`"staff_documents".audience = 'interns'`);
      const group = roleClauses.length ? ` OR ("staff_documents".recipient_id IS NULL AND (${roleClauses.join(" OR ")}))` : "";
      return [sql(`"staff_documents".status = 'issued' AND ("staff_documents".recipient_id = ?${group})`, ctx.userId)];
    },
    insert: (ctx) => isManager(ctx),
    update: (ctx) => [isManager(ctx), ctx.userId ? sql(`"staff_documents".recipient_id = ? AND "staff_documents".status = 'issued'`, ctx.userId) : false],
    updateCheck: (ctx, row) => isManager(ctx) || row.recipient_id === ctx.userId,
    delete: (ctx) => [isManager(ctx)],
  },
  certificates: {
    select: (ctx) => [isManager(ctx), ctx.userId ? sql(`"certificates".recipient_id = ? AND "certificates".status = 'issued'`, ctx.userId) : false],
    insert: (ctx) => isManager(ctx),
    update: (ctx) => [isManager(ctx)],
    updateCheck: (ctx) => isManager(ctx),
    delete: (ctx) => [isManager(ctx)],
  },

  // ---------------------------------------------------------------- clients
  clients: {
    select: (ctx) => [
      perm(ctx, "clients.manage"),
      perm(ctx, "billing.manage") || perm(ctx, "billing.draft"),
      perm(ctx, "crm"),
      myClientId(ctx) ? sql(`"clients".id = ?`, myClientId(ctx)) : false,
    ],
    insert: (ctx) => perm(ctx, "clients.manage") || perm(ctx, "billing.manage") || perm(ctx, "crm"),
    update: (ctx) => [perm(ctx, "clients.manage")],
    updateCheck: (ctx) => perm(ctx, "clients.manage"),
    delete: (ctx) => [perm(ctx, "clients.manage")],
  },
  client_engagements: managedBy(
    (ctx) => perm(ctx, "clients.manage"),
    (ctx) => [myClientId(ctx) ? sql(`"client_engagements".client_id = ?`, myClientId(ctx)) : false]
  ),
  client_milestones: managedBy(
    (ctx) => perm(ctx, "clients.manage"),
    (ctx) => [
      myClientId(ctx)
        ? sql(
            `"client_milestones".visible_to_client = 1 AND EXISTS (SELECT 1 FROM client_engagements e WHERE e.id = "client_milestones".engagement_id AND e.client_id = ?)`,
            myClientId(ctx)
          )
        : false,
    ]
  ),
  client_deliverables: {
    select: (ctx) => [
      perm(ctx, "clients.manage"),
      myClientId(ctx)
        ? sql(
            `"client_deliverables".visible_to_client = 1 AND EXISTS (SELECT 1 FROM client_engagements e WHERE e.id = "client_deliverables".engagement_id AND e.client_id = ?)`,
            myClientId(ctx)
          )
        : false,
    ],
    insert: (ctx) => perm(ctx, "clients.manage"),
    update: (ctx) => [
      perm(ctx, "clients.manage"),
      myClientId(ctx)
        ? sql(
            `"client_deliverables".visible_to_client = 1 AND EXISTS (SELECT 1 FROM client_engagements e WHERE e.id = "client_deliverables".engagement_id AND e.client_id = ?)`,
            myClientId(ctx)
          )
        : false,
    ],
    updateCheck: (ctx, row, system) => perm(ctx, "clients.manage") || ownsEngagement(ctx, row.engagement_id, system),
    delete: (ctx) => [perm(ctx, "clients.manage")],
  },
  client_reports: managedBy(
    (ctx) => perm(ctx, "clients.manage"),
    (ctx) => [myClientId(ctx) ? sql(`"client_reports".published = 1 AND "client_reports".client_id = ?`, myClientId(ctx)) : false]
  ),
  client_agreements: managedBy(
    (ctx) => perm(ctx, "clients.manage"),
    (ctx) => [myClientId(ctx) ? sql(`"client_agreements".client_id = ? AND "client_agreements".status IN ('sent', 'signed')`, myClientId(ctx)) : false]
  ),

  // ---------------------------------------------------------------- billing
  billing_items: managedBy((ctx) => perm(ctx, "billing.manage"), (ctx) => [isTeamMember(ctx)]),
  billing_packages: managedBy((ctx) => perm(ctx, "billing.manage"), (ctx) => [isTeamMember(ctx)]),
  billing_offers: managedBy((ctx) => perm(ctx, "billing.manage"), (ctx) => [isTeamMember(ctx)]),
  billing_documents: {
    select: (ctx) => [
      perm(ctx, "billing.manage"),
      perm(ctx, "accounts"),
      perm(ctx, "clients.manage") ? sql(`"billing_documents".client_id IS NOT NULL`) : false,
      perm(ctx, "billing.draft") && ctx.userId ? sql(`"billing_documents".created_by = ?`, ctx.userId) : false,
      myClientId(ctx) ? sql(`"billing_documents".client_id = ? AND "billing_documents".status IN ${CLIENT_VISIBLE_DOCS}`, myClientId(ctx)) : false,
    ],
    insert: (ctx, row) =>
      perm(ctx, "billing.manage") ||
      (perm(ctx, "billing.draft") && row.created_by === ctx.userId && row.doc_type === "quote" && (row.status ?? "draft") === "draft"),
    update: (ctx) => [
      perm(ctx, "billing.manage"),
      perm(ctx, "billing.draft") && ctx.userId ? sql(`"billing_documents".created_by = ? AND "billing_documents".status = 'draft'`, ctx.userId) : false,
      // A client accepting their own quote (client_accept_quote).
      ctx.flags.has("client_accept") && myClientId(ctx) ? sql(`"billing_documents".client_id = ?`, myClientId(ctx)) : false,
    ],
    updateCheck: (ctx, row) =>
      perm(ctx, "billing.manage") ||
      (row.created_by === ctx.userId && row.status === "draft") ||
      (ctx.flags.has("client_accept") && row.client_id === myClientId(ctx)),
    delete: (ctx) => [
      perm(ctx, "billing.manage"),
      perm(ctx, "billing.draft") && ctx.userId ? sql(`"billing_documents".created_by = ? AND "billing_documents".status = 'draft'`, ctx.userId) : false,
    ],
  },
  billing_document_items: {
    select: (ctx) => [
      perm(ctx, "billing.manage"),
      perm(ctx, "accounts"),
      perm(ctx, "clients.manage")
        ? sql(`EXISTS (SELECT 1 FROM billing_documents d WHERE d.id = "billing_document_items".document_id AND d.client_id IS NOT NULL)`)
        : false,
      perm(ctx, "billing.draft") && ctx.userId
        ? sql(`EXISTS (SELECT 1 FROM billing_documents d WHERE d.id = "billing_document_items".document_id AND d.created_by = ?)`, ctx.userId)
        : false,
      myClientId(ctx)
        ? sql(
            `EXISTS (SELECT 1 FROM billing_documents d WHERE d.id = "billing_document_items".document_id AND d.client_id = ? AND d.status IN ${CLIENT_VISIBLE_DOCS})`,
            myClientId(ctx)
          )
        : false,
    ],
    insert: (ctx, row, system) => perm(ctx, "billing.manage") || ownsDraftDocument(ctx, row.document_id, system),
    update: (ctx) => [
      perm(ctx, "billing.manage"),
      perm(ctx, "billing.draft") && ctx.userId
        ? sql(
            `EXISTS (SELECT 1 FROM billing_documents d WHERE d.id = "billing_document_items".document_id AND d.created_by = ? AND d.status = 'draft')`,
            ctx.userId
          )
        : false,
    ],
    updateCheck: (ctx, row, system) => perm(ctx, "billing.manage") || ownsDraftDocument(ctx, row.document_id, system),
    delete: (ctx) => [
      perm(ctx, "billing.manage"),
      perm(ctx, "billing.draft") && ctx.userId
        ? sql(
            `EXISTS (SELECT 1 FROM billing_documents d WHERE d.id = "billing_document_items".document_id AND d.created_by = ? AND d.status = 'draft')`,
            ctx.userId
          )
        : false,
    ],
  },
  billing_payments: managedBy(
    (ctx) => perm(ctx, "billing.manage"),
    (ctx) => [
      perm(ctx, "clients.manage"),
      perm(ctx, "accounts"),
      myClientId(ctx) ? sql(`"billing_payments".client_id = ?`, myClientId(ctx)) : false,
    ]
  ),
  client_subscriptions: managedBy(
    (ctx) => perm(ctx, "billing.manage"),
    (ctx) => [
      perm(ctx, "clients.manage"),
      myClientId(ctx) ? sql(`"client_subscriptions".client_id = ? AND "client_subscriptions".status <> 'cancelled'`, myClientId(ctx)) : false,
    ]
  ),

  // ---------------------------------------------------------------- sales & accounts
  crm_leads: managedBy((ctx) => perm(ctx, "crm")),
  crm_activities: managedBy((ctx) => perm(ctx, "crm")),
  // Company letters (migration 0003): anyone holding the `letters` permission (admins always do).
  letters: managedBy((ctx) => perm(ctx, "letters")),
  ledger_entries: managedBy((ctx) => perm(ctx, "accounts")),
};
