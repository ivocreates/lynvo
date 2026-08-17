# LYNVO Security

## Security Model

Supabase RLS is the data authorization boundary. Next.js route guards and admin UI controls support user experience but cannot substitute for database policies. Treat browser input, route parameters, file names, Storage paths, webhook bodies, and external responses as untrusted.

## Authentication and Authorization

- Use Supabase Auth email/password for staff; verify sessions server-side and refresh via the supported SSR cookie flow.
- Check both Auth identity and `profiles.is_active` on protected routes/actions.
- Store roles only in `profiles`; never trust an incoming role or client metadata.
- Enable RLS on every table, view, and Storage bucket exposed through Supabase.
- Apply least-privilege policies with `auth.uid()` and hardened helpers; test direct table access as anon and authenticated users.
- Use `SUPABASE_SERVICE_ROLE_KEY` only in server-only, narrowly documented operations. Never log, expose, or bundle it.

## Secrets

| Variable | Exposure |
| --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Browser-safe |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Browser-safe |
| `SUPABASE_SERVICE_ROLE_KEY` | Server only |
| `RESEND_API_KEY` | Server only |
| `SITE_URL` | Configuration |

Use isolated local, staging, and production Supabase projects. Store secrets in the deployment platform, rotate after suspected disclosure, and never print their values.

## Input, Content, and Privacy

- Validate every untrusted input with Zod: formats, length, enums, URLs, and file constraints.
- Sanitize rich text or render a validated structured format; never render arbitrary editor HTML.
- Enforce HTTPS, CSP, `frame-ancestors`, `X-Content-Type-Options`, and an appropriate referrer policy in production.
- Apply CSRF/origin protections to cookie-authenticated mutations and signature verification to webhooks.
- Rate limit contact, newsletter, review, login-adjacent, and upload authorization operations.
- Keep public media separate from private files; private objects require short-lived server-authorized signed URLs.
- Store minimal lead PII and define retention/deletion procedures. Keep full contact messages out of audit logs.

## Incident Readiness

Monitor auth failures, RLS denials, form abuse, upload failures, and error spikes. Maintain tested backups and restoration instructions. On an incident: contain access, preserve relevant logs, assess impact, rotate credentials, correct policies/code, and document remediation.
