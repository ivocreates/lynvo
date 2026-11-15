import "server-only";

import type { D1Binding } from "./cloudflare";
import { TABLES, type ColumnKind } from "./meta";
import type { DbContext } from "./context";
import { POLICIES, type Clause } from "./policies";
import { HOOKS } from "./hooks";
import { DbFailure } from "./errors";

/**
 * A Supabase/PostgREST-compatible query builder on Cloudflare D1.
 *
 * The app was written against `db.from(table).select().eq()...`; this
 * keeps that surface so pages only change their import. Row-level security is
 * enforced here from lib/db/policies.ts and the old Postgres triggers run from
 * lib/db/hooks.ts, so access rules live in one place.
 */

export type DbError = { message: string; code: string; details?: string };
export type DbResult<T = any> = { data: T; error: DbError | null; count: number | null; status: number };

export { DbFailure };

/** Columns computed by the database; never written. */
const GENERATED: Record<string, string[]> = { billing_documents: ["balance_due"] };

const quote = (name: string) => `"${name.replace(/"/g, '""')}"`;

function meta(table: string) {
  const entry = TABLES[table];
  if (!entry) throw new DbFailure(`Unknown table ${table}`, "42P01");
  return entry;
}

function kindOf(table: string, column: string): ColumnKind {
  return meta(table).columns[column] ?? "text";
}

function assertColumn(table: string, column: string) {
  if (!(column in meta(table).columns)) {
    throw new DbFailure(`Could not find the '${column}' column of '${table}'`, "PGRST204");
  }
}

/** JS value -> D1 parameter. */
export function encode(table: string, column: string, value: unknown): unknown {
  if (value === undefined) return null;
  if (value === null) return null;
  const kind = kindOf(table, column);
  if (kind === "bool") return value === true || value === 1 || value === "true" ? 1 : 0;
  if (kind === "json") return typeof value === "string" && column !== "value" ? value : JSON.stringify(value);
  if (kind === "int" || kind === "num") return typeof value === "string" && value.trim() !== "" ? Number(value) : value;
  if (value instanceof Date) return value.toISOString();
  return value;
}

/** D1 row -> JS row. */
export function decode(table: string, row: Record<string, unknown>) {
  const columns = meta(table).columns;
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(row)) {
    const kind = columns[key];
    if (value === null || value === undefined) out[key] = null;
    else if (kind === "bool") out[key] = value === 1 || value === true || value === "1";
    else if (kind === "json") {
      try {
        out[key] = typeof value === "string" ? JSON.parse(value) : value;
      } catch {
        out[key] = value;
      }
    } else out[key] = value;
  }
  return out;
}

function mapSqliteError(error: unknown): DbError {
  const message = error instanceof Error ? error.message : String(error);
  if (error instanceof DbFailure) return { message: error.message, code: error.code };
  if (/UNIQUE constraint failed/i.test(message)) return { message: `duplicate key value violates unique constraint (${message})`, code: "23505" };
  if (/CHECK constraint failed/i.test(message)) return { message: `new row violates check constraint (${message})`, code: "23514" };
  if (/FOREIGN KEY constraint failed/i.test(message)) return { message: `violates foreign key constraint (${message})`, code: "23503" };
  if (/NOT NULL constraint failed/i.test(message)) return { message: `null value violates not-null constraint (${message})`, code: "23502" };
  if (/no such column/i.test(message)) return { message, code: "42703" };
  return { message, code: "XX000" };
}

type Filter = { sql: string; params: unknown[] };
type Order = { column: string; ascending: boolean; nullsFirst?: boolean };
type Op = "select" | "insert" | "update" | "upsert" | "delete";

/** Splits on commas that are not inside parentheses. */
function splitTop(input: string) {
  const parts: string[] = [];
  let depth = 0;
  let current = "";
  for (const char of input) {
    if (char === "(") depth += 1;
    if (char === ")") depth -= 1;
    if (char === "," && depth === 0) {
      parts.push(current.trim());
      current = "";
    } else current += char;
  }
  if (current.trim()) parts.push(current.trim());
  return parts;
}

