# Lynvo Tech Stack and Architecture

This document describes how the site is structured so it can be rebuilt faithfully, whether using the current Firebase stack or a Supabase-based replacement.

## 1. Current Product Architecture

### Frontend
- Framework: Next.js App Router
- Language: TypeScript
- UI runtime: React
- Styling: Tailwind CSS with a custom design token system
- Component approach: reusable domain-based components with shared UI primitives
- Motion: Framer Motion for subtle transitions and reveals
- Icons: Lucide React
- Toasts: Sonner

### Backend and data services
- Authentication: Firebase Auth
- Database: Firestore
- File storage: Firebase Storage
- Server-side SDK: firebase-admin
- Validation: Zod
- Email delivery: Resend

### Hosting and deployment
- Firebase Hosting and App Hosting
- SSR-friendly deployment for Next.js
- Environment variables for admin allowlist and email integration

## 2. Frontend Structure

The app is organized around public content, an admin CMS, and API actions.

### App Router layout
- app/(public) for public marketing pages
- app/admin for CMS dashboards and CRUD screens
- app/api for API endpoints
- app/actions for server actions and form handlers
- app/layout.tsx for shared metadata and providers

### Component organization
- components/sections for homepage sections
- components/about, blog, services, archive, team, contact for page-specific blocks
- components/layout for navbar and footer
- components/ui for reusable primitives
- components/admin for admin guard and sidebar UI

## 3. Design and UI Architecture

The interface is not just a marketing site; it is also a content-led experience with a modular design system.

### Shared visual primitives
- archive-card for feature cards and content tiles
- section-stamp for section labels
- eng-badge for chips, metadata, and tags
- blueprint-grid background texture
- terminal-like utility styling for metadata and command UI

### Global experience rules
- all public pages share a common navigation shell
- all sections follow a similar spacing and rhythm
- typography and monospace accents create a technical but editorial identity

## 4. Data Model and Content Structure

The current Firebase version uses Firestore collections for content and CMS entities.

### Main content collections
- projects
- services
- reviews
- teamMembers
- contacts
- blogPosts
- media
- siteSettings
- statistics
- newsletterSubscribers
- roles
- auditLogs

### Content expectations
- Most entities have title, slug, createdAt, updatedAt, and publish or active flags
- Projects and services often need tags, technologies, and rich metadata
- Blog posts require markdown-like content and SEO metadata
- Contacts and newsletter subscribers capture lead-generation data

## 5. API and Server Logic Pattern

### Public-facing actions
- /api/newsletter for newsletter submissions
- /api/reviews for review creation
- app/actions/contact for contact form handling and email sending
- app/actions/newsletter for subscription persistence

### Admin verification pattern
- A protected admin route uses an auth state check and server-side verification endpoint
- Authorized admin emails are checked against environment config or allowlist logic

## 6. Rebuild Strategy with Supabase

To recreate the same site using Supabase, preserve the current frontend architecture but swap the backend services.

### Recommended Supabase stack
- Next.js App Router
- TypeScript
- Tailwind CSS
- Framer Motion
- Supabase Auth for admin and user auth
- PostgreSQL for structured content
- Supabase Storage for images and files
- Row Level Security for permission control
- Server actions or API routes for business logic

## 7. Supabase Data Model Recommendation

### Recommended tables
- profiles
- site_settings
- pages
- services
- projects
- team_members
- reviews
- blog_posts
- contacts
- newsletter_subscribers
- media_assets
- stats
- social_links
- seo_settings
- audit_logs

### Recommended columns
- id
- slug
- title
- excerpt
- content
- status
- featured
- published_at
- created_at
- updated_at
- image_url
- seo_title
- seo_description
- tags
- metadata

### Important implementation note
- Use PostgreSQL relational structure instead of Firestore collections
- Keep content entities normalized where it makes sense, but keep the API simple for the front-end

## 8. Authentication and Authorization Plan with Supabase

### Public site auth
- No auth is required for the public marketing website

### Admin auth
- Use Supabase Auth for admin accounts
- Restrict admin access to a small allowlist or role-based system
- Use RLS policies for database safety

### Suggested admin roles
- super_admin
- admin
- editor

## 9. Storage and Media Plan

- Store images, logos, and uploads in Supabase Storage
- Keep file metadata in the media_assets table
- Support image URL retrieval for public pages and CMS content

## 10. SEO and Metadata Architecture

The site should retain its current SEO strategy:
- route-level metadata
- canonical URLs
- OG image support
- sitemap generation
- robots rules for admin and API routes
- structured data support via JSON-LD

## 11. Deployment Recommendations

### Preferred production stack
- Vercel for the Next.js frontend
- Supabase for auth, database, and storage
- Resend for transactional email

### Environment variables to plan for
- NEXT_PUBLIC_SUPABASE_URL
- NEXT_PUBLIC_SUPABASE_ANON_KEY
- SUPABASE_SERVICE_ROLE_KEY
- RESEND_API_KEY
- SITE_URL

## 12. Migration Guidance from Firebase to Supabase

### Replace these services
- Firebase Auth -> Supabase Auth
- Firestore -> PostgreSQL tables
- Firebase Storage -> Supabase Storage
- firebase-admin -> Supabase server client with service role

### Preserve these frontend patterns
- route/page structure
- component architecture
- visual styling and interactions
- CMS form UX and admin flows
- content-driven page rendering

## 13. Build Principles for AI Reproduction

When building this site again, the AI should focus on three things:
1. preserving the exact visual identity
2. preserving the content hierarchy of every page
3. preserving the interaction detail that makes the site feel distinctive

The technical backend can change, but the user experience should stay faithful.
