# Lynvo Website Content Inventory

This document defines the content architecture of the website so it can be recreated faithfully. It is written as a content blueprint for developers and AI agents building the site from scratch or migrating it to a Supabase-backed stack.

## 1. Brand Positioning

- Brand name: Lynvo Digital Studio
- Tagline: Linking Ideas to Innovation
- Core promise: design-led engineering for modern digital products and business growth
- Audience: startups, SMEs, founders, product teams, and companies needing better digital experiences
- Geographic identity: based in Sawantwadi, India, serving clients worldwide
- Tone: calm, confident, high-trust, slightly technical, polished, and human

## 2. Navigation Content

### Primary navigation
- Work -> /archive
- Services -> /services
- About -> /about
- Team -> /team
- Blog -> /blog
- Contact -> /contact

### Navigation behavior
- Desktop navigation is clean and understated
- Mobile navigation uses a slide-down panel with large tap targets
- Contact CTA is visually prominent in desktop and mobile experience

## 3. Homepage Content Inventory

The home page is the flagship marketing experience and should be recreated in order.

### Section 1: Hero
- Studio badge: Lynvo Digital Studio
- Supporting microcopy: Now booking Q4 projects
- Headline: We turn bold ideas into digital momentum. Built to scale.
- Subheadline: From launch-ready websites to product-grade applications, we blend design strategy, engineering discipline, and business context so every release moves your brand forward.
- Primary CTA: Start a Project
- Secondary CTA: See Case Studies
- Supporting highlights: Design-led engineering, SEO-aware architecture, Launch support and growth
- Service pillars: Build, Redesign, Secure, Automate

### Section 2: Stats / Trust Strip
- Projects shipped: 50+
- Client satisfaction: 98%
- Avg. response: under 12 hours
- Retention: 85%

### Section 3: Services Overview
- Grid of services with cards and tags
- Services include: Web Development, Website Redesign, Troubleshooting & Support, Custom Software, UI/UX & Brand Design, SEO & Geo Optimization, Social Media Management, Brand Identity, Graphic Design, Online Outreach, Digital Strategy, VAPT & Security Audits, App Development, Web3 & Blockchain

### Section 4: Featured Projects
- Selected work cards for featured projects
- Each card includes title, category, year, industry, result metric, and tags

### Section 5: Principles / Studio Values
- The site should communicate a philosophy of craft, product thinking, and execution

### Section 6: Tech Stack Section
- Highlights of technical capabilities and platform familiarity

### Section 7: Founder / Studio Story Section
- Introduce the founder and the studio story

### Section 8: Contact CTA
- A strong closing CTA prompting the user to start a project

## 4. About Page Content Inventory

### Hero / intro
- High-level framing of the studio and its origin story

### Section: The Beginning
- Lynvo started in Sawantwadi, Maharashtra
- Founded by Ivo Pereira
- Built to bridge the gap between great ideas and effective execution
- Includes mention of 3+ years of experience, 50+ projects, and 5+ countries

### Section: Our Approach
- Multi-domain growth and collaboration across design, development, strategy, and product
- Emphasis on building systems that support real growth

### Supporting card content
- Build
- Redesign
- Troubleshoot
- Innovate

### Closing CTA
- Contact prompt to begin a project

## 5. Services Page Content Inventory

### Services Hero
- Title framing the studio as a service provider for digital execution
- Supporting copy about end-to-end support for brands and products

### Services Grid
- Each service card includes:
  - title
  - short description
  - tags
  - link to detail page

### Work Process Section
- Shows how the studio works in practice
- Should emphasize the phased process from discovery to launch and iteration

### CTA section
- A closing action to contact the studio

## 6. Service Detail Page Content Inventory

Each service detail page should include:
- hero heading and short tagline
- category label
- service summary description
- process steps
- deliverables list
- technologies list
- FAQ section
- service-specific CTA

### Typical detail fields
- title
- slug
- shortDescription
- longDescription
- category
- price or package label if used
- featured
- active
- tags
- technologies
- deliverables
- processSteps
- faqItems