export interface Executor {
  db: D1Binding;
  ctx: DbContext;
  /** Same database with policies off, for hooks (Postgres SECURITY DEFINER). */
  system(): Executor;
  from(table: string): Query;
}

export class Query<T = any> implements PromiseLike<DbResult<T>> {
  private op: Op = "select";
  private columns = "*";
  private returning: string | null = null;
  private filters: Filter[] = [];
  private orders: Order[] = [];
  private limitCount: number | null = null;
  private offsetCount: number | null = null;
  private mode: "many" | "single" | "maybe" = "many";
  private countMode: "exact" | null = null;
  private head = false;
  private values: Record<string, unknown>[] = [];
  private conflict: string[] = [];

  constructor(private exec: Executor, private table: string) {
    meta(table);
  }

  // ---------------------------------------------------------------------
  // Builders
  // ---------------------------------------------------------------------

  select(columns = "*", options?: { count?: "exact" | "planned" | "estimated"; head?: boolean }) {
    if (this.op === "select") {
      this.columns = columns;
      if (options?.count) this.countMode = "exact";
      if (options?.head) this.head = true;
    } else {
      this.returning = columns;
    }
    return this as unknown as Query<any>;
  }

  insert(values: Record<string, unknown> | Record<string, unknown>[]) {
    this.op = "insert";
    this.values = Array.isArray(values) ? values : [values];
    return this;
  }

  upsert(values: Record<string, unknown> | Record<string, unknown>[], options?: { onConflict?: string }) {
    this.op = "upsert";
    this.values = Array.isArray(values) ? values : [values];
    this.conflict = (options?.onConflict ?? meta(this.table).pk.join(",")).split(",").map((entry) => entry.trim());
    return this;
  }

  update(values: Record<string, unknown>) {
    this.op = "update";
    this.values = [values];
    return this;
  }

  delete() {
    this.op = "delete";
    return this;
  }

  private add(sql: string, params: unknown[] = []) {
    this.filters.push({ sql, params });
    return this;
  }

  private col(column: string) {
    assertColumn(this.table, column);
    return `${quote(this.table)}.${quote(column)}`;
  }

  eq(column: string, value: unknown) {
    return value === null ? this.add(`${this.col(column)} IS NULL`) : this.add(`${this.col(column)} = ?`, [encode(this.table, column, value)]);
  }
  neq(column: string, value: unknown) {
    return value === null ? this.add(`${this.col(column)} IS NOT NULL`) : this.add(`${this.col(column)} <> ?`, [encode(this.table, column, value)]);
  }
  gt(column: string, value: unknown) {
    return this.add(`${this.col(column)} > ?`, [encode(this.table, column, value)]);
  }
  gte(column: string, value: unknown) {
    return this.add(`${this.col(column)} >= ?`, [encode(this.table, column, value)]);
  }
  lt(column: string, value: unknown) {
    return this.add(`${this.col(column)} < ?`, [encode(this.table, column, value)]);
  }
  lte(column: string, value: unknown) {
    return this.add(`${this.col(column)} <= ?`, [encode(this.table, column, value)]);
  }
  in(column: string, values: readonly unknown[]) {
    if (values.length === 0) return this.add("0");
    return this.add(`${this.col(column)} IN (${values.map(() => "?").join(", ")})`, values.map((value) => encode(this.table, column, value)));
  }
  is(column: string, value: null | boolean) {
    if (value === null) return this.add(`${this.col(column)} IS NULL`);
    return this.add(`${this.col(column)} = ?`, [value ? 1 : 0]);
  }
  like(column: string, pattern: string) {
    return this.add(`${this.col(column)} LIKE ? ESCAPE '\\'`, [pattern]);
  }
  ilike(column: string, pattern: string) {
    return this.add(`lower(${this.col(column)}) LIKE lower(?) ESCAPE '\\'`, [pattern]);
  }
  match(criteria: Record<string, unknown>) {
    for (const [column, value] of Object.entries(criteria)) this.eq(column, value);
    return this;
  }
  filter(column: string, operator: string, value: unknown) {
    const condition = this.condition(column, operator, value);
    return this.add(condition.sql, condition.params);
  }
  not(column: string, operator: string, value: unknown) {
    const condition = this.condition(column, operator, value);
    return this.add(`NOT (${condition.sql})`, condition.params);
  }
  /** PostgREST `or` syntax: "a.eq.1,b.ilike.%x%". */
  or(expression: string) {
    const parts = splitTop(expression).map((part) => {
      const first = part.indexOf(".");
      const second = part.indexOf(".", first + 1);
      if (first < 0 || second < 0) throw new DbFailure(`Invalid or() filter: ${part}`, "PGRST100");
      const column = part.slice(0, first);
      let operator = part.slice(first + 1, second);
      let value: unknown = part.slice(second + 1);
      let negate = false;
      if (operator === "not") {
        negate = true;
        const third = part.indexOf(".", second + 1);
        operator = part.slice(second + 1, third);
        value = part.slice(third + 1);
      }
      const condition = this.condition(column, operator, value);
      return negate ? { sql: `NOT (${condition.sql})`, params: condition.params } : condition;
    });
    return this.add(`(${parts.map((part) => part.sql).join(" OR ")})`, parts.flatMap((part) => part.params));
  }

