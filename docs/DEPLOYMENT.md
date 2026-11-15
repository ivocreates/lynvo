# LYNVO Deployment

Everything runs on Cloudflare: one Worker (Next.js via OpenNext), a D1
database (`lynvo-db`), an R2 bucket for uploads (`lynvo-media`) and Better
Auth for sign-in. There is no Supabase dependency.

## Bindings and settings

| Name | Kind | Where |
| --- | --- | --- |
| `DB` | D1 database `lynvo-db` | `wrangler.toml` |
| `MEDIA` | R2 bucket `lynvo-media` | `wrangler.toml` |
| `BETTER_AUTH_SECRET` | Secret (32+ random characters) | `npx wrangler secret put BETTER_AUTH_SECRET` |
| `RESEND_API_KEY` | Secret | password-reset, invite and enquiry emails |
| `CONTACT_NOTIFICATION_TO` | Variable | where website enquiries are emailed |
| `APP_URL`, `STUDIO_URL`, `TECH_URL`, `SITE_URL` | Variables | `wrangler.toml` `[vars]` |
| `SPLIT_DOMAINS` | Variable, `1` to enable | see Domains |

Never put secrets in `wrangler.toml`: it is committed, and values there override the dashboard.

## Local development

```
npm install
npm run db:migrate:local          # creates the tables in .wrangler/ (local D1)
npm run dev                       # next dev with local D1 / R2 bindings
npm run dev:worker                # the real Workers runtime on :8787
```

Create `.dev.vars` (gitignored) with `BETTER_AUTH_SECRET=...` and `APP_URL=http://localhost:3000`.

## Database

- Schema lives in `migrations/` (D1 migrations). Add a new numbered file for every change, then
  `npm run db:migrate:local` and `npm run db:migrate:remote`.
- Access rules (who can read / change what) are in `lib/db/policies.ts`; the old database triggers
  are in `lib/db/hooks.ts`. Every page reads through `createClient()` from `lib/db/server.ts`, which
  applies those rules for the signed-in person. `createAdminClient()` skips them and is only used
  server-side after an explicit permission check.
- Uploaded files are stored in R2 and served from `/media/<key>`.

## Moving the data from Supabase (one time)

1. In Supabase → Project settings → Database, copy the connection string (Session pooler URI).
2. Run (from the project folder):

   ```
   SUPABASE_URL=https://<ref>.supabase.co \
   SUPABASE_SERVICE_ROLE_KEY=<service role key> \
   SUPABASE_DB_URL='postgresql://postgres.<ref>:<db password>@<pooler-host>:5432/postgres' \
   npm run db:export-supabase
   ```

   This reads every table and login (with password hashes, so nobody has to reset their password),
   copies all uploaded files into R2 and writes `migration-data.sql`. Supabase is not modified.
3. `npm run db:migrate:remote` (once) then `npm run db:import:remote`.
4. Delete `migration-data.sql` — it contains personal data and password hashes.
5. Deploy (push to `main`). Check `https://app.lynvo.studio/api/health` shows `"ok": true`.
6. Sign in with your usual email and password.

Re-running the export and import is safe (rows are replaced by id), so you can do a final sync just
before switching.

## Domains

One Worker serves three domains. `middleware.ts` routes by host (see `lib/sites.ts`):

| Domain | Serves | Notes |
| --- | --- | --- |
| `app.lynvo.studio` | `/admin`, `/staff`, `/client` | `/` redirects to `/admin`; marketing paths redirect to lynvo.studio; never indexed |
| `lynvo.studio` | `app/(public)` | Platform paths redirect to app.lynvo.studio |
| `lynvo.tech` | `app/tech` (rewritten from `/`) | Platform paths redirect to app; `/verify/*` and `/careers` redirect to lynvo.studio |

Any other host (localhost, `*.workers.dev`) serves every route unchanged, so the tech site is at `/tech` locally.

1. Attach all three domains (plus `www.` variants) under **Workers & Pages → lynvo → Settings → Domains & Routes**.
2. Set `SPLIT_DOMAINS=1`. Until then app.lynvo.studio keeps serving the public pages as well.

## Cloudflare Workers build

```
npm run build        # OpenNext build -> .open-next/worker.js
npm run deploy:cf    # build, then wrangler deploy
```

Workers Builds: build command `npm run build`, deploy command `npx wrangler deploy` (preview
branches: `npx wrangler versions upload`).

## Release checklist

1. `npm run typecheck` and `npm run build` pass.
2. New migrations applied with `npm run db:migrate:remote` before the code that needs them is deployed.
3. After deploy: `/api/health`, sign in, open a quote, the client portal and the public site.

## Rollback

Workers keeps previous versions: **Workers & Pages → lynvo → Deployments → Rollback**. D1 has
point-in-time restore (`npx wrangler d1 time-travel restore lynvo-db --timestamp=<ISO time>`), up to 30
days back.
