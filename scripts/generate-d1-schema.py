"""
Generates the D1 (SQLite) schema and the column metadata used by lib/db from
the Supabase PostgREST OpenAPI description.

  python scripts/generate-d1-schema.py openapi.json

Writes migrations/0001_init.sql and lib/db/meta.ts. Re-run only when porting
from a Supabase schema; afterwards evolve D1 with new numbered migrations.
"""
import json
import re
import sys

spec = json.load(open(sys.argv[1], encoding="utf-8"))
defs = spec["definitions"]

# ON DELETE behaviour from the Postgres migrations (default: CASCADE for NOT NULL, SET NULL otherwise).
CASCADE = {
    ("billing_document_items", "document_id"),
    ("billing_payments", "document_id"),
    ("client_engagements", "client_id"),
    ("client_milestones", "engagement_id"),
    ("client_deliverables", "engagement_id"),
    ("client_reports", "client_id"),
    ("client_subscriptions", "client_id"),
    ("client_agreements", "client_id"),
    ("crm_activities", "lead_id"),
    ("staff_permissions", "user_id"),
    ("staff_documents", "recipient_id"),
}

GENERATED = {("billing_documents", "balance_due"): "total - amount_paid"}

# Unique / lookup indexes that the app relies on.
INDEXES = """
create unique index if not exists services_slug_idx on services (lower(slug));
create unique index if not exists projects_slug_idx on projects (lower(slug));
create unique index if not exists blog_posts_slug_idx on blog_posts (lower(slug));
create unique index if not exists job_openings_slug_idx on job_openings (lower(slug));
create unique index if not exists billing_documents_number_idx on billing_documents (lower(number));
create index if not exists billing_documents_client_idx on billing_documents (client_id, issue_date);
create index if not exists billing_documents_source_quote_idx on billing_documents (source_quote_id);
create index if not exists billing_document_items_doc_idx on billing_document_items (document_id, position);
create unique index if not exists billing_items_code_idx on billing_items (code);
create unique index if not exists billing_packages_code_idx on billing_packages (code);
create unique index if not exists billing_offers_code_idx on billing_offers (upper(code));
create index if not exists billing_payments_document_idx on billing_payments (document_id, paid_on);
create index if not exists billing_payments_client_idx on billing_payments (client_id, paid_on);
create unique index if not exists client_agreements_reference_idx on client_agreements (lower(reference)) where reference is not null;
create unique index if not exists staff_documents_reference_idx on staff_documents (lower(reference)) where reference is not null;
create index if not exists staff_documents_recipient_idx on staff_documents (recipient_id, status);
create unique index if not exists certificates_code_idx on certificates (code);
create index if not exists client_engagements_client_idx on client_engagements (client_id);
create index if not exists crm_leads_status_idx on crm_leads (status, next_follow_up);
create index if not exists crm_activities_lead_idx on crm_activities (lead_id, occurred_at);
create index if not exists ledger_entries_date_idx on ledger_entries (entry_date);
create index if not exists audit_logs_created_idx on audit_logs (created_at);
create index if not exists staff_tasks_assignee_idx on staff_tasks (assignee_id, status);
create index if not exists profiles_client_idx on profiles (client_id);
create unique index if not exists profiles_email_idx on profiles (lower(email));
"""

# Better Auth core tables (sqlite), see https://www.better-auth.com/docs/concepts/database
AUTH_TABLES = """
create table if not exists "user" (
  id text primary key not null,
  name text not null,
  email text not null unique,
  emailVerified integer not null default 0,
  image text,
  createdAt date not null,
  updatedAt date not null
);

create table if not exists "session" (
  id text primary key not null,
  expiresAt date not null,
  token text not null unique,
  createdAt date not null,
  updatedAt date not null,
  ipAddress text,
  userAgent text,
  userId text not null references "user" (id) on delete cascade
);
create index if not exists session_user_idx on "session" (userId);

create table if not exists "account" (
  id text primary key not null,
  accountId text not null,
  providerId text not null,
  userId text not null references "user" (id) on delete cascade,
  accessToken text,
  refreshToken text,
  idToken text,
  accessTokenExpiresAt date,
  refreshTokenExpiresAt date,
  scope text,
  password text,
  createdAt date not null,
  updatedAt date not null
);
create index if not exists account_user_idx on "account" (userId);

create table if not exists "verification" (
  id text primary key not null,
  identifier text not null,
  value text not null,
  expiresAt date not null,
  createdAt date,
  updatedAt date
);
create index if not exists verification_identifier_idx on "verification" (identifier);
"""


def column_kind(prop):
    fmt = prop.get("format", "")
    typ = prop.get("type", "")
    if typ == "array":
        return "json"
    if fmt in ("jsonb", "json"):
        return "json"
    if typ == "boolean" or fmt == "boolean":
        return "bool"
    if fmt in ("integer", "bigint", "smallint"):
        return "int"
    if fmt in ("numeric", "real", "double precision"):
        return "num"
    return "text"