  private condition(column: string, operator: string, raw: unknown): Filter {
    const ref = this.col(column);
    const value = typeof raw === "string" ? raw : raw;
    switch (operator) {
      case "eq":
        return value === "null" || value === null ? { sql: `${ref} IS NULL`, params: [] } : { sql: `${ref} = ?`, params: [encode(this.table, column, coerce(value))] };
      case "neq":
        return { sql: `${ref} <> ?`, params: [encode(this.table, column, coerce(value))] };
      case "gt":
      case "gte":
      case "lt":
      case "lte": {
        const symbol = { gt: ">", gte: ">=", lt: "<", lte: "<=" }[operator];
        return { sql: `${ref} ${symbol} ?`, params: [encode(this.table, column, coerce(value))] };
      }
      case "like":
        return { sql: `${ref} LIKE ?`, params: [String(value).replace(/\*/g, "%")] };
      case "ilike":
        return { sql: `lower(${ref}) LIKE lower(?)`, params: [String(value).replace(/\*/g, "%")] };
      case "is":
        if (value === null || value === "null") return { sql: `${ref} IS NULL`, params: [] };
        return { sql: `${ref} = ?`, params: [value === true || value === "true" ? 1 : 0] };
      case "in": {
        const list = Array.isArray(value)
          ? value
          : String(value).replace(/^\(|\)$/g, "").split(",").map((entry) => entry.trim().replace(/^"|"$/g, ""));
        if (list.length === 0) return { sql: "0", params: [] };
        return { sql: `${ref} IN (${list.map(() => "?").join(", ")})`, params: list.map((entry) => encode(this.table, column, entry)) };
      }
      default:
        throw new DbFailure(`Unsupported filter operator ${operator}`, "PGRST100");
    }
  }

  order(column: string, options?: { ascending?: boolean; nullsFirst?: boolean; foreignTable?: string }) {
    assertColumn(this.table, column);
    this.orders.push({ column, ascending: options?.ascending ?? true, nullsFirst: options?.nullsFirst });
    return this;
  }
  limit(count: number) {
    this.limitCount = count;
    return this;
  }
  range(from: number, to: number) {
    this.offsetCount = from;
    this.limitCount = to - from + 1;
    return this;
  }
  single() {
    this.mode = "single";
    return this as unknown as Query<any>;
  }
  maybeSingle() {
    this.mode = "maybe";
    return this as unknown as Query<any>;
  }

  then<R1 = DbResult<T>, R2 = never>(
    onfulfilled?: ((value: DbResult<T>) => R1 | PromiseLike<R1>) | null,
    onrejected?: ((reason: unknown) => R2 | PromiseLike<R2>) | null
  ): PromiseLike<R1 | R2> {
    return this.execute().then(onfulfilled, onrejected);
  }

  // ---------------------------------------------------------------------
  // Execution
  // ---------------------------------------------------------------------

