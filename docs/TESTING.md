# LYNVO Testing Strategy

## Quality Gates

Every pull request passes linting, TypeScript checks, changed-logic unit tests, production build, and relevant end-to-end tests. Release promotion also requires fresh-database migration validation and direct RLS verification in non-production.

| Layer | Scope | Examples |
| --- | --- | --- |
| Unit | Pure functions/schemas | Slug normalization, Zod forms, workflow transitions |
| Component | UI behavior | Form errors, submit states, empty/denied admin UI |
| Integration | Actions/routes plus test Supabase | Contact persistence, publish workflow, role denial |
| RLS | Direct database access | Draft hidden, editor denied contacts, admin allowed media write |
| E2E | Critical browser paths | Contact, login redirect, post publish, upload, mobile nav |
| Visual/a11y | Responsive semantics | Screenshots, keyboard path, automated axe checks |

## Required Scenarios

- Test valid/invalid contact and subscription inputs, duplicate subscriptions, rate limits, and email failure after successful persistence.
- Public lists/details return only published content and resolve missing/unpublished slugs safely.
- Editors can publish allowed content but cannot read contacts or manage roles.
- Admins can operate contacts/media; only super admins can change access.
- Anonymous/authenticated direct Supabase access cannot bypass RLS or private Storage policy.
- Session expiry redirects safely; protected content never flashes before verification.
- Theme, command palette, mobile navigation, focus, and reduced motion work accessibly.

## Data and Release Evidence

Use an isolated local/CI Supabase project with migrations applied from scratch and deterministic non-sensitive fixtures. Never run destructive tests against production. Provide scripts equivalent to `lint`, `typecheck`, `test`, `test:e2e`, and `build`; retain CI reports/screenshots for failures. Before release, manually check public routes, metadata/sitemap, controlled form submission, admin least privilege, and secret configuration without printing values.
