# Lynvo Website Features

This document describes the full feature set of the site and the expected interaction patterns. It is designed to help an AI recreate the complete digital studio experience, including the public website and the internal CMS experience.

## 1. Public Website Features

### Multi-page marketing website
- The site is built as a polished multi-page marketing experience with a strong editorial rhythm
- Each page has a distinct purpose, but all share a consistent visual language
- Navigation is simple, calm, and highly readable

### Responsive layout
- Desktop, tablet, and mobile experiences are all considered first-class experiences
- Content blocks stack gracefully on smaller screens
- Cards retain their identity and spacing even in compact layouts

### Shared shell
- Global navbar and footer appear across the site
- The shared shell gives the site a cohesive, studio-like identity

## 2. Core User Experience Features

### Theme support
- Light and dark mode are both supported
- Theme switching should feel native and subtle
- The visual system remains consistent across themes

### Smooth motion system
- Subtle section reveals and hover states make the site feel alive without becoming noisy
- Motion is used as refinement, not decoration

### Command palette experience
- The site includes a terminal-like command palette activated with Ctrl/Cmd + K
- It is a standout interaction feature that reinforces the studio’s technical identity
- It should allow fast navigation to major routes like home, services, archive, about, team, blog, and contact

### Terminal-style utility UI
- The footer includes a command-like status panel
- The 404 page uses a faux console window with route suggestions
- Section metadata and status chips use monospace styling for a technical but elegant feel

## 3. Public Page Features by Area

### Home page features
- Hero with bold editorial headline and CTA group
- Service highlight cards
- Featured work cards
- Trust metrics and brand-proof section
- Principles and story-driven content
- Founder section
- Closing CTA

### About page features
- Studio origin story
- Mission/vision and values framing
- Timeline or company-story progression
- Contact CTA at the end

### Services page features
- Service overview cards
- Clear service categorization
- Work process section
- Conversion-oriented CTA

### Archive page features
- Insightful portfolio grid
- Strong project card design with metadata and tags
- Clear browse experience for past work

### Blog page features
- Editorial card grid for content pieces
- Short metadata and topic framing
- Clean reading structure

### Team page features
- Profile cards with role and skills
- Simple, polished presentation of people behind the studio

### Contact page features
- Contact form with validation and submission handling
- Contact information panel
- FAQ section

## 4. Conversion and Engagement Features

### Contact form
- Should validate required fields
- Use a refined UI that feels calm and intentional
- Submit action should preserve the brand’s composed tone

### Newsletter subscription
- Footer contains a newsletter capture input
- A simple success/error feedback pattern should be used

### CTA strategy
- CTAs appear throughout the site in a consistent, understated way
- Buttons should feel like part of the visual system, not as generic marketing widgets

## 5. Visual Design Features

### Archive-card design system
- Cards use a tactile, structured visual style with border, subtle shadow, and hover lift
- This design pattern is recurring and should be preserved intentionally

### Section stamp system
- Each major section begins with a small stamped label in monospace style
- This gives the page a technical editorial feel

### Blueprints and texture overlay
- The background uses a subtle blueprint-like grid and soft texture for depth
- It should remain subtle so the content stays dominant

## 6. CMS Features

### Authentication and access
- Admin login should support email/password and social login patterns if needed
- Protected admin routes should be guarded from unauthorized access
- Access should be verified server-side

### Dashboard experience
- An admin dashboard with module cards and quick stats
- A sidebar-based navigation experience for content management

### Content modules
- Projects management
- Services management
- Team members management
- Reviews moderation
- Blog post management
- Contacts inbox
- Media library
- Site settings and content configuration

### Content editing patterns
- Fields for title, slug, intro, description, tags, images, status, featured flags, SEO, and metadata
- Boolean toggles for active/featured/draft/publish states
- Inline feedback and toast notifications after save or delete actions

## 7. Admin Operations Features

### Projects management
- Create, edit, delete projects
- Toggle featured state
- Mark as case study or not
- Set status and ordering

### Services management
- Create, edit, delete services
- Auto-generate slugs
- Manage tags, technologies, deliverables, and related content

### Team management
- Manage people, roles, bios, skills, and social links

### Reviews management
- Approve, reject, feature, and delete reviews
- Moderate submissions with state changes

### Contacts management
- Manage inbound enquiries
- Mark as unread/read/replied/archived
- Filter or search by status

### Blog management
- Create, edit, delete posts
- Draft/publish state
- Markdown-style content editing
- SEO fields and tags

### Media management
- Upload and manage assets
- Store media metadata and links
- Copy URLs and delete content

## 8. Platform and Operations Features

### Hosting and deployment readiness
- The site should be deployable on a modern hosting stack with SSR support
- The app should be built to work well with a headless or hybrid content setup

### Security model
- Public site remains open and accessible
- Admin routes are protected with server-side checks
- Secrets and auth should not be exposed client-side

### Notifications and feedback
- Toast messages for successful and failed actions
- Graceful error handling for forms and content updates

## 9. Supabase Migration Notes

If rebuilding with Supabase, these features should map to Supabase services as follows:

- Authentication -> Supabase Auth
- Database -> PostgreSQL tables with relational data and RLS
- Storage -> Supabase Storage for images and documents
- Server actions / API routes -> Next.js server code with Supabase client
- Realtime and admin flows -> optional Supabase Realtime or polling patterns

The user experience and UI should remain visually identical even if the backend shifts from Firebase to Supabase.
