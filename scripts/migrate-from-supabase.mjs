#!/usr/bin/env node
/**
 * One-time move from Supabase to Cloudflare D1 + R2.
 *
 *   node scripts/migrate-from-supabase.mjs [--users-file auth-users.csv] [--users-only] [--skip-media] [--out migration-data.sql]
 *
 * Reads SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY from the environment or from
 * .env.local. Password hashes come from either:
 *   --users-file  a CSV/JSON export of auth.users from the Supabase SQL editor, or
 *   SUPABASE_DB_URL  a Postgres connection string.
 *
 * 1. Reads every application table through the Supabase REST API.
 * 2. Reads login accounts (with their bcrypt password hashes) from auth.users,
 *    so everyone keeps their current password under Better Auth.
 * 3. Copies every file in the `public-media` storage bucket to the R2 bucket
 *    `lynvo-media` and rewrites stored URLs to /media/<path>.
 * 4. Writes one SQL file of INSERTs for D1.
 *
 * Then load it:  npx wrangler d1 execute lynvo-db --remote --file migration-data.sql
 *
 * The SQL file contains personal data and password hashes: it is gitignored —
 * delete it once the import is verified. Nothing in Supabase is changed.
 */
import { readFileSync, writeFileSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { execFileSync } from "node:child_process";

const args = process.argv.slice(2);
const usersOnly = args.includes("--users-only");
const skipMedia = args.includes("--skip-media") || usersOnly;
const usersFile = args.includes("--users-file") ? args[args.indexOf("--users-file") + 1] : null;
const out = args.includes("--out") ? args[args.indexOf("--out") + 1] : "migration-data.sql";
const R2_BUCKET = "lynvo-media";
const MEDIA_BUCKET = "public-media";

// Fall back to the old .env.local so no keys need to be typed.
try {
  for (const line of readFileSync(".env.local", "utf8").split(/\r?\n/)) {
    const match = /^\s*([A-Z0-9_]+)\s*=\s*"?([^"]*)"?\s*$/.exec(line);
    if (match && !process.env[match[1]]) process.env[match[1]] = match[2];
  }
} catch {
  // No .env.local: rely on the environment.
}

const SUPABASE_URL = (process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || "").replace(/\/+$/, "");
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const DB_URL = process.env.SUPABASE_DB_URL;
if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error("Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY (or keep them in .env.local).");
  process.exit(1);
}

const headers = { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}` };

// Table order and generated columns come from the D1 schema itself.
const schema = readFileSync("migrations/0001_init.sql", "utf8");
const tables = [...schema.matchAll(/create table if not exists "(\w+)" \(/g)].map((m) => m[1]).filter((t) => !["user", "session", "account", "verification"].includes(t));
const generated = { billing_documents: ["balance_due"] };
const columnsOf = (table) => {
  const block = schema.slice(schema.indexOf(`create table if not exists "${table}" (`)).split("\n);")[0];
  return [...block.matchAll(/^\s+"(\w+)" (\w+)([^\n]*)/gm)].map((m) => ({
    name: m[1],
    type: m[2],
    // Optional links are filled in a second pass, so tables that point at each other load in any order.
    deferred: /REFERENCES/.test(m[3]) && !/NOT NULL/.test(m[3]),
  }));
};

const OLD_MEDIA = `${SUPABASE_URL}/storage/v1/object/public/${MEDIA_BUCKET}/`;
const rewrite = (value) => (typeof value === "string" ? value.split(OLD_MEDIA).join("/media/") : value);

function literal(value, type) {
  if (value === null || value === undefined) return "NULL";
  if (typeof value === "boolean") return value ? "1" : "0";
  if (typeof value === "number") return Number.isFinite(value) ? String(value) : "NULL";
  if (typeof value === "object") return `'${rewrite(JSON.stringify(value)).replace(/'/g, "''")}'`;
  if (type === "INTEGER" && (value === "true" || value === "false")) return value === "true" ? "1" : "0";
  return `'${String(rewrite(value)).replace(/'/g, "''")}'`;
}

