import "server-only";

import { getCloudflareContext } from "@opennextjs/cloudflare";

/** The parts of the D1 and R2 bindings LYNVO uses. */
export interface D1Result<T = Record<string, unknown>> {
  results: T[];
  success: boolean;
  meta: { changes?: number; last_row_id?: number };
}

export interface D1PreparedStatement {
  bind(...values: unknown[]): D1PreparedStatement;
  all<T = Record<string, unknown>>(): Promise<D1Result<T>>;
  first<T = Record<string, unknown>>(): Promise<T | null>;
  run(): Promise<D1Result>;
}

export interface D1Binding {
  prepare(sql: string): D1PreparedStatement;
  batch(statements: D1PreparedStatement[]): Promise<D1Result[]>;
}

export interface R2ObjectBody {
  body: ReadableStream;
  httpEtag: string;
  size: number;
  httpMetadata?: { contentType?: string; cacheControl?: string };
  uploaded: Date;
}

export interface R2Binding {
  put(
    key: string,
    value: ArrayBuffer | ReadableStream | string,
    options?: { httpMetadata?: { contentType?: string; cacheControl?: string } }
  ): Promise<unknown>;
  get(key: string): Promise<R2ObjectBody | null>;
  delete(key: string | string[]): Promise<void>;
  list(options?: { prefix?: string; limit?: number; cursor?: string }): Promise<{ objects: { key: string; size: number; uploaded: Date }[]; truncated: boolean; cursor?: string }>;
}

declare global {
  interface CloudflareEnv {
    DB: D1Binding;
    MEDIA: R2Binding;
    BETTER_AUTH_SECRET?: string;
  }
}

export function getEnv() {
  return getCloudflareContext().env as CloudflareEnv & Record<string, string | undefined>;
}

export function getDb(): D1Binding {
  const db = getEnv().DB;
  if (!db) throw new Error("D1 binding DB is missing. Check [[d1_databases]] in wrangler.toml.");
  return db;
}

export function getMediaBucket(): R2Binding {
  const bucket = getEnv().MEDIA;
  if (!bucket) throw new Error("R2 binding MEDIA is missing. Check [[r2_buckets]] in wrangler.toml.");
  return bucket;
}
