import "server-only";

import { cache } from "react";
import { headers } from "next/headers";
import { getDb } from "./cloudflare";
import { ANONYMOUS, SYSTEM, myClientId, type DbContext } from "./context";
import { Query, type Executor, type DbResult } from "./query";
import { runRpc } from "./rpc";
import { getAuth } from "@/lib/better-auth";
import { isRole } from "@/lib/roles";

/**
 * Database clients. `createClient()` acts as the signed-in person (policies
 * apply, like Supabase's anon key + session); `createAdminClient()` bypasses
 * policies (like the service role) and must only be used server-side after an
 * explicit permission check.
 */

export interface Client extends Executor {
  rpc<T = any>(name: string, args?: Record<string, unknown>): Promise<DbResult<T>>;
  /** Runs `fn` with one-off flags (e.g. a client accepting their own quote). */
  withFlags(flags: string[]): Client;
}

function makeClient(ctx: DbContext): Client {
  const db = getDb();
  const client: Client = {
    db,
    ctx,
    system: () => makeClient({ ...ctx, bypass: true }),
    from: (table: string) => new Query(client, table),
    rpc: (name, args = {}) => runRpc(client, name, args),
    withFlags: (flags) => makeClient({ ...ctx, flags: new Set([...ctx.flags, ...flags]) }),
  };
  return client;
}

/** The signed-in person (or anonymous), loaded once per request. */
export const getRequestContext = cache(async (): Promise<DbContext> => {
  // headers() outside the try: it is how Next.js learns the page is dynamic.
  const requestHeaders = headers();
  let session: { user: { id: string } } | null = null;
  try {
    session = (await getAuth().api.getSession({ headers: requestHeaders })) as { user: { id: string } } | null;
  } catch (error) {
    if ((error as { digest?: string })?.digest === "DYNAMIC_SERVER_USAGE") throw error;
    session = null;
  }
  if (!session?.user?.id) return ANONYMOUS;

  const system = makeClient(SYSTEM);
  const { data: profile } = await system.from("profiles").select("id, role, is_active, client_id").eq("id", session.user.id).maybeSingle();
  if (!profile || !isRole(String(profile.role))) return { ...ANONYMOUS, userId: session.user.id };

  const role = profile.role as DbContext["role"];
  const [{ data: rolePerms }, { data: personal }] = await Promise.all([
    system.from("role_permissions").select("permission").eq("role", role),
    system.from("staff_permissions").select("permission, allowed").eq("user_id", session.user.id),
  ]);
  const permissions = new Set(((rolePerms ?? []) as { permission: string }[]).map((row) => row.permission));
  for (const row of (personal ?? []) as { permission: string; allowed: boolean }[]) {
    if (row.allowed) permissions.add(row.permission);
    else permissions.delete(row.permission);
  }

  const ctx: DbContext = {
    userId: session.user.id,
    role,
    isActive: Boolean(profile.is_active),
    clientId: (profile.client_id as string | null) ?? null,
    permissions,
    bypass: false,
    flags: new Set(),
  };
  // Guard against a client row with no linked company.
  if (ctx.role === "client" && !myClientId(ctx)) ctx.clientId = null;
  return ctx;
});

/** Policies apply. Synchronous for drop-in compatibility; the context is resolved lazily. */
export function createClient(): Client {
  return lazyClient(() => getRequestContext());
}

export function createAdminClient(): Client {
  return makeClient(SYSTEM);
}

/**
 * Pages call createClient() synchronously and then build queries; the
 * request context is async, so queries wait for it on execution.
 */
function lazyClient(resolve: () => Promise<DbContext>): Client {
  let real: Promise<Client> | null = null;
  const get = () => (real ??= resolve().then(makeClient));
  const placeholder: Client = {
    get db() {
      return getDb();
    },
    ctx: ANONYMOUS,
    system: () => makeClient(SYSTEM),
    from: (table: string) => new DeferredQuery(get, table) as unknown as Query,
    rpc: async (name, args) => (await get()).rpc(name, args),
    withFlags: (flags) => lazyClient(async () => ({ ...(await resolve()), flags: new Set(flags) })),
  };
  return placeholder;
}

/** Records builder calls and replays them on the real client once the context is known. */
class DeferredQuery {
  private calls: [string, unknown[]][] = [];
  constructor(private get: () => Promise<Client>, private table: string) {
    return new Proxy(this, {
      get(target, property, receiver) {
        if (property === "then") {
          return (resolve: (value: unknown) => unknown, reject: (reason: unknown) => unknown) =>
            target
              .get()
              .then((client) => {
                let query: any = client.from(target.table);
                for (const [method, args] of target.calls) query = query[method](...args);
                return query;
              })
              .then(resolve, reject);
        }
        if (property in target) return Reflect.get(target, property, receiver);
        return (...args: unknown[]) => {
          target.calls.push([String(property), args]);
          return receiver;
        };
      },
    });
  }
}