SQL_TYPE = {"json": "TEXT", "bool": "INTEGER", "int": "INTEGER", "num": "REAL", "text": "TEXT"}


def sql_default(prop, kind):
    if "default" not in prop:
        return None
    raw = str(prop["default"])
    if raw in ("now()", "CURRENT_TIMESTAMP"):
        return "(strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))"
    if raw in ("CURRENT_DATE",):
        return "(date('now'))"
    if raw.startswith("gen_random_uuid") or raw.startswith("public.generate"):
        return None  # generated by the app
    if kind == "bool":
        return "1" if raw == "true" else "0"
    if kind == "json":
        if raw.startswith("'{}'::text[]") or raw.startswith("'{}'"):
            return "'[]'" if prop.get("type") == "array" else "'{}'"
        if raw.startswith("'[]'"):
            return "'[]'"
        return None
    if kind in ("int", "num"):
        try:
            float(raw)
            return raw
        except ValueError:
            return None
    m = re.match(r"^'(.*)'(::.*)?$", raw)
    if m:
        return "'" + m.group(1).replace("'", "''") + "'"
    # PostgREST reports plain text defaults without quotes (e.g. draft, INR).
    if kind == "text" and re.match(r"^[\w ./%-]*$", raw) and "(" not in raw:
        return "'" + raw.replace("'", "''") + "'"
    return None


def fk_of(prop):
    m = re.search(r"<fk table='(\w+)' column='(\w+)'", prop.get("description", "") or "")
    return (m.group(1), m.group(2)) if m else None


tables_sql = []
meta = {}
order = []

# Create referenced tables first.
def deps(table):
    return {fk[0] for p in defs[table]["properties"].values() if (fk := fk_of(p)) and fk[0] != table and fk[0] in defs}

done = set()
def visit(table):
    if table in done:
        return
    done.add(table)
    for dep in sorted(deps(table)):
        visit(dep)
    order.append(table)

for table in sorted(defs):
    visit(table)

for table in order:
    props = defs[table]["properties"]
    required = set(defs[table].get("required", []))
    pks = [c for c, p in props.items() if "Primary Key" in (p.get("description") or "")]
    lines = []
    cols = {}
    rels = {}
    for col, prop in props.items():
        kind = column_kind(prop)
        cols[col] = kind
        parts = [f'  "{col}"', SQL_TYPE[kind]]
        if (table, col) in GENERATED:
            parts.append(f"GENERATED ALWAYS AS ({GENERATED[(table, col)]}) VIRTUAL")
            lines.append(" ".join(parts))
            continue
        if len(pks) == 1 and col == pks[0]:
            parts.append("PRIMARY KEY")
        if col in required and col not in pks:
            parts.append("NOT NULL")
        default = sql_default(prop, kind)
        # Array / JSON defaults are not exposed by PostgREST; NOT NULL ones get an empty value.
        if default is None and kind == "json" and col in required:
            default = "'[]'" if prop.get("type") == "array" or col == "includes" else "'{}'"
        if default is not None:
            parts.append(f"DEFAULT {default}")
        if "enum" in prop:
            values = ", ".join("'" + v.replace("'", "''") + "'" for v in prop["enum"])
            parts.append(f'CHECK ("{col}" IN ({values}))')
        fk = fk_of(prop)
        if fk and fk[0] in defs:
            action = "CASCADE" if (table, col) in CASCADE or (col in required and (table, col) not in {("billing_documents", "created_by")}) else "SET NULL"
            parts.append(f'REFERENCES "{fk[0]}" ("{fk[1]}") ON DELETE {action}')
            rels[col] = fk[0]
        lines.append(" ".join(parts))
    if len(pks) > 1:
        lines.append("  PRIMARY KEY (" + ", ".join(f'"{c}"' for c in pks) + ")")
    tables_sql.append(f'create table if not exists "{table}" (\n' + ",\n".join(lines) + "\n);")
    meta[table] = {"columns": cols, "relations": rels, "pk": pks}

header = "-- Generated by scripts/generate-d1-schema.py from the Supabase schema.\n-- LYNVO on Cloudflare D1: application tables, then Better Auth tables.\n\n"
open("migrations/0001_init.sql", "w", encoding="utf-8", newline="\n").write(
    header + "\n\n".join(tables_sql) + "\n" + INDEXES + "\n" + AUTH_TABLES
)

ts = ["/** Generated by scripts/generate-d1-schema.py — column kinds and foreign keys per table. */", "",
      'export type ColumnKind = "text" | "int" | "num" | "bool" | "json";', "",
      "export interface TableMeta {", "  columns: Record<string, ColumnKind>;", "  /** column -> referenced table (many-to-one). */",
      "  relations: Record<string, string>;", "  pk: string[];", "}", "",
      "export const TABLES: Record<string, TableMeta> = " + json.dumps(meta, indent=2) + ";", ""]
open("lib/db/meta.ts", "w", encoding="utf-8", newline="\n").write("\n".join(ts))
print(f"{len(order)} tables")
