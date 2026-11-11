export const SETTING_KEYS: { key: string; label: string; type: "text" | "textarea" }[] = [
  { key: "site_name", label: "Site name", type: "text" as const },
  { key: "tagline", label: "Tagline", type: "text" as const },
  { key: "hero_kicker", label: "Hero kicker", type: "text" as const },
  { key: "hero_headline", label: "Hero headline", type: "textarea" as const },
  { key: "hero_description", label: "Hero description", type: "textarea" as const },
  { key: "contact_email", label: "Contact email", type: "text" as const },
  { key: "contact_phone", label: "Contact phone", type: "text" as const },
  { key: "address", label: "Address", type: "textarea" as const },
  { key: "response_time", label: "Response time", type: "textarea" as const },
  { key: "footer_command", label: "Footer command", type: "text" as const },
  { key: "footer_status", label: "Footer status", type: "text" as const },
  { key: "footer_note", label: "Footer note", type: "textarea" as const },
  { key: "legal_note", label: "Legal note", type: "textarea" as const },
  { key: "default_seo_title", label: "Default SEO title", type: "text" as const },
  { key: "default_seo_description", label: "Default SEO description", type: "textarea" as const },
];

/** Sales targets shown on the marketing pipeline. */
SETTING_KEYS.push(
  { key: "crm_daily_call_target", label: "Sales: daily call target", type: "text" as const },
  { key: "crm_weekly_meeting_target", label: "Sales: weekly meetings target", type: "text" as const },
  { key: "crm_monthly_won_target", label: "Sales: monthly clients won target", type: "text" as const }
);

export const SITE_COPY_GROUPS = [
  {
    title: "lynvo.studio — home page",
    description: "Launch your venture online: websites, brand identity, online presence and growth.",
    keys: [
      { key: "hero_kicker", label: "Hero kicker", type: "text" as const },
      { key: "hero_headline", label: "Hero headline", type: "textarea" as const },
      { key: "hero_description", label: "Hero description", type: "textarea" as const },
      { key: "hero_primary_cta", label: "Primary button", type: "text" as const },
      { key: "hero_secondary_cta", label: "Secondary button", type: "text" as const },
      { key: "studio_tech_teaser", label: "LYNVO Tech teaser line", type: "text" as const, help: "The strip linking to lynvo.tech." },
    ],
  },
  {
    title: "lynvo.tech — home page",
    description: "Custom software for small businesses and cybersecurity.",
    keys: [
      { key: "tech_hero_kicker", label: "Hero kicker", type: "text" as const },
      { key: "tech_hero_headline", label: "Hero headline", type: "textarea" as const },
      { key: "tech_hero_description", label: "Hero description", type: "textarea" as const },
      { key: "tech_primary_cta", label: "Primary button", type: "text" as const },
      { key: "tech_tagline", label: "Footer tagline", type: "text" as const },
      { key: "tech_contact_email", label: "Contact email", type: "text" as const, help: "Falls back to the studio contact email." },
    ],
  },
];

export const SITE_COPY_KEYS = SITE_COPY_GROUPS.flatMap((group) => group.keys.map((entry) => entry.key));
