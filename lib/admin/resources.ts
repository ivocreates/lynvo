export type FieldType =
  | "text"
  | "textarea"
  | "markdown"
  | "slug"
  | "number"
  | "boolean"
  | "select"
  | "tags"
  | "json"
  | "url"
  | "datetime";

export interface FieldConfig {
  name: string;
  label: string;
  type: FieldType;
  required?: boolean;
  options?: { value: string; label: string }[];
  help?: string;
  min?: number;
  max?: number;
  /** Shown as a column in the list view. */
  inList?: boolean;
}

export interface ResourceConfig {
  key: string;
  table: string;
  label: string;
  labelSingular: string;
  /** Column used as the row heading in lists and audit metadata. */
  titleField: string;
  fields: FieldConfig[];
  orderBy: { column: string; ascending: boolean };
  searchColumns: string[];
}

const STATUS_OPTIONS = [
  { value: "draft", label: "Draft" },
  { value: "published", label: "Published" },
];

const SEO_FIELDS: FieldConfig[] = [
  { name: "seo_title", label: "SEO title", type: "text" },
  { name: "seo_description", label: "SEO description", type: "textarea" },
];

export const RESOURCES: ResourceConfig[] = [
  {
    key: "projects",
    table: "projects",
    label: "Projects",
    labelSingular: "Project",
    titleField: "title",
    orderBy: { column: "created_at", ascending: false },
    searchColumns: ["title", "slug", "category"],
    fields: [
      { name: "title", label: "Title", type: "text", required: true, inList: true },
      { name: "slug", label: "Slug", type: "slug", required: true, inList: true, help: "Lowercase, hyphenated. Used in the public URL." },
      { name: "status", label: "Status", type: "select", required: true, options: STATUS_OPTIONS, inList: true },
      { name: "category", label: "Category", type: "text", inList: true },
      { name: "industry", label: "Industry", type: "text" },
      { name: "excerpt", label: "Excerpt", type: "textarea" },
      { name: "content", label: "Content (JSON)", type: "json", help: "Structured case-study blocks." },
      { name: "tags", label: "Tags", type: "tags", help: "Comma separated." },
      { name: "featured", label: "Featured", type: "boolean", inList: true },
      { name: "image_url", label: "Image URL", type: "url" },
      ...SEO_FIELDS,
    ],
  },
  {
    key: "services",
    table: "services",
    label: "Services",
    labelSingular: "Service",
    titleField: "title",
    orderBy: { column: "order", ascending: true },
    searchColumns: ["title", "slug"],
    fields: [
      { name: "title", label: "Title", type: "text", required: true, inList: true },
      { name: "slug", label: "Slug", type: "slug", required: true, inList: true },
      { name: "excerpt", label: "Excerpt", type: "textarea" },
      { name: "content", label: "Content (JSON)", type: "json", help: "Process, deliverables, FAQ." },
      { name: "tags", label: "Tags", type: "tags" },
      { name: "active", label: "Active", type: "boolean", inList: true },
      { name: "featured", label: "Featured", type: "boolean", inList: true },
      { name: "order", label: "Order", type: "number", min: 0, inList: true },
      { name: "image_url", label: "Image URL", type: "url" },
      ...SEO_FIELDS,
    ],
  },
  {
    key: "blog",
    table: "blog_posts",
    label: "Blog posts",
    labelSingular: "Blog post",
    titleField: "title",
    orderBy: { column: "created_at", ascending: false },
    searchColumns: ["title", "slug"],
    fields: [
      { name: "title", label: "Title", type: "text", required: true, inList: true },
      { name: "slug", label: "Slug", type: "slug", required: true, inList: true },
      { name: "status", label: "Status", type: "select", required: true, options: STATUS_OPTIONS, inList: true },
      { name: "excerpt", label: "Excerpt", type: "textarea" },
      { name: "content", label: "Content", type: "markdown" },
      { name: "tags", label: "Tags", type: "tags" },
      { name: "cover_image_url", label: "Cover image URL", type: "url" },
      { name: "published_at", label: "Publish date", type: "datetime", inList: true, help: "Set automatically when you publish without a date." },
      ...SEO_FIELDS,
    ],
  },
  {
    key: "team",
    table: "team_members",
    label: "Team",
    labelSingular: "Team member",
    titleField: "display_name",
    orderBy: { column: "order", ascending: true },
    searchColumns: ["display_name", "role"],
    fields: [
      { name: "display_name", label: "Name", type: "text", required: true, inList: true },
      { name: "role", label: "Role", type: "text", inList: true },
      { name: "bio", label: "Bio", type: "textarea" },
      { name: "skills", label: "Skills", type: "tags" },
      { name: "social_links", label: "Social links (JSON)", type: "json", help: '{"linkedin":"https://..."}' },
      { name: "image_url", label: "Photo URL", type: "url" },
      { name: "is_active", label: "Active", type: "boolean", inList: true },
      { name: "order", label: "Order", type: "number", min: 0, inList: true },
    ],
  },
  {
    key: "reviews",
    table: "reviews",
    label: "Reviews",
    labelSingular: "Review",
    titleField: "author_name",
    orderBy: { column: "created_at", ascending: false },
    searchColumns: ["author_name", "author_role"],
    fields: [
      { name: "author_name", label: "Author", type: "text", required: true, inList: true },
      { name: "author_role", label: "Author role", type: "text", inList: true },
      { name: "content", label: "Testimonial", type: "textarea", required: true },
      { name: "rating", label: "Rating (1-5)", type: "number", min: 1, max: 5, inList: true },
      {
        name: "status",
        label: "Status",
        type: "select",
        required: true,
        inList: true,
        options: [
          { value: "pending", label: "Pending" },
          { value: "approved", label: "Approved" },
          { value: "rejected", label: "Rejected" },
        ],
      },
      { name: "featured", label: "Featured", type: "boolean", inList: true },
    ],
  },
  {
    key: "stats",
    table: "stats",
    label: "Statistics",
    labelSingular: "Statistic",
    titleField: "label",
    orderBy: { column: "order", ascending: true },
    searchColumns: ["label"],
    fields: [
      { name: "label", label: "Label", type: "text", required: true, inList: true },
      { name: "value", label: "Value", type: "text", required: true, inList: true },
      { name: "suffix", label: "Suffix", type: "text", inList: true },
      { name: "active", label: "Active", type: "boolean", inList: true },
      { name: "order", label: "Order", type: "number", min: 0, inList: true },
    ],
  },
  {
    key: "social",
    table: "social_links",
    label: "Social links",
    labelSingular: "Social link",
    titleField: "platform",
    orderBy: { column: "order", ascending: true },
    searchColumns: ["platform"],
    fields: [
      { name: "platform", label: "Platform", type: "text", required: true, inList: true },
      { name: "url", label: "URL", type: "url", required: true, inList: true },
      { name: "active", label: "Active", type: "boolean", inList: true },
      { name: "order", label: "Order", type: "number", min: 0, inList: true },
    ],
  },
  {
    key: "billing-items",
    table: "billing_items",
    label: "Billing items",
    labelSingular: "Billing item",
    titleField: "name",
    orderBy: { column: "order", ascending: true },
    searchColumns: ["name", "hsn_sac"],
    fields: [
      { name: "name", label: "Name", type: "text", required: true, inList: true },
      { name: "description", label: "Description", type: "textarea" },
      { name: "unit", label: "Unit", type: "text", inList: true, help: "e.g. hour, page, project, month." },
      { name: "unit_price", label: "Unit price", type: "number", min: 0, inList: true },
      { name: "tax_rate", label: "Tax rate (%)", type: "number", min: 0, max: 100, inList: true },
      { name: "hsn_sac", label: "HSN / SAC", type: "text" },
      { name: "active", label: "Active", type: "boolean", inList: true },
      { name: "order", label: "Order", type: "number", min: 0, inList: true },
    ],
  },
  {
    key: "careers",
    table: "job_openings",
    label: "Careers",
    labelSingular: "Job opening",
    titleField: "title",
    orderBy: { column: "order", ascending: true },
    searchColumns: ["title", "slug", "department"],
    fields: [
      { name: "title", label: "Title", type: "text", required: true, inList: true },
      { name: "slug", label: "Slug", type: "slug", required: true, help: "Lowercase, hyphenated. Used in the apply link." },
      {
        name: "employment_type",
        label: "Employment type",
        type: "select",
        required: true,
        inList: true,
        options: [
          { value: "full-time", label: "Full-time" },
          { value: "part-time", label: "Part-time" },
          { value: "internship", label: "Internship" },
          { value: "freelance", label: "Freelance" },
        ],
      },
      { name: "department", label: "Department", type: "text", inList: true },
      { name: "location", label: "Location", type: "text", inList: true },
      { name: "excerpt", label: "Excerpt", type: "textarea", help: "One line shown on the careers card." },
      { name: "description", label: "Description", type: "textarea" },
      { name: "responsibilities", label: "Responsibilities", type: "tags", help: "One bullet per entry." },
      { name: "requirements", label: "Requirements", type: "tags", help: "One bullet per entry." },
      { name: "is_open", label: "Open", type: "boolean", inList: true },
      { name: "order", label: "Order", type: "number", min: 0, inList: true },
    ],
  },
  {
    key: "faqs",
    table: "faqs",
    label: "FAQs",
    labelSingular: "FAQ",
    titleField: "question",
    orderBy: { column: "order", ascending: true },
    searchColumns: ["question", "category"],
    fields: [
      { name: "question", label: "Question", type: "text", required: true, inList: true },
      { name: "answer", label: "Answer", type: "textarea", required: true },
      {
        name: "category",
        label: "Category",
        type: "select",
        required: true,
        inList: true,
        options: [
          { value: "contact", label: "Contact page" },
          { value: "services", label: "Services page" },
          { value: "careers", label: "Careers page" },
        ],
      },
      { name: "active", label: "Active", type: "boolean", inList: true },
      { name: "order", label: "Order", type: "number", min: 0, inList: true },
    ],
  },
  {
    key: "meetings",
    table: "meetings",
    label: "Meetings",
    labelSingular: "Meeting",
    titleField: "title",
    orderBy: { column: "created_at", ascending: false },
    searchColumns: ["title", "location"],
    fields: [
      { name: "title", label: "Title", type: "text", required: true, inList: true },
      { name: "agenda", label: "Agenda", type: "textarea", help: "One item per line." },
      {
        name: "cadence",
        label: "Cadence",
        type: "select",
        required: true,
        inList: true,
        options: [
          { value: "weekly", label: "Weekly" },
          { value: "fortnightly", label: "Fortnightly" },
          { value: "once", label: "One-off" },
        ],
      },
      {
        name: "weekday",
        label: "Day",
        type: "number",
        min: 0,
        max: 6,
        inList: true,
        help: "0 = Sunday … 6 = Saturday. Used by recurring cadences.",
      },
      { name: "start_time", label: "Start time", type: "text", required: true, inList: true, help: "24-hour HH:MM." },
      {
        name: "timezone",
        label: "Timezone",
        type: "text",
        required: true,
        help: "IANA name, e.g. Asia/Kolkata. The start time is read in this zone.",
      },
      { name: "duration_minutes", label: "Duration (min)", type: "number", min: 5, max: 480 },
      { name: "starts_on", label: "Date", type: "text", help: "YYYY-MM-DD, for one-off meetings only." },
      { name: "location", label: "Location / link", type: "text", inList: true },
      {
        name: "audience",
        label: "Audience",
        type: "select",
        required: true,
        options: [
          { value: "all", label: "Whole team" },
          { value: "managers", label: "Managers only" },
        ],
      },
      { name: "is_active", label: "Active", type: "boolean", inList: true },
    ],
  },
];

export function getResource(key: string) {
  return RESOURCES.find((resource) => resource.key === key);
}
