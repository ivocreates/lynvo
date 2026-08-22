-- LYNVO billing, phase 7: categorised service catalogue, dual-region pricing,
-- package presets and recurring (maintenance/retainer) items.

-- ---------------------------------------------------------------------------
-- 1. Catalogue columns
-- ---------------------------------------------------------------------------

alter table billing_items
  add column if not exists code text,
  add column if not exists category text not null default 'Other',
  add column if not exists unit_price_intl numeric(14, 2) not null default 0,
  add column if not exists price_from boolean not null default false,
  add column if not exists optional boolean not null default true,
  add column if not exists recurring text not null default 'one_time';

alter table billing_items drop constraint if exists billing_items_recurring_check;
alter table billing_items
  add constraint billing_items_recurring_check
  check (recurring in ('one_time', 'monthly', 'yearly'));

create unique index if not exists billing_items_code_idx on billing_items (code);
create index if not exists billing_items_category_idx on billing_items (category, "order");

comment on column billing_items.unit_price_intl is 'Recommended international price, quoted in USD.';
comment on column billing_items.price_from is 'True when the catalogue price is a starting point (the "+" pricing model).';

-- Line items carry their own copy of the catalogue metadata so a printed
-- document never changes when the catalogue is re-priced.
alter table billing_document_items
  add column if not exists category text,
  add column if not exists recurring text not null default 'one_time';

alter table billing_document_items drop constraint if exists billing_document_items_recurring_check;
alter table billing_document_items
  add constraint billing_document_items_recurring_check
  check (recurring in ('one_time', 'monthly', 'yearly'));

-- Region drives which catalogue price and currency the editor offers.
alter table billing_documents
  add column if not exists region text not null default 'IN';

alter table billing_documents drop constraint if exists billing_documents_region_check;
alter table billing_documents
  add constraint billing_documents_region_check check (region in ('IN', 'INT'));

-- ---------------------------------------------------------------------------
-- 2. Package presets
-- ---------------------------------------------------------------------------

create table if not exists billing_packages (
  id uuid primary key default gen_random_uuid(),
  code text unique,
  name text not null,
  description text,
  category text not null default 'Package',
  price_inr numeric(14, 2) not null default 0,
  price_intl numeric(14, 2) not null default 0,
  price_from boolean not null default false,
  recurring text not null default 'one_time',
  -- Scope bullets printed under the package line on the quotation.
  includes jsonb not null default '[]'::jsonb,
  badge text,
  active boolean not null default true,
  "order" int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint billing_packages_recurring_check check (recurring in ('one_time', 'monthly', 'yearly'))
);
create index if not exists billing_packages_active_idx on billing_packages ("order") where active = true;

alter table billing_packages enable row level security;

drop policy if exists "billing_packages_staff_manage" on billing_packages;
create policy "billing_packages_staff_manage" on billing_packages
  for all using (is_staff()) with check (is_staff());

drop policy if exists "billing_packages_team_read" on billing_packages;
create policy "billing_packages_team_read" on billing_packages
  for select using (is_team_member());

grant select, insert, update, delete on billing_packages to authenticated;

-- ---------------------------------------------------------------------------
-- 3. Service catalogue seed (LYNVO modular price list)
-- ---------------------------------------------------------------------------

