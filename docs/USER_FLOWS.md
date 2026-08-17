# LYNVO User Flows

## 1. Visitor: Explore and Contact

1. Visitor lands on a public page and uses primary navigation, a CTA, or the command palette.
2. They browse published services, work, team, reviews, or articles.
3. They select `Start a Project` or navigate to `/contact`.
4. They complete the required form fields and submit.
5. Server action validates input, applies rate limiting, writes the contact in Supabase, and triggers Resend notification.
6. Visitor sees a success confirmation or a useful recoverable error; raw provider errors are never exposed.
7. Admin sees the new enquiry in the contacts inbox.

## 2. Visitor: Newsletter Subscription

1. Visitor enters an email address in the footer form.
2. The server normalizes and validates the address.
3. The app inserts a subscriber or treats a duplicate as an idempotent success.
4. The visitor receives clear feedback; optional double opt-in email is sent through Resend.

## 3. Editor: Draft and Publish a Blog Post

1. Editor signs in at `/admin/login`.
2. The app verifies Auth session, active profile, and `editor`/higher role.
3. Editor opens blog management and creates a post with title, slug, content, cover media, tags, and SEO fields.
4. The post is saved as `draft`; public readers cannot retrieve it.
5. Editor previews the post and sets `published_at` when ready.
6. The mutation records an audit entry and revalidates blog paths.
7. The published post is visible at `/blog/[slug]` and in the public list.

## 4. Admin: Manage a Contact

1. Admin opens the contacts inbox and filters by status.
2. Admin opens a submission, marks it `read`, and records an internal note or response status.
3. The system writes an audit event and updates the dashboard count.
4. Contacts may be archived but are not silently deleted unless retention policy permits it.

## 5. Admin: Upload and Attach Media

1. Authorized staff opens Media or a content editor.
2. Client validates type and size before requesting an upload path.
3. Server verifies role; Storage policy permits upload only to the scoped path.
4. The file uploads to `public-media`; `media_assets` records path, MIME type, dimensions, alt text, and creator.
5. The editor attaches the asset to content and saves the parent record.
6. Deletion checks references and removes both metadata/object only when safe.

## 6. Super Admin: Provision Staff Access

1. Super admin invites or provisions a user in Supabase Auth through a server-only operation.
2. They assign an allowed role in `profiles`.
3. RLS makes the new permission effective immediately for subsequent requests.
4. The role action is logged with actor, target, and before/after metadata.

## 7. Exception Rules

- Expired sessions redirect to login and preserve a safe return path.
- Unauthorized requests return a generic 403/redirect and are logged server-side when appropriate.
- Validation errors remain next to the originating field; network/server failures appear as non-destructive status feedback.
- A failed email does not invalidate an already persisted contact; retry operations must be explicit and auditable.
