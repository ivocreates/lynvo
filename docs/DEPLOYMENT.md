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
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=
SUPABASE_SERVICE_ROLE_KEY=
RESEND_API_KEY=
SITE_URL=
```

Service role and Resend credentials remain server-only. Configure exact Auth redirect URLs and email templates in Supabase. Deploy on a platform that supports the current Next.js App Router server runtime.

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