with catalog(code, name, category, unit, price_in, price_int, price_from, recurring) as (
  values
    -- Pages ----------------------------------------------------------------
    ('pages-landing', 'Landing Page', 'Pages', 'page', 3000, 75, false, 'one_time'),
    ('pages-standard', 'Standard Website Page', 'Pages', 'page', 1000, 30, false, 'one_time'),
    ('pages-premium', 'Premium Custom Page', 'Pages', 'page', 2000, 50, false, 'one_time'),
    ('pages-landing-extra', 'Additional Landing Page', 'Pages', 'page', 2000, 50, false, 'one_time'),
    ('pages-contact', 'Contact Page', 'Pages', 'page', 1000, 30, false, 'one_time'),
    ('pages-about', 'About Page', 'Pages', 'page', 750, 25, false, 'one_time'),
    ('pages-services', 'Services Page', 'Pages', 'page', 1000, 30, false, 'one_time'),
    ('pages-portfolio', 'Portfolio Page', 'Pages', 'page', 1500, 40, false, 'one_time'),
    ('pages-gallery', 'Gallery Page', 'Pages', 'page', 1500, 40, false, 'one_time'),
    ('pages-faq', 'FAQ Section / Page', 'Pages', 'page', 750, 25, false, 'one_time'),
    ('pages-blog', 'Blog Page', 'Pages', 'page', 1500, 40, false, 'one_time'),
    ('pages-testimonials', 'Testimonials Section', 'Pages', 'section', 750, 25, false, 'one_time'),
    ('pages-team', 'Team / Staff Page', 'Pages', 'page', 1000, 30, false, 'one_time'),
    ('pages-pricing', 'Pricing Page', 'Pages', 'page', 1000, 30, false, 'one_time'),
    ('pages-careers', 'Careers Page', 'Pages', 'page', 1000, 30, false, 'one_time'),
    ('pages-interactive-section', 'Custom Interactive Section', 'Pages', 'section', 1500, 50, true, 'one_time'),
    ('pages-custom-section', 'Custom Web Section', 'Pages', 'section', 1500, 50, true, 'one_time'),

    -- Website --------------------------------------------------------------
    ('web-blog-module', 'Blog Management Module', 'Website', 'module', 2500, 75, false, 'one_time'),
    ('web-responsive', 'Responsive Design', 'Website', 'website', 2000, 50, false, 'one_time'),
    ('web-mobile-opt', 'Mobile Optimization', 'Website', 'website', 1500, 40, false, 'one_time'),
    ('web-tablet-opt', 'Tablet Optimization', 'Website', 'website', 1000, 30, false, 'one_time'),
    ('web-multilingual', 'Multi-Language Support', 'Website', 'website', 3000, 100, true, 'one_time'),

    -- UI/UX ----------------------------------------------------------------
    ('uiux-custom-design', 'Custom UI/UX Design', 'UI/UX', 'project', 3000, 100, true, 'one_time'),
    ('uiux-animation', 'Custom Animation', 'UI/UX', 'animation', 1500, 50, true, 'one_time'),
    ('uiux-animation-advanced', 'Advanced Animation', 'UI/UX', 'animation', 3000, 100, true, 'one_time'),
    ('uiux-theme-toggle', 'Dark / Light Theme', 'UI/UX', 'website', 1000, 30, false, 'one_time'),

    -- Authentication -------------------------------------------------------
    ('auth-email-password', 'Email / Password Authentication', 'Authentication', 'integration', 2000, 60, false, 'one_time'),
    ('auth-google', 'Google Authentication', 'Authentication', 'integration', 1500, 50, false, 'one_time'),
    ('auth-apple', 'Apple Authentication', 'Authentication', 'integration', 2000, 60, false, 'one_time'),
    ('auth-facebook', 'Facebook Authentication', 'Authentication', 'integration', 1500, 50, false, 'one_time'),
    ('auth-phone-otp', 'Phone / OTP Authentication', 'Authentication', 'integration', 2500, 75, false, 'one_time'),
    ('auth-password-reset', 'Password Reset', 'Authentication', 'feature', 750, 25, false, 'one_time'),
    ('auth-email-verification', 'Email Verification', 'Authentication', 'feature', 1000, 30, false, 'one_time'),
    ('auth-admin', 'Admin Authentication', 'Authentication', 'feature', 1500, 50, false, 'one_time'),
    ('auth-two-factor', 'Two-Factor Authentication', 'Authentication', 'feature', 3000, 100, false, 'one_time'),

    -- User Management ------------------------------------------------------
    ('users-profile', 'User Profile', 'User Management', 'module', 2000, 60, false, 'one_time'),
    ('users-dashboard', 'User Dashboard', 'User Management', 'module', 3000, 100, false, 'one_time'),
    ('users-account-settings', 'Account Settings', 'User Management', 'module', 1500, 50, false, 'one_time'),
    ('users-role-based-access', 'Role-Based Access', 'User Management', 'module', 3000, 100, false, 'one_time'),
    ('users-permissions', 'Permission Management', 'User Management', 'module', 3000, 100, false, 'one_time'),

    -- Admin Panel ----------------------------------------------------------
    ('admin-dashboard-basic', 'Basic Admin Dashboard', 'Admin Panel', 'module', 4000, 125, false, 'one_time'),
    ('admin-dashboard-advanced', 'Advanced Admin Dashboard', 'Admin Panel', 'module', 7500, 225, false, 'one_time'),
    ('admin-analytics', 'Dashboard Analytics', 'Admin Panel', 'module', 2500, 75, false, 'one_time'),
    ('admin-user-management', 'User Management', 'Admin Panel', 'module', 2500, 75, false, 'one_time'),
    ('admin-role-management', 'Role Management', 'Admin Panel', 'module', 2500, 75, false, 'one_time'),
    ('admin-permission-management', 'Permission Management', 'Admin Panel', 'module', 3000, 100, false, 'one_time'),
    ('admin-content-management', 'Content Management', 'Admin Panel', 'module', 2500, 75, false, 'one_time'),
    ('admin-blog-management', 'Blog Management', 'Admin Panel', 'module', 2500, 75, false, 'one_time'),
    ('admin-media-management', 'Media / File Management', 'Admin Panel', 'module', 2000, 60, false, 'one_time'),
    ('admin-inquiry-management', 'Inquiry Management', 'Admin Panel', 'module', 1500, 50, false, 'one_time'),
    ('admin-contact-management', 'Contact Management', 'Admin Panel', 'module', 1500, 50, false, 'one_time'),
    ('admin-product-management', 'Product Management', 'Admin Panel', 'module', 3000, 100, false, 'one_time'),
    ('admin-order-management', 'Order Management', 'Admin Panel', 'module', 3000, 100, false, 'one_time'),
    ('admin-payment-management', 'Payment Management', 'Admin Panel', 'module', 2000, 60, false, 'one_time'),
    ('admin-coupon-management', 'Coupon Management', 'Admin Panel', 'module', 2000, 60, false, 'one_time'),
    ('admin-staff-management', 'Staff Management', 'Admin Panel', 'module', 2500, 75, false, 'one_time'),
    ('admin-reports-dashboard', 'Reports Dashboard', 'Admin Panel', 'module', 3000, 100, false, 'one_time'),
    ('admin-csv-export', 'CSV Export', 'Admin Panel', 'feature', 1000, 30, false, 'one_time'),
    ('admin-pdf-reports', 'PDF Report Generation', 'Admin Panel', 'feature', 2000, 60, false, 'one_time'),
    ('admin-notifications', 'Admin Notifications', 'Admin Panel', 'feature', 1500, 50, false, 'one_time'),
    ('admin-audit-logs', 'Audit Logs', 'Admin Panel', 'feature', 2500, 75, false, 'one_time'),
    ('admin-custom-module', 'Custom Admin Module', 'Admin Panel', 'module', 3000, 100, true, 'one_time'),

    -- Payments -------------------------------------------------------------
    ('pay-gateway', 'Payment Gateway Integration', 'Payments', 'integration', 3000, 100, false, 'one_time'),
    ('pay-razorpay', 'Razorpay Integration', 'Payments', 'integration', 3000, 100, false, 'one_time'),
    ('pay-stripe', 'Stripe Integration', 'Payments', 'integration', 4000, 125, false, 'one_time'),
    ('pay-paypal', 'PayPal Integration', 'Payments', 'integration', 4000, 125, false, 'one_time'),
    ('pay-cashfree', 'Cashfree Integration', 'Payments', 'integration', 3000, 100, false, 'one_time'),
    ('pay-phonepe', 'PhonePe Gateway', 'Payments', 'integration', 3000, 100, false, 'one_time'),
    ('pay-checkout', 'Checkout System', 'Payments', 'module', 2500, 75, false, 'one_time'),
    ('pay-status-handling', 'Payment Status Handling', 'Payments', 'feature', 1000, 30, false, 'one_time'),
    ('pay-webhooks', 'Payment Webhooks', 'Payments', 'integration', 2000, 60, false, 'one_time'),
    ('pay-refunds', 'Refund System', 'Payments', 'module', 2000, 60, false, 'one_time'),
    ('pay-subscriptions', 'Subscription Payments', 'Payments', 'module', 5000, 150, true, 'one_time'),
    ('pay-recurring-billing', 'Recurring Billing', 'Payments', 'module', 5000, 150, true, 'one_time'),
    ('pay-invoice-generation', 'Invoice Generation', 'Payments', 'module', 2000, 60, false, 'one_time'),
    ('pay-gst-invoice', 'GST Invoice Support', 'Payments', 'module', 2000, 60, false, 'one_time'),
    ('pay-history', 'Payment History', 'Payments', 'module', 2000, 60, false, 'one_time'),

    -- E-Commerce -----------------------------------------------------------
    ('ecom-foundation', 'E-Commerce Foundation', 'E-Commerce', 'project', 8000, 250, false, 'one_time'),
    ('ecom-product-catalog', 'Product Catalog', 'E-Commerce', 'module', 3000, 100, false, 'one_time'),
    ('ecom-categories', 'Product Categories', 'E-Commerce', 'module', 1500, 50, false, 'one_time'),
    ('ecom-variants', 'Product Variants', 'E-Commerce', 'module', 2500, 75, false, 'one_time'),
    ('ecom-cart', 'Shopping Cart', 'E-Commerce', 'module', 3000, 100, false, 'one_time'),
    ('ecom-wishlist', 'Wishlist', 'E-Commerce', 'module', 2000, 60, false, 'one_time'),
    ('ecom-reviews', 'Product Reviews', 'E-Commerce', 'module', 2000, 60, false, 'one_time'),
    ('ecom-customer-accounts', 'Customer Accounts', 'E-Commerce', 'module', 2000, 60, false, 'one_time'),
    ('ecom-checkout', 'Checkout', 'E-Commerce', 'module', 2500, 75, false, 'one_time'),
    ('ecom-order-management', 'Order Management', 'E-Commerce', 'module', 3000, 100, false, 'one_time'),
    ('ecom-inventory', 'Inventory Management', 'E-Commerce', 'module', 4000, 125, false, 'one_time'),
    ('ecom-coupons', 'Coupon System', 'E-Commerce', 'module', 2000, 60, false, 'one_time'),
    ('ecom-discounts', 'Discount System', 'E-Commerce', 'module', 1500, 50, false, 'one_time'),
    ('ecom-gst-invoice', 'GST Invoice System', 'E-Commerce', 'module', 2000, 60, false, 'one_time'),
    ('ecom-sales-dashboard', 'Sales Dashboard', 'E-Commerce', 'module', 3000, 100, false, 'one_time'),
    ('ecom-product-search', 'Product Search', 'E-Commerce', 'module', 2000, 60, false, 'one_time'),
    ('ecom-advanced-filtering', 'Advanced Filtering', 'E-Commerce', 'module', 3000, 100, false, 'one_time'),
    ('ecom-comparison', 'Product Comparison', 'E-Commerce', 'module', 2500, 75, false, 'one_time'),
    ('ecom-digital-delivery', 'Digital Product Delivery', 'E-Commerce', 'module', 3000, 100, false, 'one_time'),
    ('ecom-subscription-products', 'Subscription Products', 'E-Commerce', 'module', 5000, 150, true, 'one_time'),
    ('ecom-marketplace', 'Multi-Vendor Marketplace', 'E-Commerce', 'project', 10000, 350, true, 'one_time'),

    -- Shipping -------------------------------------------------------------
    ('ship-integration', 'Shipping Integration', 'Shipping', 'integration', 5000, 150, false, 'one_time'),
    ('ship-shiprocket', 'Shiprocket Integration', 'Shipping', 'integration', 5000, 150, false, 'one_time'),
    ('ship-partner-api', 'Delivery Partner API', 'Shipping', 'integration', 5000, 175, true, 'one_time'),
    ('ship-rate-calculator', 'Shipping Rate Calculator', 'Shipping', 'module', 2000, 60, false, 'one_time'),
    ('ship-zones', 'Delivery Zone Management', 'Shipping', 'module', 2000, 60, false, 'one_time'),
    ('ship-order-tracking', 'Order Tracking', 'Shipping', 'module', 2500, 75, false, 'one_time'),
    ('ship-tracking-notifications', 'Tracking Notifications', 'Shipping', 'module', 2000, 60, false, 'one_time'),
    ('ship-scheduling', 'Pickup / Delivery Scheduling', 'Shipping', 'module', 3000, 100, false, 'one_time'),
    ('ship-multi-provider', 'Multiple Shipping Providers', 'Shipping', 'integration', 5000, 175, true, 'one_time'),
    ('ship-international', 'International Shipping Logic', 'Shipping', 'module', 5000, 175, true, 'one_time'),

    -- Communication --------------------------------------------------------
    ('comm-email-config', 'Email Configuration', 'Communication', 'setup', 1500, 50, false, 'one_time'),
    ('comm-transactional-email', 'Transactional Email', 'Communication', 'integration', 2000, 60, false, 'one_time'),
    ('comm-email-notifications', 'Email Notification System', 'Communication', 'module', 1500, 50, false, 'one_time'),
    ('comm-newsletter', 'Newsletter Integration', 'Communication', 'integration', 1500, 50, false, 'one_time'),
    ('comm-sms', 'SMS Integration', 'Communication', 'integration', 2500, 75, false, 'one_time'),
    ('comm-otp-sms', 'OTP SMS Integration', 'Communication', 'integration', 2500, 75, false, 'one_time'),
    ('comm-whatsapp-cta', 'WhatsApp CTA', 'Communication', 'feature', 750, 25, false, 'one_time'),
    ('comm-whatsapp', 'WhatsApp Integration', 'Communication', 'integration', 2000, 60, false, 'one_time'),
    ('comm-whatsapp-business', 'WhatsApp Business Integration', 'Communication', 'integration', 3000, 100, false, 'one_time'),
    ('comm-whatsapp-automation', 'WhatsApp Automation', 'Communication', 'module', 5000, 150, true, 'one_time'),
    ('comm-push-notifications', 'Push Notifications', 'Communication', 'module', 3000, 100, false, 'one_time'),
    ('comm-in-app-notifications', 'In-App Notifications', 'Communication', 'module', 3000, 100, false, 'one_time'),
    ('comm-live-chat', 'Live Chat Integration', 'Communication', 'integration', 2500, 75, false, 'one_time'),
    ('comm-custom-chat', 'Custom Chat System', 'Communication', 'module', 5000, 175, true, 'one_time'),

    -- Google Integrations --------------------------------------------------
    ('google-maps', 'Google Maps Integration', 'Google Integrations', 'integration', 2000, 60, false, 'one_time'),
    ('google-maps-advanced', 'Google Maps Advanced Features', 'Google Integrations', 'integration', 3500, 100, false, 'one_time'),
    ('google-business-profile', 'Google Business Profile Setup', 'Google Integrations', 'setup', 2000, 60, false, 'one_time'),
    ('google-analytics', 'Google Analytics Setup', 'Google Integrations', 'setup', 2000, 60, false, 'one_time'),
    ('google-search-console', 'Google Search Console', 'Google Integrations', 'setup', 1000, 30, false, 'one_time'),
    ('google-tag-manager', 'Google Tag Manager', 'Google Integrations', 'setup', 1500, 50, false, 'one_time'),
    ('google-login', 'Google Login', 'Google Integrations', 'integration', 1500, 50, false, 'one_time'),
    ('google-reviews', 'Google Reviews Integration', 'Google Integrations', 'integration', 1500, 50, false, 'one_time'),
    ('google-calendar', 'Google Calendar Integration', 'Google Integrations', 'integration', 3000, 100, false, 'one_time'),
    ('google-drive', 'Google Drive Integration', 'Google Integrations', 'integration', 3000, 100, false, 'one_time'),
    ('google-sheets', 'Google Sheets Integration', 'Google Integrations', 'integration', 2500, 75, false, 'one_time'),

    -- SEO ------------------------------------------------------------------
    ('seo-basic-setup', 'Basic SEO Setup', 'SEO', 'website', 2500, 75, false, 'one_time'),
    ('seo-on-page', 'On-Page SEO', 'SEO', 'website', 3000, 100, false, 'one_time'),
    ('seo-technical', 'Technical SEO', 'SEO', 'website', 4000, 125, false, 'one_time'),
    ('seo-audit', 'SEO Audit', 'SEO', 'audit', 3000, 100, false, 'one_time'),
    ('seo-meta', 'Meta Titles & Descriptions', 'SEO', 'website', 1500, 50, false, 'one_time'),
    ('seo-sitemap', 'Sitemap Configuration', 'SEO', 'website', 750, 25, false, 'one_time'),
    ('seo-robots', 'Robots.txt', 'SEO', 'website', 500, 20, false, 'one_time'),
    ('seo-schema', 'Schema Markup', 'SEO', 'website', 2000, 60, false, 'one_time'),
    ('seo-image', 'Image SEO', 'SEO', 'website', 1000, 30, false, 'one_time'),
    ('seo-friendly-urls', 'SEO-Friendly URLs', 'SEO', 'website', 1000, 30, false, 'one_time'),
    ('seo-keyword-research', 'Keyword Research', 'SEO', 'project', 2500, 75, false, 'one_time'),
    ('seo-keyword-optimization', 'Keyword Optimization', 'SEO', 'project', 2000, 60, false, 'one_time'),
    ('seo-content', 'Content SEO', 'SEO', 'page', 2000, 60, false, 'one_time'),
    ('seo-core-web-vitals', 'Core Web Vitals Optimization', 'SEO', 'website', 3000, 100, false, 'one_time'),

    -- GEO / Local SEO ------------------------------------------------------
    ('geo-basic', 'Basic GEO Optimization', 'GEO / Local SEO', 'website', 2500, 75, false, 'one_time'),
    ('geo-local-setup', 'Local SEO Setup', 'GEO / Local SEO', 'website', 3000, 100, false, 'one_time'),
    ('geo-business-profile', 'Google Business Profile Setup', 'GEO / Local SEO', 'setup', 2000, 60, false, 'one_time'),
    ('geo-maps-optimization', 'Google Maps Optimization', 'GEO / Local SEO', 'setup', 1500, 50, false, 'one_time'),
    ('geo-localbusiness-schema', 'LocalBusiness Schema', 'GEO / Local SEO', 'website', 1500, 50, false, 'one_time'),
    ('geo-local-keywords', 'Local Keyword Optimization', 'GEO / Local SEO', 'project', 2000, 60, false, 'one_time'),
    ('geo-nap', 'NAP Optimization', 'GEO / Local SEO', 'project', 1000, 30, false, 'one_time'),
    ('geo-location-page', 'Location Landing Page', 'GEO / Local SEO', 'page', 1500, 50, false, 'one_time'),
    ('geo-multi-location', 'Multiple Location Setup', 'GEO / Local SEO', 'project', 3000, 100, true, 'one_time'),
    ('geo-local-search', 'Local Search Optimization', 'GEO / Local SEO', 'project', 3000, 100, false, 'one_time'),

    -- Performance ----------------------------------------------------------
    ('perf-audit', 'Performance Audit', 'Performance', 'audit', 2000, 60, false, 'one_time'),
    ('perf-optimization', 'Performance Optimization', 'Performance', 'website', 2500, 75, false, 'one_time'),
    ('perf-image-optimization', 'Image Optimization', 'Performance', 'website', 1000, 30, false, 'one_time'),
    ('perf-lazy-loading', 'Lazy Loading', 'Performance', 'website', 750, 25, false, 'one_time'),
    ('perf-code-optimization', 'Code Optimization', 'Performance', 'project', 2500, 75, true, 'one_time'),
    ('perf-caching', 'Caching Configuration', 'Performance', 'setup', 1500, 50, false, 'one_time'),
    ('perf-cdn', 'CDN Configuration', 'Performance', 'setup', 1500, 50, false, 'one_time'),
    ('perf-cloudflare', 'Cloudflare Configuration', 'Performance', 'setup', 1500, 50, false, 'one_time'),
    ('perf-core-web-vitals', 'Core Web Vitals Optimization', 'Performance', 'website', 3000, 100, false, 'one_time'),
    ('perf-database', 'Database Optimization', 'Performance', 'project', 3000, 100, true, 'one_time'),
    ('perf-advanced', 'Advanced Performance Optimization', 'Performance', 'project', 5000, 175, true, 'one_time'),

    -- Security -------------------------------------------------------------
    ('sec-ssl', 'SSL Configuration', 'Security', 'setup', 750, 25, false, 'one_time'),
    ('sec-basic-config', 'Basic Security Configuration', 'Security', 'setup', 1500, 50, false, 'one_time'),
    ('sec-hardening', 'Security Hardening', 'Security', 'project', 2500, 75, false, 'one_time'),
    ('sec-cloudflare', 'Cloudflare Security Setup', 'Security', 'setup', 2000, 60, false, 'one_time'),
    ('sec-rate-limiting', 'Rate Limiting', 'Security', 'feature', 2000, 60, false, 'one_time'),
    ('sec-auth-security', 'Authentication Security', 'Security', 'feature', 2000, 60, false, 'one_time'),
    ('sec-backup-config', 'Backup Configuration', 'Security', 'setup', 1500, 50, false, 'one_time'),
    ('sec-automated-backup', 'Automated Backup System', 'Security', 'module', 3000, 100, false, 'one_time'),
    ('sec-audit', 'Security Audit', 'Security', 'audit', 4000, 125, true, 'one_time'),
    ('sec-advanced', 'Advanced Security Implementation', 'Security', 'project', 5000, 175, true, 'one_time'),

    -- Hosting & Deployment -------------------------------------------------
    ('host-domain-config', 'Domain Configuration', 'Hosting', 'setup', 500, 20, false, 'one_time'),
    ('host-dns-config', 'DNS Configuration', 'Hosting', 'setup', 500, 20, false, 'one_time'),
    ('host-ssl-setup', 'SSL Setup', 'Hosting', 'setup', 750, 25, false, 'one_time'),
    ('host-deployment', 'Hosting Deployment', 'Hosting', 'setup', 1500, 50, false, 'one_time'),
    ('host-cloud-deployment', 'Cloud Deployment', 'Hosting', 'setup', 2500, 75, false, 'one_time'),
    ('host-database-setup', 'Database Setup', 'Hosting', 'setup', 2000, 60, false, 'one_time'),
    ('deploy-production', 'Production Deployment', 'Deployment', 'deployment', 2000, 60, false, 'one_time'),
    ('deploy-github-repo', 'GitHub Repository Setup', 'Deployment', 'setup', 500, 20, false, 'one_time'),
    ('deploy-env-config', 'Environment Configuration', 'Deployment', 'setup', 1000, 30, false, 'one_time'),
    ('deploy-cicd', 'CI/CD Setup', 'Deployment', 'setup', 3000, 100, false, 'one_time'),
    ('deploy-cloudflare', 'Cloudflare Setup', 'Deployment', 'setup', 1000, 30, false, 'one_time'),
    ('deploy-server-config', 'Server Configuration', 'Deployment', 'setup', 3000, 100, true, 'one_time'),

    -- API Integrations -----------------------------------------------------
    ('api-basic', 'Basic API Integration', 'API Integrations', 'integration', 3000, 100, false, 'one_time'),
    ('api-third-party', 'Third-Party API Integration', 'API Integrations', 'integration', 3000, 100, true, 'one_time'),
    ('api-custom', 'Custom API Integration', 'API Integrations', 'integration', 5000, 175, true, 'one_time'),
    ('api-rest-development', 'REST API Development', 'API Integrations', 'project', 5000, 175, true, 'one_time'),
    ('api-webhooks', 'Webhook Integration', 'API Integrations', 'integration', 2000, 60, false, 'one_time'),
    ('api-crm', 'CRM Integration', 'API Integrations', 'integration', 4000, 125, true, 'one_time'),
    ('api-erp', 'ERP Integration', 'API Integrations', 'integration', 7500, 250, true, 'one_time'),
    ('api-accounting', 'Accounting Software Integration', 'API Integrations', 'integration', 5000, 175, true, 'one_time'),
    ('api-custom-automation', 'Custom Automation', 'API Integrations', 'project', 5000, 175, true, 'one_time'),
    ('api-multi-system', 'Multi-System Integration', 'API Integrations', 'project', 10000, 350, true, 'one_time'),

    -- Advanced Features ----------------------------------------------------
    ('adv-search', 'Advanced Search', 'Advanced Features', 'module', 3000, 100, false, 'one_time'),
    ('adv-filtering', 'Advanced Filtering', 'Advanced Features', 'module', 3000, 100, false, 'one_time'),
    ('adv-booking', 'Booking System', 'Advanced Features', 'module', 5000, 175, true, 'one_time'),
    ('adv-appointments', 'Appointment System', 'Advanced Features', 'module', 4000, 125, false, 'one_time'),
    ('adv-calendar', 'Calendar System', 'Advanced Features', 'module', 3000, 100, false, 'one_time'),
    ('adv-realtime-notifications', 'Real-Time Notifications', 'Advanced Features', 'module', 3000, 100, false, 'one_time'),
    ('adv-realtime-chat', 'Real-Time Chat', 'Advanced Features', 'module', 5000, 175, true, 'one_time'),
    ('adv-custom-dashboard', 'Custom Dashboard', 'Advanced Features', 'module', 5000, 175, true, 'one_time'),
    ('adv-multi-role', 'Multi-Role System', 'Advanced Features', 'module', 5000, 175, true, 'one_time'),
    ('adv-multi-tenant', 'Multi-Tenant System', 'Advanced Features', 'project', 10000, 350, true, 'one_time'),
    ('adv-saas-foundation', 'SaaS Foundation', 'Advanced Features', 'project', 15000, 500, true, 'one_time'),
    ('adv-workflow-automation', 'Custom Workflow Automation', 'Advanced Features', 'project', 5000, 175, true, 'one_time'),

    -- AI -------------------------------------------------------------------
    ('ai-api-integration', 'AI API Integration', 'AI', 'integration', 5000, 175, true, 'one_time'),
    ('ai-chatbot', 'AI Chatbot', 'AI', 'module', 7500, 250, true, 'one_time'),
    ('ai-content-feature', 'AI Content Feature', 'AI', 'module', 5000, 175, true, 'one_time'),
    ('ai-recommendations', 'Recommendation System', 'AI', 'module', 7500, 250, true, 'one_time'),

    -- Branding -------------------------------------------------------------
    ('brand-logo', 'Logo Design', 'Branding', 'design', 5000, 150, false, 'one_time'),
    ('brand-identity-kit', 'Brand Identity Kit', 'Branding', 'project', 12000, 400, false, 'one_time'),
    ('brand-business-card', 'Business Card Design', 'Branding', 'design', 1000, 30, false, 'one_time'),
    ('brand-social-kit', 'Social Media Kit', 'Branding', 'project', 3000, 100, false, 'one_time'),

    -- Content --------------------------------------------------------------
    ('content-copywriting', 'Website Copywriting', 'Content', 'word', 3, 0.10, false, 'one_time'),
    ('content-seo-writing', 'SEO Content Writing', 'Content', 'word', 4, 0.12, false, 'one_time'),
    ('content-product-description', 'Product Description', 'Content', 'product', 300, 10, false, 'one_time'),
    ('content-blog-article', 'Blog Article', 'Content', 'article', 1500, 50, true, 'one_time'),
    ('content-migration', 'Website Content Migration', 'Content', 'project', 2000, 60, true, 'one_time'),
    ('content-image-optimization', 'Image Optimization', 'Content', 'project', 1000, 30, true, 'one_time'),

    -- Testing --------------------------------------------------------------
    ('qa-functional', 'Functional Testing', 'Testing', 'project', 2000, 60, false, 'one_time'),
    ('qa-mobile', 'Mobile Testing', 'Testing', 'project', 1500, 50, false, 'one_time'),
    ('qa-cross-browser', 'Cross-Browser Testing', 'Testing', 'project', 1500, 50, false, 'one_time'),
    ('qa-ui', 'UI Testing', 'Testing', 'project', 1500, 50, false, 'one_time'),
    ('qa-performance', 'Performance Testing', 'Testing', 'project', 2000, 60, false, 'one_time'),
    ('qa-security', 'Security Testing', 'Testing', 'project', 3000, 100, true, 'one_time'),
    ('qa-pre-launch', 'Pre-Launch QA', 'Testing', 'project', 2000, 60, false, 'one_time'),
    ('qa-bug-fixing', 'Bug Fixing / Stabilization', 'Testing', 'project', 2000, 60, true, 'one_time'),
    ('qa-production-verification', 'Production Verification', 'Testing', 'project', 1500, 50, false, 'one_time'),

    -- Training -------------------------------------------------------------
    ('train-basic-admin', 'Basic Admin Training', 'Training', 'session', 1000, 30, false, 'one_time'),
    ('train-staff-session', 'Staff Training Session', 'Training', 'session', 1500, 50, false, 'one_time'),
    ('train-advanced-admin', 'Advanced Admin Training', 'Training', 'session', 2500, 75, false, 'one_time'),
    ('train-documentation', 'Documentation', 'Training', 'project', 2000, 60, false, 'one_time'),
    ('train-technical-docs', 'Technical Documentation', 'Training', 'project', 3000, 100, true, 'one_time'),
    ('train-video-guide', 'Video Training Guide', 'Training', 'project', 2500, 75, false, 'one_time'),
    ('train-handover', 'Deployment Handover', 'Training', 'session', 1500, 50, false, 'one_time'),

    -- Maintenance (recurring) ----------------------------------------------
    ('care-essential-monthly', 'Essential Care', 'Maintenance', 'month', 999, 39, false, 'monthly'),
    ('care-business-monthly', 'Business Care', 'Maintenance', 'month', 1999, 69, false, 'monthly'),
    ('care-premium-monthly', 'Premium Care', 'Maintenance', 'month', 3999, 129, false, 'monthly'),
    ('care-essential-annual', 'Essential Care (Annual)', 'Maintenance', 'year', 10999, 399, false, 'yearly'),
    ('care-business-annual', 'Business Care (Annual)', 'Maintenance', 'year', 21999, 699, false, 'yearly'),
    ('care-premium-annual', 'Premium Care (Annual)', 'Maintenance', 'year', 42999, 1299, false, 'yearly'),

    -- Infrastructure (recurring) -------------------------------------------
    ('infra-basic-hosting', 'Basic Hosting Management', 'Infrastructure', 'year', 2000, 75, false, 'yearly'),
    ('infra-managed-hosting', 'Managed Hosting', 'Infrastructure', 'year', 5000, 175, false, 'yearly'),
    ('infra-premium-hosting', 'Premium Hosting', 'Infrastructure', 'year', 10000, 350, false, 'yearly'),
    ('infra-domain-management', 'Domain Management', 'Infrastructure', 'year', 1000, 30, false, 'yearly'),
    ('infra-ssl-management', 'SSL Management', 'Infrastructure', 'year', 750, 25, false, 'yearly'),
    ('infra-database-management', 'Database Management', 'Infrastructure', 'year', 3000, 100, false, 'yearly'),
    ('infra-cloud-management', 'Cloud Infrastructure Management', 'Infrastructure', 'year', 5000, 175, true, 'yearly'),
    ('infra-cdn-management', 'CDN Management', 'Infrastructure', 'year', 2000, 60, false, 'yearly'),
    ('infra-backup-management', 'Backup Management', 'Infrastructure', 'year', 2000, 60, false, 'yearly'),

    -- Retainers (recurring) ------------------------------------------------
    ('retainer-seo-starter', 'SEO Starter Retainer', 'SEO', 'month', 4999, 199, false, 'monthly'),
    ('retainer-seo-growth', 'SEO Growth Retainer', 'SEO', 'month', 9999, 349, false, 'monthly'),
    ('retainer-seo-premium', 'SEO Premium Retainer', 'SEO', 'month', 19999, 699, false, 'monthly'),
    ('retainer-geo-starter', 'GEO Starter Retainer', 'GEO / Local SEO', 'month', 4999, 199, false, 'monthly'),
    ('retainer-geo-growth', 'GEO Growth Retainer', 'GEO / Local SEO', 'month', 9999, 349, false, 'monthly'),
    ('retainer-geo-premium', 'GEO Premium Retainer', 'GEO / Local SEO', 'month', 19999, 699, false, 'monthly'),

    -- Support --------------------------------------------------------------
    ('support-minor-change', 'Minor Change', 'Support', 'change', 500, 20, false, 'one_time'),
    ('support-small-feature', 'Small Feature Change', 'Support', 'change', 1500, 50, false, 'one_time'),
    ('support-medium-feature', 'Medium Feature Change', 'Support', 'change', 3000, 100, false, 'one_time'),
    ('support-complex-feature', 'Complex Feature Change', 'Support', 'change', 5000, 175, true, 'one_time'),
    ('support-emergency', 'Emergency Support', 'Support', 'hour', 2500, 100, false, 'one_time'),
    ('support-dedicated-dev', 'Dedicated Development', 'Support', 'hour', 1500, 60, false, 'one_time'),
    ('support-after-hours', 'After-Hours Support', 'Support', 'hour', 2000, 75, false, 'one_time'),

    -- Optional quote fees --------------------------------------------------
    ('fee-weekend-deployment', 'Weekend Deployment', 'Other', 'deployment', 2000, 75, false, 'one_time'),
    ('fee-revision-round', 'Additional Revision Round', 'Other', 'round', 1500, 50, false, 'one_time'),
    ('fee-design-revision', 'Additional Design Revision', 'Other', 'round', 1000, 30, false, 'one_time'),
    ('fee-training-session', 'Additional Training Session', 'Other', 'session', 1500, 50, false, 'one_time'),
    ('fee-documentation', 'Additional Documentation', 'Other', 'project', 2000, 60, false, 'one_time')
),
numbered as (
  select c.*, (row_number() over ())::int * 10 as ord from catalog c
)
insert into billing_items (
  code, name, category, unit, unit_price, unit_price_intl, price_from, recurring, "order", active, optional
)
select code, name, category, unit, price_in, price_int, price_from, recurring, ord, true, true
from numbered
on conflict (code) do update set
  name = excluded.name,
  category = excluded.category,
  unit = excluded.unit,
  unit_price = excluded.unit_price,
  unit_price_intl = excluded.unit_price_intl,
  price_from = excluded.price_from,
  recurring = excluded.recurring,
  "order" = excluded."order",
  updated_at = now();