async function fetchAll(table) {
  const rows = [];
  for (let from = 0; ; from += 1000) {
    const response = await fetch(`${SUPABASE_URL}/rest/v1/${table}?select=*`, {
      headers: { ...headers, Range: `${from}-${from + 999}`, "Range-Unit": "items", Prefer: "count=none" },
    });
    if (!response.ok) throw new Error(`${table}: ${response.status} ${await response.text()}`);
    const page = await response.json();
    rows.push(...page);
    if (page.length < 1000) return rows;
  }
}

/** Minimal CSV parser (quoted fields, embedded commas / quotes / newlines). */
function parseCsv(text) {
  const rows = [];
  let row = [];
  let field = "";
  let quoted = false;
  for (let i = 0; i < text.length; i += 1) {
    const char = text[i];
    if (quoted) {
      if (char === '"' && text[i + 1] === '"') {
        field += '"';
        i += 1;
      } else if (char === '"') quoted = false;
      else field += char;
    } else if (char === '"') quoted = true;
    else if (char === ",") {
      row.push(field);
      field = "";
    } else if (char === "\n" || char === "\r") {
      if (char === "\r" && text[i + 1] === "\n") i += 1;
      row.push(field);
      if (row.some((cell) => cell !== "")) rows.push(row);
      row = [];
      field = "";
    } else field += char;
  }
  row.push(field);
  if (row.some((cell) => cell !== "")) rows.push(row);
  const [header, ...body] = rows;
  return body.map((cells) => Object.fromEntries(header.map((name, index) => [name.trim(), cells[index] === "" || cells[index] === "NULL" ? null : cells[index]])));
}

function usersFromFile(path) {
  const text = readFileSync(path, "utf8").replace(/^\uFEFF/, "");
  const rows = text.trim().startsWith("[") ? JSON.parse(text) : parseCsv(text);
  const users = rows.filter((row) => row.id && row.email);
  if (users.length === 0) throw new Error(`${path} has no rows with id and email columns.`);
  return users;
}

async function authUsers() {
  if (usersFile) return usersFromFile(usersFile);
  if (!DB_URL) {
    console.warn("! SUPABASE_DB_URL not set: logins are copied without passwords (everyone must use 'Forgot password').");
    const users = [];
    for (let page = 1; ; page += 1) {
      const response = await fetch(`${SUPABASE_URL}/auth/v1/admin/users?page=${page}&per_page=1000`, { headers });
      const body = await response.json();
      users.push(...(body.users ?? []));
      if (!body.users || body.users.length < 1000) break;
    }
    return users.map((u) => ({ id: u.id, email: u.email, encrypted_password: null, email_confirmed_at: u.email_confirmed_at, created_at: u.created_at, updated_at: u.updated_at, name: u.user_metadata?.full_name ?? u.user_metadata?.name ?? null }));
  }
  const { default: pg } = await import("pg");
  const client = new pg.Client({ connectionString: DB_URL, ssl: { rejectUnauthorized: false } });
  await client.connect();
  const { rows } = await client.query(
    "select id, email, encrypted_password, email_confirmed_at, created_at, updated_at, coalesce(raw_user_meta_data->>'full_name', raw_user_meta_data->>'name') as name from auth.users where deleted_at is null"
  );
  await client.end();
  return rows;
}

async function listMedia(prefix = "") {
  const response = await fetch(`${SUPABASE_URL}/storage/v1/object/list/${MEDIA_BUCKET}`, {
    method: "POST",
    headers: { ...headers, "Content-Type": "application/json" },
    body: JSON.stringify({ prefix, limit: 1000, offset: 0 }),
  });
  if (!response.ok) throw new Error(`storage list ${prefix}: ${response.status}`);
  const entries = await response.json();
  const files = [];
  for (const entry of entries) {
    const path = prefix ? `${prefix}/${entry.name}` : entry.name;
    if (entry.id === null) files.push(...(await listMedia(path)));
    else files.push({ path, type: entry.metadata?.mimetype ?? "application/octet-stream" });
  }
  return files;
}

