# LYNVO API and Server Actions

## Contract Rules

Use server actions for same-origin form mutations and route handlers for external consumers, webhooks, or explicit JSON endpoints. Every mutation validates with Zod, authenticates where required, performs application role checks and RLS-backed persistence, then returns a safe typed outcome. Browser code must never use a Supabase service-role key.

## Public Operations

| Operation | Transport | Input | Result |
| --- | --- | --- | --- |
| Submit contact | Server action or `POST /api/contact` | Name, email, project type, message, consent | Generic confirmation |
| Subscribe | Server action or `POST /api/newsletter` | Email, consent/source | Idempotent subscribed result |
| Submit review | `POST /api/reviews`, if retained | Reviewer information, quote, consent | Pending-review confirmation |
| Read content | Server components | Route slug/query | Published records only |

Protect public mutations with server-side Zod validation, origin checks, honeypot/CAPTCHA where justified, rate limits, duplicate handling, and generic error messages. Contact persistence happens before Resend notification so a provider error never loses a valid lead.

## Admin Operations

All admin writes use a server action or protected `/api/admin/*` route. The required sequence is: establish server session, load active profile, assert role, validate body, mutate through RLS, append an audit entry, revalidate affected paths/tags, return minimal data.

| Domain | Operations |
| --- | --- |
| Projects, services, posts | Create, update, publish/unpublish, feature, reorder, delete |
| Team, reviews, stats, social links | CRUD plus order/status controls |
| Contacts | List, view, update workflow status |
| Media | Authorize upload, metadata CRUD, safe deletion |
| Settings/pages/SEO | Controlled read/update |
| Admins | Super-admin-only invite, deactivate, role change |

## Response and Caching

```ts
type ActionResult<T> =
  | { ok: true; data: T }
  | { ok: false; code: "VALIDATION" | "UNAUTHORIZED" | "FORBIDDEN" | "CONFLICT" | "RATE_LIMITED" | "INTERNAL"; message: string };
```

Public responses never expose provider or database internals. Log technical details server-side with a correlation ID. Tag public lists/details by domain and slug; revalidate the relevant route paths/tags after a mutation. Do not share-cache authenticated admin responses.

## Webhooks

Verify provider signatures before processing Resend or other webhook payloads. Store idempotency keys/event IDs for replay protection. Webhook handlers are server-only and minimally privileged.