  private policyClause(command: "select" | "update" | "delete"): Filter {
    const { ctx } = this.exec;
    if (ctx.bypass) return { sql: "1", params: [] };
    const policy = POLICIES[this.table];
    const clauses: Clause[] = (policy?.[command]?.(ctx) ?? []).filter((clause) => clause !== false);
    if (clauses.some((clause) => clause === true)) return { sql: "1", params: [] };
    const real = clauses.filter((clause): clause is { sql: string; params: unknown[] } => typeof clause === "object");
    if (real.length === 0) return { sql: "0", params: [] };
    return { sql: `(${real.map((clause) => `(${clause.sql})`).join(" OR ")})`, params: real.flatMap((clause) => clause.params) };
  }

  private where(command: "select" | "update" | "delete") {
    const parts = [this.policyClause(command), ...this.filters];
    return { sql: parts.map((part) => `(${part.sql})`).join(" AND "), params: parts.flatMap((part) => part.params) };
  }

  private orderSql() {
    if (this.orders.length === 0) return "";
    return (
      " ORDER BY " +
      this.orders
        .map((order) => {
          const nullsFirst = order.nullsFirst ?? !order.ascending; // Postgres default
          return `${quote(this.table)}.${quote(order.column)} ${order.ascending ? "ASC" : "DESC"} NULLS ${nullsFirst ? "FIRST" : "LAST"}`;
        })
        .join(", ")
    );
  }

  private parseColumns(spec: string) {
    const plain: string[] = [];
    const nested: { relation: string; via: string; columns: string }[] = [];
    let star = false;
    for (const part of splitTop(spec)) {
      const relation = /^(\w+)(?:!\w+)?\(([\s\S]*)\)$/.exec(part);
      if (relation) {
        const [, name, columns] = relation;
        const via = Object.entries(meta(this.table).relations).find(([, target]) => target === name)?.[0];
        if (!via) throw new DbFailure(`Could not find a relationship between '${this.table}' and '${name}'`, "PGRST200");
        nested.push({ relation: name, via, columns: columns.trim() || "*" });
      } else if (part === "*") star = true;
      else {
        assertColumn(this.table, part);
        plain.push(part);
      }
    }
    return { star, plain, nested };
  }

  private async execute(): Promise<DbResult<T>> {
    try {
      switch (this.op) {
        case "select":
          return await this.runSelect();
        case "insert":
          return await this.runInsert(this.values);
        case "upsert":
          return await this.runUpsert();
        case "update":
          return await this.runUpdate();
        case "delete":
          return await this.runDelete();
      }
    } catch (error) {
      return { data: null as T, error: mapSqliteError(error), count: null, status: 400 };
    }
  }

  private shape(rows: Record<string, unknown>[]): DbResult<T> {
    if (this.mode === "many") return { data: rows as T, error: null, count: this.countMode ? rows.length : null, status: 200 };
    if (rows.length > 1) {
      return { data: null as T, error: { message: "JSON object requested, multiple (or no) rows returned", code: "PGRST116" }, count: null, status: 406 };
    }
    if (rows.length === 0) {
      return this.mode === "maybe"
        ? { data: null as T, error: null, count: null, status: 200 }
        : { data: null as T, error: { message: "JSON object requested, multiple (or no) rows returned", code: "PGRST116" }, count: null, status: 406 };
    }
    return { data: rows[0] as T, error: null, count: null, status: 200 };
  }

