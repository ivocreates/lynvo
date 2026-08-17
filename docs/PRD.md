# LYNVO Product Requirements Document

**Product:** LYNVO Digital Studio website and content management system (CMS)  
**Tagline:** Consistent. Clear. Confident.  
**Version:** 1.0  
**Status:** Rebuild specification  
**Primary stack:** Next.js, Supabase, Resend

## 1. Product Summary

LYNVO is a public-facing digital studio website paired with a protected CMS. It presents the studio's services, work, people, thinking, and contact paths while letting authorized staff manage all editorial content and inbound leads.

The rebuild must retain the existing public routes, content-led experience, responsive behavior, admin workflows, SEO support, and subtle interaction design. Firebase must not be used. Supabase supplies authentication, PostgreSQL data persistence, object storage, row-level security (RLS), and optional realtime updates.

## 2. Problem and Opportunity

Prospective clients need a clear way to assess LYNVO's capability and begin a project. The studio needs one reliable workspace for publishing content, managing media, reviewing enquiries, and maintaining core site configuration. The product should make LYNVO feel composed, capable, and human rather than generic or overly promotional.

## 3. Goals

- Present LYNVO's services, case studies, team, reviews, and editorial content clearly.
- Convert qualified visitors through contact and newsletter forms.
- Give staff role-based tools to manage all published content and media.
- Deliver a responsive, accessible, SEO-ready experience.
- Protect data and administrative operations with Supabase Auth and database-enforced RLS.
- Preserve the existing route structure: `/`, `/about`, `/services`, `/archive`, `/blog`, `/team`, `/reviews`, `/contact`, and `/admin`.

## 4. Non-Goals

- A client portal, billing system, project-management suite, or ecommerce checkout.
- Public user accounts or community features.
- Replacing Resend for transactional email.
- Migrating Firebase data automatically; import tooling is a separate migration task.

## 5. Users and Roles

| User | Need | Key capabilities |
| --- | --- | --- |
| Visitor | Evaluate LYNVO and start a conversation | Browse content, use navigation/command palette, submit forms, subscribe |
| Editor | Keep editorial content current | Manage drafts and publish services, work, posts, team, reviews, and settings |
| Admin | Operate the CMS and leads inbox | All editor capabilities plus contact/media management |
| Super admin | Govern access and configuration | All admin capabilities plus user role administration and audit review |

## 6. Functional Requirements

### Public site

- Provide a shared navigation, footer, mobile menu, theme support, and keyboard-accessible command palette.
- Render dynamic services, projects/case studies, posts, team members, reviews, metrics, social links, and settings from Supabase.
- Support listing and detail pages by slug for services, projects, and blog posts.
- Display only records that are published or active on public routes.
- Include route metadata, canonicals, sitemap, robots rules, Open Graph fields, and JSON-LD where applicable.
- Render graceful empty, loading, not-found, and error states without exposing internal details.

### Lead capture

- Validate contact and newsletter submissions server-side with Zod.
- Persist submissions to `contacts` and `newsletter_subscribers`.
- Deduplicate newsletter email addresses case-insensitively.
- Send the configured contact notification through Resend; a delivery failure must not lose a valid submission.
- Show clear, accessible success and error feedback.

### Admin CMS

- Authenticate staff with Supabase Auth email/password; OAuth may be enabled later.
- Require an authenticated profile with a valid role for every `/admin` route and mutation.
- Provide dashboard metrics and CRUD interfaces for projects, services, team members, reviews, blog posts, contacts, media, settings, social links, and site statistics.
- Support draft/published, active/inactive, featured, ordering, slug, SEO, and image fields where relevant.
- Upload, browse, copy URLs for, and delete media through Supabase Storage.
- Record privileged create, update, publish, delete, role, and media actions in `audit_logs`.

## 7. Success Measures

- Contact and newsletter submissions persist successfully in at least 99% of valid attempts, excluding provider outages.
- Every public content query is restricted to published/active rows.
- Unauthorized users cannot read protected data or mutate any CMS table, as verified by RLS tests.
- Core public pages achieve WCAG 2.2 AA conformance for keyboard operation, contrast, focus visibility, and form feedback.
- Production pages meet agreed Core Web Vitals targets on mobile: LCP under 2.5 seconds, INP under 200 ms, and CLS under 0.1 for the primary page templates.

## 8. Acceptance Criteria

- A visitor can browse all public routes and view published dynamic content without authentication.
- An editor can sign in, create a draft, edit it, publish it, and see it on the matching public page.
- An admin can receive a contact submission, change its workflow state, and view the audit record.
- A non-admin authenticated account receives no CMS data and cannot access admin routes.
- Media uploaded through the CMS is stored in the intended Supabase bucket and is available only according to its configured policy.
- The visual implementation follows [DESIGN_SYSTEM.md](DESIGN_SYSTEM.md) and uses Space Grotesk, Manrope, and JetBrains Mono.

## 9. Dependencies

- Supabase project with Auth, PostgreSQL, Storage, migration tooling, and production backups.
- Next.js App Router deployment platform with secure environment variables.
- Resend domain verification and API key for email notifications.
- Image optimization strategy compatible with Supabase Storage URLs.

## 10. Risks and Decisions

- RLS is a mandatory security boundary, not a UI-only convenience. Server-side service-role access is limited to narrowly scoped trusted operations.
- Browser clients use only the Supabase publishable/anon key. Service role credentials remain server-only.
- Public media should be isolated from private files. Signed URLs are required for private assets.
- Rich content must be sanitized or rendered from a controlled structured format to prevent stored XSS.