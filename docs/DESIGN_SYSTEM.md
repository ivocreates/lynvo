# LYNVO Design System

## 1. Brand Foundation

**LYNVO**  
**Tagline:** Consistent. Clear. Confident.  
**Mission:** Help businesses build, launch, and grow their digital presence with clarity and confidence, from strategy through execution.

The visual direction is technical editorial: structured, warm, precise, and calm. It must not read as a generic SaaS dashboard or a loud agency portfolio. Design should favor legible hierarchy, deliberate whitespace, quiet borders, and meaningful interaction feedback.

## 2. Color Tokens

| Token | Value | Usage |
| --- | --- | --- |
| `--ink-900` | `#1C2E3A` | Dark surfaces and strongest contrast |
| `--brand-700` | `#345B73` | Primary actions, links, headings |
| `--brand-500` | `#5D8196` | Secondary emphasis and interactive states |
| `--canvas-warm` | `#F7F2EA` | Primary warm background |
| `--sage-500` | `#8DA79A` | Supporting accent and calm success-adjacent detail |
| `--sand-400` | `#D6C2A8` | Warm supporting accent |
| `--clay-500` | `#B97A58` | Selective highlight or CTA detail |
| `--text-primary` | `#23333D` | Primary light-theme text |
| `--text-inverse` | `#F5F6F4` | Text on dark surfaces |
| `--surface` | `#FCFAF7` | Elevated light surface |
| `--border` | `#D8D2C8` | Borders and dividers |
| `--success` | `#5F8A69` | Positive feedback |
| `--warning` | `#C89A49` | Caution feedback |
| `--error` | `#B95B63` | Errors and destructive states |

Use solid colors and subtle texture/grid treatment rather than gradient-heavy decoration. Never use color as the only indication of state. Dark mode preserves the identity with `--ink-900` surfaces, `--text-inverse` text, and restrained brand accents.

## 3. Typography

| Role | Family | Weight | Use |
| --- | --- | --- | --- |
| Display and headings | Space Grotesk | 500, 600, 700 | Page titles, section headings, strong CTAs |
| Body | Manrope | 400, 500 | Paragraphs, navigation, form fields, buttons |
| Metadata | JetBrains Mono | 400 | Stamps, labels, dates, status, technical UI |

- Use a clear type scale rather than viewport-scaled text.
- Keep letter-spacing at `0`; metadata may use uppercase through content styling, not excessive tracking.
- Use readable line-height for body copy and compact line-height only for display headings.
- The monospace face is an accent that structures information, never the default reading face.

## 4. Layout and Components

- Public content uses a centered max-width container and full-width section bands.
- Use consistent spacing tokens on an 4px/8px rhythm.
- Cards are reserved for repeated content, media items, and compact admin tools; card radius is 8px or less.
- Use the existing archive-card language: defined border, measured shadow, structured metadata, and a small hover lift.
- Section stamps use JetBrains Mono and compact labels to establish editorial rhythm.
- Background grid/texture remains low contrast and never competes with content.
- Use Lucide icons inside icon controls with accessible labels and tooltips where meaning is not obvious.

## 5. Interaction and Accessibility

- All controls expose visible keyboard focus and meet WCAG AA color contrast.
- Support `prefers-reduced-motion`; motion should clarify hierarchy or feedback, not decorate empty space.
- Buttons have loading and disabled states that retain stable dimensions.
- Forms pair visible labels with inputs; errors are linked programmatically and announced accessibly.
- Mobile layouts prioritize tap targets, wrapped labels, and scannable stacked content.

## 6. Content Tone

Write with calm confidence: direct, useful, technically literate, and human. Avoid hype, vague superlatives, and noisy marketing language. Lead with outcomes and evidence. Metadata can carry a concise operational character, for example: `PROJECT: BRAND IDENTITY | VERSION: 2.0 | DATE: 31 JULY 2026`.