async function copyMedia() {
  const files = await listMedia();
  console.log(`• Copying ${files.length} files to R2 bucket ${R2_BUCKET}...`);
  const dir = mkdtempSync(join(tmpdir(), "lynvo-media-"));
  let copied = 0;
  try {
    for (const file of files) {
      const response = await fetch(`${SUPABASE_URL}/storage/v1/object/${MEDIA_BUCKET}/${file.path.split("/").map(encodeURIComponent).join("/")}`, { headers });
      if (!response.ok) {
        console.warn(`  ! skipped ${file.path} (${response.status})`);
        continue;
      }
      const local = join(dir, "file");
      writeFileSync(local, Buffer.from(await response.arrayBuffer()));
      execFileSync(
        process.platform === "win32" ? "npx.cmd" : "npx",
        ["wrangler", "r2", "object", "put", `${R2_BUCKET}/${file.path}`, "--file", local, "--content-type", file.type, "--remote"],
        { stdio: "ignore", shell: process.platform === "win32" }
      );
      copied += 1;
      if (copied % 25 === 0) console.log(`  ${copied}/${files.length}`);
    }
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
  console.log(`  ${copied} files copied.`);
}

const statements = [];
const linkUpdates = [];

console.log("• Reading login accounts...");
const users = await authUsers();
const now = new Date().toISOString();
for (const user of users) {
  if (!user.email) continue;
  const created = new Date(user.created_at ?? now).toISOString();
  const updated = new Date(user.updated_at ?? now).toISOString();
  statements.push(
    `INSERT OR REPLACE INTO "user" (id, name, email, emailVerified, createdAt, updatedAt) VALUES (${literal(user.id)}, ${literal(user.name || user.email)}, ${literal(String(user.email).toLowerCase())}, ${user.email_confirmed_at ? 1 : 0}, ${literal(created)}, ${literal(updated)});`
  );
  statements.push(
    `INSERT OR REPLACE INTO "account" (id, accountId, providerId, userId, password, createdAt, updatedAt) VALUES (${literal(`credential-${user.id}`)}, ${literal(user.id)}, 'credential', ${literal(user.id)}, ${literal(user.encrypted_password || null)}, ${literal(created)}, ${literal(updated)});`
  );
}
const withPasswords = users.filter((user) => user.encrypted_password).length;
console.log(`  ${users.length} accounts, ${withPasswords} with password hashes.`);

let total = 0;
for (const table of usersOnly ? [] : tables) {
  const rows = await fetchAll(table);
  const columns = columnsOf(table).filter((column) => !(generated[table] ?? []).includes(column.name));
  const pk = table === "role_permissions" ? ["role", "permission"] : table === "staff_permissions" ? ["user_id", "permission"] : table === "site_settings" ? ["key"] : ["id"];
  for (const row of rows) {
    const present = columns.filter((column) => column.name in row);
    statements.push(
      `INSERT OR REPLACE INTO "${table}" (${present.map((c) => `"${c.name}"`).join(", ")}) VALUES (${present
        .map((c) => (c.deferred ? "NULL" : literal(row[c.name], c.type)))
        .join(", ")});`
    );
    const links = present.filter((c) => c.deferred && row[c.name] !== null && row[c.name] !== undefined);
    if (links.length) {
      linkUpdates.push(
        `UPDATE "${table}" SET ${links.map((c) => `"${c.name}" = ${literal(row[c.name], c.type)}`).join(", ")} WHERE ${pk
          .map((key) => `"${key}" = ${literal(row[key])}`)
          .join(" AND ")};`
      );
    }
  }
  total += rows.length;
  console.log(`  ${table}: ${rows.length}`);
}

statements.push(...linkUpdates);
writeFileSync(out, statements.join("\n") + "\n");
console.log(`• Wrote ${statements.length} statements (${total} rows) to ${out}.`);

if (!skipMedia) await copyMedia();

console.log(`\nNext:\n  npx wrangler d1 execute lynvo-db --remote --file ${out}\nThen delete ${out}.`);
