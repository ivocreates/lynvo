# LYNVO UI Screens

## Public Screens

| Screen | Route | Primary content and behavior |
| --- | --- | --- |
| Home | `/` | Hero, service overview, featured projects, metrics, principles, tech stack, founder story, closing CTA |
| About | `/about` | Studio story, mission/vision, timeline, values, CTA |
| Services | `/services` | Service hero, active service grid, process, CTA |
| Service detail | `/services/[slug]` | Service summary, process, deliverables, technologies, FAQ, CTA |
| Archive | `/archive` | Project/case-study browse grid with metadata and tags |
| Case study | `/archive/[slug]` | Challenge, strategy, execution, results, metrics, related work/CTA |
| Blog | `/blog` | Published post grid with category/date/read time |
| Blog post | `/blog/[slug]` | Article, author/date/tags, SEO metadata, related posts if configured |
| Team | `/team` | Active team member grid with skills and social links |
| Reviews | `/reviews` | Approved testimonials and trust context |
| Contact | `/contact` | Contact hero, validated form, information panel, FAQ |
| Not found | `not-found` | Console-inspired missing-route state with available destinations |

Shared public UI includes navbar, footer, theme control, mobile navigation, command palette, status metadata, and responsive section rhythm.

## Admin Screens

| Screen | Route | Primary behavior |
| --- | --- | --- |
| Login | `/admin/login` | Email/password authentication, field validation, safe error feedback |
| Dashboard | `/admin` | Content/lead metrics, recent activity, quick links |
| Projects | `/admin/projects` | List, search/filter, create/edit/delete, featured/status/order controls |
| Services | `/admin/services` | Service CRUD, slug, tags, deliverables, process, FAQ, visibility controls |
| Blog | `/admin/blog` | Draft/publish workflow, content editing, SEO, tags, cover media |
| Team | `/admin/team` | Profile, role, bio, skills, social links, active/order controls |
| Reviews | `/admin/reviews` | Moderate pending reviews; approve, reject, feature, delete |
| Contacts | `/admin/contacts` | Inbox, status updates, filters, notes/reply tracking |
| Media | `/admin/media` | Upload, inspect, copy URL, alt text, delete with reference safeguards |
| Content | `/admin/content` | Pages, stats, reusable copy, and SEO configuration |
| Settings | `/admin/settings` | Site identity, contact details, operational settings |
| Social | `/admin/social` | Ordered social link management |
| Admins | `/admin/admins` | Super-admin role and account access management |

## Screen States

Every data screen must specify loading, empty, success, validation error, permission denied, not-found, and recoverable server error states. Admin destructive actions require confirmation. Public empty states remain polished and helpful but must not reveal internal publishing or authorization information.