## 7. Archive / Work Page Content Inventory

### Archive Hero
- Position the studio as a portfolio of shipped work and systems

### Archive Grid
- Project cards with metadata from the project database
- Each card should show title, category, year, industry, result, and tags

### Contact CTA
- Final conversion area

## 8. Case Study Detail Content Inventory

A case study page should contain:
- case study title
- category
- year
- industry
- overview summary
- challenge section
- strategy section
- development / execution section
- results section
- metrics / numbers
- tags
- related projects or CTA

## 9. Blog Page Content Inventory

### Blog Hero
- Introduce the studio’s thoughts, technical notes, and updates

### Blog Grid
- Article tiles containing title, excerpt, category, date, and reading time

### Blog Detail Page
- long-form article content
- metadata: category, author, date, reading time, tags
- optional related posts

## 10. Team Page Content Inventory

### Team Hero
- Introduce the people behind the studio

### Team Grid
- Team member cards with name, role, short bio, skills, and social links

## 11. Reviews Page Content Inventory

- List testimonials or client reviews in a clean, editorial card layout
- Each review should show author, company, role, and short quote
- The page should feel trustworthy and grounded, not salesy

## 12. Contact Page Content Inventory

### Contact Hero
- Invitation to start a conversation
- Friendly but straightforward messaging

### Contact Form
- Name
- Email
- Project type or message
- Message field
- Submit button

### Contact Info Panel
- Email contact info
- Location info
- Studio status or response time note

### FAQ Section
- Short, helpful questions about process, timeline, and engagement

## 13. Footer Content Inventory

The footer is a major visual and content element and should be reproduced exactly.

### Top strip
- terminal-style status line with prompt-like text
- label: LYNVO STUDIO OS
- version: v2.0
- build year: 2026
- command palette hint: CTRL + K

### Main footer columns
- Studio links: About, Team, Blog, Contact
- Services links: Web Development, UI/UX Design, Brand Identity, SEO, VAPT & Security, Web3 & Blockchain
- Work links: Project Archive, Case Studies, Reviews

### Newsletter block
- Input placeholder: your@email.com
- Button: submit arrow icon
- Supporting text: No spam. Unsubscribe anytime.

### Social links
- GitHub
- LinkedIn
- Instagram
- X / Twitter

### Bottom bar
- Whoami: Lynvo Digital Studio
- Location: Sawantwadi, India
- Status: Open to Projects
- Legal links: Privacy, Terms
- Attribution note: Lynvo Web Page, © 2026 by Ivo Pereira, licensed under CC BY-NC-ND 4.0

## 14. Not Found Page Content Inventory

The 404 page should include:
- a terminal-style window with a faux command log
- error text: Route not found
- a list of available routes such as /, /about, /services, /archive, /team, /blog, /contact
- clear CTA buttons: Go Home, View Work, Contact Us

## 15. Command Palette Content Inventory

The command palette is a key interaction and should have:
- input bar with shell-style prompt
- commands for home, archive, services, about, team, blog, contact
- keyboard hints for navigation and open action

## 16. CMS Content Model for Rebuilds

If rebuilding with Supabase, use this content structure as the source of truth.

### Core tables / entities
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

### Recommended fields
- id
- slug
- title
- description
- content
- status
- featured
- published_at
- created_at
- updated_at
- author_id
- seo_title
- seo_description
- image_url

### Content management expectations
- Home page and footer content should be editable from CMS settings
- Services, projects, team, blog, and reviews should be modeled as first-class content entities
- Contact enquiries and newsletter subscriptions should be captured as records

## 17. SEO and Metadata Content Inventory

The site should include:
- route-level title and description metadata
- canonical URLs
- Open Graph and Twitter metadata
- robots rules to block admin and API routes
- sitemap with public routes
- JSON-LD structured data for the studio

## 18. Rebuild Guidance for AI

When recreating this site, the AI should preserve not only the structure but also the exact tone, hierarchy, and personality. The content should be treated as a first-class part of the design system, not as filler or placeholder copy.