  private async runSelect(columnSpec = this.columns): Promise<DbResult<T>> {
    const where = this.where("select");
    if (this.head && this.countMode) {
      const row = await this.exec.db.prepare(`SELECT count(*) AS c FROM ${quote(this.table)} WHERE ${where.sql}`).bind(...where.params).first<{ c: number }>();
      return { data: null as T, error: null, count: Number(row?.c ?? 0), status: 200 };
    }

    const { star, plain, nested } = this.parseColumns(columnSpec);
    const fetch = new Set(plain);
    for (const entry of nested) fetch.add(entry.via);
    const list = star ? "*" : [...fetch].map((column) => `${quote(this.table)}.${quote(column)}`).join(", ") || "*";
    let sql = `SELECT ${list} FROM ${quote(this.table)} WHERE ${where.sql}${this.orderSql()}`;
    const params = [...where.params];
    if (this.mode !== "many") sql += " LIMIT 2";
    else if (this.limitCount !== null) {
      sql += " LIMIT ?";
      params.push(this.limitCount);
      if (this.offsetCount !== null) {
        sql += " OFFSET ?";
        params.push(this.offsetCount);
      }
    }

    const result = await this.exec.db.prepare(sql).bind(...params).all();
    const rows = result.results.map((row) => decode(this.table, row as Record<string, unknown>));

    for (const entry of nested) {
      const ids = [...new Set(rows.map((row) => row[entry.via]).filter((value) => value !== null && value !== undefined))];
      const target = TABLES[entry.relation];
      const pk = target.pk[0] ?? "id";
      const childColumns = entry.columns === "*" ? "*" : [...new Set([...splitTop(entry.columns), pk])].join(", ");
      const related = ids.length ? ((await this.exec.from(entry.relation).select(childColumns).in(pk, ids)).data as Record<string, unknown>[] | null) ?? [] : [];
      const byId = new Map(related.map((row) => [row[pk], row]));
      for (const row of rows) {
        const match = byId.get(row[entry.via]) ?? null;
        if (match && entry.columns !== "*" && !splitTop(entry.columns).includes(pk)) {
          const { [pk]: _drop, ...rest } = match;
          row[entry.relation] = rest;
        } else row[entry.relation] = match;
      }
      if (!star && !plain.includes(entry.via)) for (const row of rows) delete row[entry.via];
    }

    const shaped = this.shape(rows);
    if (this.countMode && this.mode === "many") shaped.count = rows.length;
    return shaped;
  }