-- ---------------------------------------------------------------------------
-- 4. Package presets
-- ---------------------------------------------------------------------------

insert into billing_packages (code, name, category, description, price_inr, price_intl, price_from, recurring, badge, includes, "order")
values
  ('pkg-starter-website', 'Starter Website', 'Package',
   'Best for freelancers, professionals, local businesses and startups.',
   8999, 299, false, 'one_time', null,
   '["Responsive website","Up to 5 pages","Contact form","Google Maps integration","WhatsApp integration","Social media links","Basic SEO","SSL configuration","Mobile & tablet optimization","Basic performance optimization","Deployment"]'::jsonb,
   10),
  ('pkg-business-website', 'Business Website', 'Package',
   'Best for established businesses requiring a stronger online presence.',
   14999, 499, false, 'one_time', null,
   '["Everything in Starter","Up to 10 pages","Custom UI/UX","Blog / news section","Admin panel","Image gallery","Testimonials","Inquiry management","Advanced SEO","Performance optimization","Google Analytics","Search Console"]'::jsonb,
   20),
  ('pkg-business-pro', 'Business Pro', 'Package',
   'Best for growing businesses requiring dynamic content and administration.',
   21999, 749, false, 'one_time', null,
   '["Everything in Business","Unlimited standard pages","Advanced admin dashboard","Team management","Dynamic content","Blog management","Analytics","Performance optimization","Security hardening","Staff training","Advanced reporting"]'::jsonb,
   30),
  ('pkg-ecommerce-starter', 'E-Commerce Starter', 'Package',
   'Best for businesses starting online sales.',
   34999, 1199, false, 'one_time', null,
   '["Professional store design","Up to 50 products","Product categories","Shopping cart","Payment gateway","Order management","Customer accounts","Mobile responsive design","Basic SEO","Contact form","WhatsApp integration"]'::jsonb,
   40),
  ('pkg-ecommerce-growth', 'E-Commerce Growth', 'Package',
   'Everything in E-Commerce Starter, built for scale.',
   49999, 1699, false, 'one_time', 'Most popular',
   '["Everything in E-Commerce Starter","Unlimited products","Inventory management","Shipping partner integration","Coupon system","Wishlist","Product reviews","Blog module","Sales dashboard","GST invoice support","Email notifications","Analytics","Advanced SEO","Enhanced security"]'::jsonb,
   50),
  ('pkg-ecommerce-premium', 'E-Commerce Premium', 'Package',
   'Best for established brands requiring advanced commerce infrastructure.',
   79999, 2699, false, 'one_time', null,
   '["Everything in E-Commerce Growth","Custom features","Multi-role admin","Loyalty program","Referral system","CRM integration","ERP integration","WhatsApp automation","Advanced reports","API integrations","Priority support","Dedicated training sessions"]'::jsonb,
   60),
  ('pkg-custom-web-app', 'Custom Web Application', 'Package',
   'SaaS apps, business management systems, portals, learning and booking platforms.',
   49999, 1699, true, 'one_time', null,
   '["Base application architecture","Authentication","Core dashboards","Database design","Deployment","Additional modules quoted separately"]'::jsonb,
   70),
  ('pkg-saas-platform', 'SaaS / Advanced Platform', 'Package',
   'Multi-user, multi-role, subscription and API-heavy platforms.',
   99999, 3499, true, 'one_time', null,
   '["Authentication","User dashboard","Admin dashboard","Role management","Database architecture","API foundation","Security foundation","Deployment","Basic analytics","Documentation"]'::jsonb,
   80),
  ('pkg-seo-starter', 'SEO Starter', 'Retainer',
   'Monthly SEO retainer.',
   4999, 199, false, 'monthly', null,
   '["Keyword monitoring","Basic on-page optimization","Technical monitoring","Search Console monitoring","Monthly report"]'::jsonb,
   90),
  ('pkg-seo-growth', 'SEO Growth', 'Retainer',
   'Monthly SEO retainer.',
   9999, 349, false, 'monthly', null,
   '["Everything in SEO Starter","Keyword research","Content optimization","Technical SEO","Local SEO","Competitor monitoring","Monthly SEO report"]'::jsonb,
   100),
  ('pkg-seo-premium', 'SEO Premium', 'Retainer',
   'Monthly SEO retainer.',
   19999, 699, false, 'monthly', null,
   '["Everything in SEO Growth","Advanced technical SEO","Content strategy","Advanced keyword research","GEO optimization","Conversion optimization","Competitor analysis","Monthly strategy consultation"]'::jsonb,
   110),
  ('pkg-essential-care', 'Essential Care', 'Maintenance',
   'Monthly maintenance plan.',
   999, 39, false, 'monthly', null,
   '["Website backups","Security monitoring","Software updates","Uptime monitoring","Minor bug fixes"]'::jsonb,
   120),
  ('pkg-business-care', 'Business Care', 'Maintenance',
   'Monthly maintenance plan.',
   1999, 69, false, 'monthly', null,
   '["Everything in Essential Care","Content updates","Monthly health report","Performance optimization","Priority email support","Minor technical changes"]'::jsonb,
   130),
  ('pkg-premium-care', 'Premium Care', 'Maintenance',
   'Monthly maintenance plan.',
   3999, 129, false, 'monthly', null,
   '["Everything in Business Care","Priority support","Minor feature enhancements","SEO monitoring","Monthly consultation","Performance audits","Advanced technical assistance"]'::jsonb,
   140)
