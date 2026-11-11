# LYNVO Deployment

## Environments

| Environment | Purpose | Supabase project |
| --- | --- | --- |
| Local | Development and automated tests | Local CLI stack or dev project |
| Preview/Staging | PR review and release rehearsal | Isolated staging project |
| Production | Live LYNVO website | Dedicated production project |

Never share Auth users, Storage buckets, service-role keys, or lead data between environments.

## Configuration

```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
RESEND_API_KEY=
CONTACT_NOTIFICATION_TO=
SITE_URL=https://lynvo.studio
APP_URL=https://app.lynvo.studio
STUDIO_URL=https://lynvo.studio
TECH_URL=https://lynvo.tech
```

Service role and Resend credentials remain server-only. Configure exact Auth redirect URLs and email templates in Supabase. Deploy on a platform that supports the current Next.js App Router server runtime.

## Domains

One Worker serves three domains. `middleware.ts` routes by host (see `lib/sites.ts`):

| Domain | Serves | Notes |
| --- | --- | --- |
| `app.lynvo.studio` | `/admin`, `/staff`, `/client` | `/` redirects to `/admin`; marketing paths redirect to lynvo.studio; never indexed |
| `lynvo.studio` | `app/(public)` | Platform paths redirect to app.lynvo.studio |
| `lynvo.tech` | `app/tech` (rewritten from `/`) | Platform paths redirect to app; `/verify/*` and `/careers` redirect to lynvo.studio |

Any other host (localhost, `*.workers.dev`) serves every route unchanged, so the tech site is at `/tech` locally.

Setup:

1. Add `APP_URL`, `STUDIO_URL` and `TECH_URL` to the Worker runtime variables (and `SITE_URL=https://lynvo.studio`).
2. Attach all three domains (plus `www.` variants) to the Worker under **Settings → Domains & Routes**, or uncomment `routes` in `wrangler.toml`.
3. In Supabase **Authentication → URL configuration**, set Site URL to `https://app.lynvo.studio` and add `https://app.lynvo.studio/**` to the redirect allow-list. Invites and password resets now link to `APP_URL`.
4. Set `SPLIT_DOMAINS=1` in the Worker runtime variables. Until then app.lynvo.studio keeps serving the public pages as well, so nothing breaks before lynvo.studio and lynvo.tech are attached.
5. Run migrations `0027` to `0031` in order (`supabase db push`, or paste each into the SQL editor). `0027` only adds enum values and must be committed before `0028` runs.

## Cloudflare Workers

The app deploys to Cloudflare Workers through the OpenNext adapter:

```
npm run build:cf    # next build + opennextjs-cloudflare build -> .open-next/
npm run deploy:cf   # build, then wrangler deploy
npm run preview:cf  # build, then run the Worker locally
```

`wrangler.toml` points `main` at `.open-next/worker.js` and serves `.open-next/assets` through the `ASSETS` binding. In the Cloudflare dashboard set the project's **build command** to `npm run build:cf`; the deploy command stays `npx wrangler deploy`.

Both `NEXT_PUBLIC_*` values must be set in **two** places, because Next.js inlines them into the browser bundle at build time and the server reads them again at runtime:

1. **Build variables** — Workers Builds settings. Missing values here silently produce an admin area that cannot sign in, a CSP that blocks Supabase, and empty public pages.
2. **Runtime variables and secrets** — Worker settings. Add `SUPABASE_SERVICE_ROLE_KEY`, `RESEND_API_KEY` and `CONTACT_NOTIFICATION_TO` as encrypted secrets, never as plain vars, and never in `wrangler.toml`.

`lib/env.ts` throws a descriptive error when a Supabase variable is absent, so a misconfigured deploy fails visibly instead of rendering blank content.

## Release Pipeline

1. Install locked dependencies and run lint, typecheck, tests, and build.
2. Apply reviewed Supabase migrations to staging from repository history.
3. Generate/check database types and execute RLS tests.
4. Deploy the app to staging and run smoke/E2E checks.
5. Apply production migrations in a controlled release window.
6. Deploy the approved app version and repeat production smoke checks.

Use additive, backward-compatible migrations wherever possible. Destructive schema changes need a backup, data-migration plan, rollback decision point, and staged release compatible with both schema versions.

## Supabase Setup and Rollback

Create schema, policies, Auth configuration, `public-media`/`private-uploads` buckets, backups, recovery settings, and logging from versioned configuration. After deploy, verify primary routes, a dynamic detail page, controlled form submission, auth/least privilege, publish revalidation, media upload, and anonymous RLS/Storage denial.

Roll back the application deployment first while schema compatibility remains. Do not blindly reverse data migrations; forward-fix or restore through a rehearsed recovery plan. Restrict access and rotate credentials during a serious data incident.
