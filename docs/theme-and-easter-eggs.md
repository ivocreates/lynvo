# Lynvo Visual System, UI/UX Language, and Easter Eggs

This document is the visual source of truth for recreating the Lynvo experience as closely as possible. It is written for designers, developers, and AI agents who need to rebuild the site with the same mood, hierarchy, detail, and personality.

## 1. Core Design Objective

Lynvo should feel like a premium digital studio website with a calm editorial aesthetic and a quiet technical personality. The experience should feel:

- premium but approachable
- structured but creatively crafted
- modern without feeling glossy or startup-generic
- technical without becoming a retro terminal clone
- handcrafted and intentional, not templated

The overall feeling is: refined studio identity + subtle command-line DNA + warm editorial layout.

## 2. Brand Personality

### Brand voice traits
- Direct and confident
- Thoughtful and clear
- Slightly technical, but human
- Calm, mature, and design-led

### What the UI should communicate
- Trust and competence
- Creativity and craft
- Precision and clarity
- A studio that can both design and build

## 3. Color System

Use the following exact color tokens as the foundation for all surfaces, typography, components, and interactions.

### Core palette
- Primary Blue: #345B73
  - Used for brand anchors, major CTA buttons, section emphasis, and key headings
- Secondary Blue: #5D8196
  - Used for supporting actions, secondary buttons, icons, and subtle emphasis
- Light Background: #F7F2EA
  - Main page background in light mode
- Dark Background: #1C2E3A
  - Main page background in dark mode

### Accent palette
- Soft Sage: #8DA79A
  - Used for highlights, tags, soft supporting visuals, and calm emphasis
- Warm Sand: #D6C2A8
  - Used for tactile surfaces, layered cards, warm contrast, and texture
- Muted Copper: #B97A58
  - Used sparingly for featured highlights, stat accents, and strong but restrained emphasis

### Text palette
- Primary Text: #23333D
- Inverse Text: #F5F6F4
- Muted Text: #4B6576
  - Used for supporting copy, secondary metadata, and softer body text

### UI palette
- Surface: #FCFAF7
- Border: #D8D2C8
- Success: #5F8A69
- Warning: #C89A49
- Error: #B95B63

### Dark-mode behavior
- Background becomes deep blue-navy
- Cards become slightly lighter than background for contrast
- Text stays soft and legible
- Borders remain visible but not harsh

## 4. Typography System

### Headings
- Font: Space Grotesk
- Use for hero titles, section headings, card headings, and strong editorial moments
- Weight: 500-700
- Tracking: slightly condensed but not cramped

### Body text
- Font: Manrope
- Use for paragraphs, navigation, labels, and general UI copy
- Weight: 300-600
- Keep line height generous and comfortable

### Monospace/terminal tone
- Font: JetBrains Mono
- Use sparingly for metadata, section stamps, terminal-style labels, footer status text, and command palette content

## 5. Layout and Spacing System

The website uses generous spacing and a quiet, structured rhythm.

### Layout principles
- Use a wide content container with strong max width for desktop and comfortable width on mobile
- Respect vertical rhythm between sections with large consistent spacing
- Keep section headings and supporting copy highly readable
- Avoid clutter and over-dense blocks

### Spacing behavior
- Use a large section spacing scale: 80-120px vertical padding on desktop, 48-80px on mobile
- Use moderate component padding inside cards and panels
- Keep content grouped into clear blocks with subtle whitespace between them

## 6. Component Language

### Card style: archive-card
This is one of the defining visual elements of the site.

- Thin border with subtle stroke
- Warm off-white or card-toned background
- Slight shadow offset in blue-grey tone
- Mild hover lift effect
- Rounded corners are restrained, not pill-like
- Used for service cards, project cards, info blocks, and content tiles

### Section stamps
- Small monospace badge at the start of sections
- Usually a bracketed number such as [001], [002], [003]
- Used to give the site a subtle technical-industrial rhythm

### Engineering badge / chip style
- Small pill-like or label-like badge with border and monospace text
- Used for tags, metadata, status, and lightweight labels

### Buttons
- Primary buttons are strong blue and highly visible
- Secondary buttons are bordered and calmer
- Hover states should feel subtle and tactile, not flashy

## 7. The Terminal-Inspired Layer

The site should feel like it has a light command-line personality, but not become a full terminal UI. This layer is most visible in the following components:

- footer status strip with prompt-like text
- 404 page terminal block
- command palette with shell-like input and commands
- section metadata in monospace styling
- subtle status badges and labels

### Terminal design rules
- Use monospace text only for utility-level content, not for core marketing copy
- Keep the effect polished and subtle
- Do not overuse animated cursor effects or full-console layouts
- Let the terminal language support the studio aesthetic rather than dominate it

## 8. Motion Language

The site uses motion to feel refined, not noisy.

### Motion rules
- Animate with small, purposeful entry and hover transitions
- Prefer subtle fade/slide movement over dramatic effects
- Use motion for section reveals, card hover states, and transition feedback
- Keep transitions smooth and short

### Recommended motion behavior
- section entry: opacity + slight translate Y
- card hover: small lift and shadow change
- command palette: fade/slide-in with low friction
- 404 terminal: gentle pulse or type-like cursor behavior

## 9. Easter Eggs and Micro-Delight

The site contains hidden personality touches, but they should remain optional and never block the experience.

### Core easter egg patterns
- Command palette shortcut hint in the footer or navbar
- Footer status line that feels like a live console or studio status strip
- 404 route suggestions rendered with terminal-style output
- Hover-reveal microcopy or small status cues on key CTAs
- Theme toggle feedback that feels slightly console-like
- Small animated cursor or prompt in terminal-like panels

### Important guardrails
- Keep easter eggs discoverable but not intrusive
- Do not hide critical navigation or important functionality
- Preserve accessibility and clarity first

## 10. Page-Level Visual Patterns

### Hero section
- Bold editorial heading with strong hierarchy
- A small studio badge and monospace metadata at the top
- A large CTA group with clear primary and secondary actions
- Supporting metrics or service highlights arranged as cards

### Content cards
- Use the archive-card pattern for case studies, services, team blocks, and feature tiles
- Keep cards slightly tactile and clearly separated from background
- Add subtle hover interaction and border contrast

### Footer
- Strong dark blue/teal footer treatment
- Terminal-style top strip with command-like status text
- Newsletter block and social links
- Link columns for Studio, Services, Work
- Bottom line with location, status, and licensing info

## 11. Recreating the Exact Experience with Supabase

If the site is rebuilt with Supabase instead of Firebase, preserve the same visual system exactly.

### What must remain the same
- color tokens and typography
- spacing rhythm and section composition
- card styling and hover behavior
- footer structure and terminal strip style
- command palette interaction and 404 terminal block
- dark/light theme behavior

### What can change technically
- Auth: Supabase Auth instead of Firebase Auth
- Database: PostgreSQL tables instead of Firestore collections
- Storage: Supabase Storage instead of Firebase Storage
- Server logic: Next.js server actions / route handlers with Supabase client and server client

## 12. AI Handoff Checklist

When asking an AI to recreate this site, explicitly require:

- exact color tokens and typography system
- archive-card design system and hover rules
- section stamp and engineering badge styling
- monospace terminal elements used only for utility content
- full homepage and footer structure with matching content hierarchy
- command palette interaction and terminal-inspired 404 experience
- same light/dark theme feel and motion language
- responsive behavior across desktop, tablet, and mobile

If a rebuild is being done in Supabase, the AI should preserve the visual language even if the backend changes.