  private writable(row: Record<string, unknown>) {
    const generated = GENERATED[this.table] ?? [];
    const out: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(row)) {
      if (value === undefined || generated.includes(key)) continue;
      assertColumn(this.table, key);
      out[key] = value;
    }
    return out;
  }

  private async afterWrite(rows: Record<string, unknown>[]): Promise<DbResult<T>> {
    if (this.returning === null) return { data: null as T, error: null, count: null, status: 201 };
    const pk = meta(this.table).pk;
    if (rows.length === 0) return this.shape([]);
    // Re-read so generated columns and relations are included.
    const reader = this.exec.system().from(this.table).select(this.returning);
    if (pk.length === 1) reader.in(pk[0], rows.map((row) => row[pk[0]]));
    const { data, error } = await reader;
    if (error) return { data: null as T, error, count: null, status: 400 };
    return this.shape((data as Record<string, unknown>[]) ?? []);
  }

  private async runInsert(input: Record<string, unknown>[]): Promise<DbResult<T>> {
    const { ctx } = this.exec;
    const system = this.exec.system();
    const tableMeta = meta(this.table);
    const hooks = HOOKS[this.table];
    const inserted: Record<string, unknown>[] = [];

    for (const original of input) {
      const row = this.writable({ ...original });
      if (tableMeta.pk.length === 1 && tableMeta.pk[0] === "id" && tableMeta.columns.id === "text" && !row.id) row.id = crypto.randomUUID();
      if (hooks?.beforeInsert) await hooks.beforeInsert(system, ctx, row);
      if (!ctx.bypass) {
        const allowed = await POLICIES[this.table]?.insert?.(ctx, row, system);
        if (!allowed) throw new DbFailure(`new row violates row-level security policy for table "${this.table}"`, "42501");
      }
      const columns = Object.keys(row);
      const statement = `INSERT INTO ${quote(this.table)} (${columns.map(quote).join(", ")}) VALUES (${columns.map(() => "?").join(", ")}) RETURNING *`;
      const created = await this.exec.db.prepare(statement).bind(...columns.map((column) => encode(this.table, column, row[column]))).first();
      const decoded = decode(this.table, created as Record<string, unknown>);
      inserted.push(decoded);
      if (hooks?.afterInsert) await hooks.afterInsert(system, ctx, decoded);
    }
    return this.afterWrite(inserted);
  }

  private async runUpdate(): Promise<DbResult<T>> {
    const { ctx } = this.exec;
    const system = this.exec.system();
    const tableMeta = meta(this.table);
    const hooks = HOOKS[this.table];
    const changes = this.writable(this.values[0] ?? {});
    const where = this.where("update");
    const targets = (await this.exec.db.prepare(`SELECT * FROM ${quote(this.table)} WHERE ${where.sql}`).bind(...where.params).all()).results.map((row) =>
      decode(this.table, row as Record<string, unknown>)
    );

    const updated: Record<string, unknown>[] = [];
    for (const old of targets) {
      const next: Record<string, unknown> = { ...old, ...changes };
      if ("updated_at" in tableMeta.columns && !("updated_at" in changes)) next.updated_at = new Date().toISOString();
      if (hooks?.beforeUpdate) await hooks.beforeUpdate(system, ctx, old, next);
      if (!ctx.bypass) {
        const check = POLICIES[this.table]?.updateCheck;
        const allowed = check ? await check(ctx, next, system) : true;
        if (!allowed) throw new DbFailure(`new row violates row-level security policy for table "${this.table}"`, "42501");
      }
      const generated = GENERATED[this.table] ?? [];
      const columns = Object.keys(next).filter(
        (column) => !generated.includes(column) && column in tableMeta.columns && JSON.stringify(next[column]) !== JSON.stringify(old[column])
      );
      if (columns.length > 0) {
        const keyFilter = tableMeta.pk.map((key) => `${quote(key)} = ?`).join(" AND ");
        await this.exec.db
          .prepare(`UPDATE ${quote(this.table)} SET ${columns.map((column) => `${quote(column)} = ?`).join(", ")} WHERE ${keyFilter}`)
          .bind(...columns.map((column) => encode(this.table, column, next[column])), ...tableMeta.pk.map((key) => old[key]))
          .run();
      }
      updated.push(next);
      if (hooks?.afterUpdate) await hooks.afterUpdate(system, ctx, old, next);
    }
    return this.afterWrite(updated);
  }

  private async runDelete(): Promise<DbResult<T>> {
    const { ctx } = this.exec;
    const system = this.exec.system();
    const tableMeta = meta(this.table);
    const hooks = HOOKS[this.table];
    const where = this.where("delete");
    const targets = (await this.exec.db.prepare(`SELECT * FROM ${quote(this.table)} WHERE ${where.sql}`).bind(...where.params).all()).results.map((row) =>
      decode(this.table, row as Record<string, unknown>)
    );
    for (const old of targets) {
      if (hooks?.beforeDelete) await hooks.beforeDelete(system, ctx, old);
      const keyFilter = tableMeta.pk.map((key) => `${quote(key)} = ?`).join(" AND ");
      await this.exec.db.prepare(`DELETE FROM ${quote(this.table)} WHERE ${keyFilter}`).bind(...tableMeta.pk.map((key) => old[key])).run();
      if (hooks?.afterDelete) await hooks.afterDelete(system, ctx, old);
    }
    if (this.returning !== null) return this.shape(targets);
    return { data: null as T, error: null, count: null, status: 204 };
  }

  private async runUpsert(): Promise<DbResult<T>> {
    const results: Record<string, unknown>[] = [];
    const returning = this.returning;
    for (const row of this.values) {
      const lookup = this.exec.system().from(this.table).select("*");
      for (const column of this.conflict) lookup.eq(column, row[column] ?? null);
      const { data: existing } = await lookup.limit(1);
      if (Array.isArray(existing) && existing.length > 0) {
        const updater = this.exec.from(this.table).update(row);
        for (const column of this.conflict) updater.eq(column, row[column] ?? null);
        const { error } = await updater;
        if (error) return { data: null as T, error, count: null, status: 400 };
        results.push({ ...existing[0], ...row });
      } else {
        const inserter = new Query(this.exec, this.table);
        const { error } = await inserter.insert(row);
        if (error) return { data: null as T, error, count: null, status: 400 };
        results.push(row);
      }
    }
    this.returning = returning;
    return this.afterWrite(results);
  }
}

function coerce(value: unknown) {
  if (value === "true") return true;
  if (value === "false") return false;
  return value;
}