on conflict (code) do update set
  name = excluded.name,
  category = excluded.category,
  description = excluded.description,
  price_inr = excluded.price_inr,
  price_intl = excluded.price_intl,
  price_from = excluded.price_from,
  recurring = excluded.recurring,
  badge = excluded.badge,
  includes = excluded.includes,
  "order" = excluded."order",
  updated_at = now();

-- ---------------------------------------------------------------------------
-- 5. Letterhead defaults
-- ---------------------------------------------------------------------------

insert into site_settings (key, value) values
  ('billing_tagline', jsonb_build_object('text', 'Launch your next venture online.')),
  ('billing_payment_terms', jsonb_build_object('text', '40% advance on confirmation. 60% before final deployment.')),
  ('billing_third_party_note', jsonb_build_object('text', 'Domain, hosting, cloud services, premium plugins, API fees, payment gateway charges, SMS charges and other third-party services are billed separately unless explicitly included.')),
  ('billing_support_policy', jsonb_build_object('text', '30-day bug-fix support for delivered functionality. New features and change requests are quoted separately.'))
on conflict (key) do nothing;

update site_settings
   set value = jsonb_build_object('text', 'LYNVO CREATIVE SOLUTIONS LLP')
 where key = 'billing_legal_name'
   and coalesce(value ->> 'text', '') in ('', 'LYNVO LLP');

update site_settings
   set value = jsonb_build_object('text', 'ACZ-7607')
 where key = 'billing_llpin'
   and coalesce(value ->> 'text', '') = '';
