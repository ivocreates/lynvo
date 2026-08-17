illw

# Prompt: Recreate the Lynvo Website as a CMS Platform

Use the prompt below in an AI coding assistant to recreate the Lynvo website as a polished marketing site plus a content management platform.

---

Build a high-fidelity, production-ready Next.js website for Lynvo Digital Studio, styled to match the existing visual language and functional experience. The site should feel like a premium digital studio website with an editorial layout, subtle technical personality, and calm, handcrafted UI.

## Project goal

Create a public marketing website and an internal CMS that can manage the same content and features as the current Lynvo platform. The visual language must be preserved closely, even if the backend is migrated to Supabase instead of Firebase.

## Core product requirements

- Build a public website with the following pages:
  - Home
  - About
  - Services
  - Service detail pages
  - Archive / portfolio
  - Case study detail pages
  - Blog
  - Blog detail pages
  - Team
  - Reviews
  - Contact
  - Custom 404 page
- Build an admin CMS for managing site content and leads
- Provide responsive layouts for mobile, tablet, and desktop
- Create a polished, accessible, modern UI with strong content hierarchy

## Visual design requirements

The interface must feel like this exact design language:

- calm, premium, editorial, and design-led
- warm and composed, not flashy
- technical but not retro
- subtle command-line personality through monospace utility UI
- large whitespace, strong typography, restrained cards, and gentle motion

### Required visual system

- Use the following color foundation:
  - Primary Blue: #345B73
  - Secondary Blue: #5D8196
  - Light Background: #F7F2EA
  - Dark Background: #1C2E3A
  - Soft Sage: #8DA79A
  - Warm Sand: #D6C2A8
  - Muted Copper: #B97A58
  - Surface: #FCFAF7
  - Border: #D8D2C8
- Use Space Grotesk for headings, Manrope for body text, and JetBrains Mono for terminal-like labels and utility UI
- Use a subtle blueprint/grid texture background and tactile card treatment
- Build a reusable card pattern for services, projects, team, and content tiles
- Use section stamps and engineering-style badges for metadata and section labels

## Interaction requirements

- The site should include a command palette activated by Ctrl/Cmd + K
- The footer should include a terminal-style status strip with a command-like feel
- The 404 page should use a console-style panel with route suggestions
- Hover states should be subtle and tactile
- Motion should be smooth and understated

## Homepage content requirements

The homepage should include:

- hero section with strong headline and CTA group
- metrics or trust strip
- services overview grid
- featured projects section
- principles or studio story section
- tech stack section
- founder or team intro section
- closing contact CTA

## Page content requirements

Each public page should have the correct structure and content hierarchy:

- Home: hero, trust metrics, services, featured work, principles, founder, contact CTA
- About: story, values, mission, timeline-style narrative, CTA
- Services: service grid, process section, CTA
- Service detail: summary, process, deliverables, technologies, FAQ, CTA
- Archive: portfolio of projects with cards and metadata
- Case study detail: challenge, strategy, development, results, metrics, tags
- Blog: blog grid with editorial cards
- Blog detail: article content, metadata, tags, reading time, related posts if applicable
- Team: cards with name, role, bio, skills, social links
- Reviews: testimonial grid or list
- Contact: hero, form, contact info, FAQ

## Footer requirements

The footer must include:

- a top terminal-style status strip
- a newsletter sign-up block
- social links
- link columns for Studio, Services, and Work
- bottom bar with location, status, legal links, and attribution text

## Content model requirements

Use a content-driven architecture. The CMS should support:

- services
- projects
- team members
- reviews
- blog posts
- contacts
- newsletter subscribers
- site settings
- social links
- SEO settings
- statistics/counters
- media assets

## Admin CMS requirements

Implement a CMS with the following modules:

1. Projects management
2. Services management
3. Team management
4. Reviews management
5. Contacts inbox
6. Blog management
7. Media management
8. Site settings and content blocks
9. Admin access controls

### CMS behaviors

- CRUD flows for core entities
- featured, active, draft/publish, and status toggles
- slug generation for SEO-friendly routes
- tags, metadata, and image support
- simple but polished admin UI

## Backend requirements

Build the app in a way that can either use Firebase or a Supabase-backed architecture.

### Preferred Supabase replacement plan

- Auth: Supabase Auth
- Database: PostgreSQL tables with row-level security
- Storage: Supabase Storage
- Server logic: Next.js server actions and API routes
- Email: Resend or similar transactional email provider

## Technical requirements

- Next.js App Router with TypeScript
- Tailwind CSS for styling
- Framer Motion for subtle interactions
- Zod for validation
- A modular folder structure by domain
- Strong SEO: metadata, canonical URLs, sitemap, robots, JSON-LD
- Mobile-first, accessible UI

## Output requirements

- Deliver a complete folder structure
- Create seed content for the main site entities
- Include a README with setup steps, environment variables, local run instructions, and deployment notes
- Include a QA checklist for navigation, forms, CMS CRUD, and public page rendering

## Important instruction for the AI

Do not just produce a generic website template. Recreate the exact personality of the Lynvo experience: calm, editorial, technical, tactile, and slightly playful through the terminal-inspired details. Preserve the same page hierarchy, footer structure, card design, and interaction quirks that make the site feel distinctive.
