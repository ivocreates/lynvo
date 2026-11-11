/**
 * Legal and HR document templates.
 *
 * Each template is plain text in the light markup understood by
 * lib/documents.ts (# heading, ## subheading, - bullet, 1. numbered,
 * | table |, --- page break). {{tokens}} are filled from company settings, the
 * client / project / quote or the staff member, plus the template's own fields.
 * Anything left unfilled prints as a blank line to complete by hand.
 *
 * These are practical starting points written for an Indian LLP. Have a lawyer
 * review them once before relying on them for high-value work.
 */

import type { DocType } from "@/lib/documents";

export type FieldType = "text" | "textarea" | "date" | "number" | "money" | "select";

export interface TemplateField {
  key: string;
  label: string;
  type: FieldType;
  default?: string;
  options?: string[];
  help?: string;
  required?: boolean;
  /** Leave the line out entirely when empty, instead of printing a blank to fill in. */
  omitIfEmpty?: boolean;
}

export interface LegalTemplate {
  key: string;
  title: string;
  audience: "client" | "staff";
  category: string;
  description: string;
  /** staff_documents.doc_type for HR templates. */
  docType?: DocType;
  /** Client must sign in the portal / staff member must sign before download. */
  signature: boolean;
  fields: TemplateField[];
  body: string;
  /** Derived values (e.g. payslip totals) computed from the filled fields. */
  compute?: (values: Record<string, string>) => Record<string, string>;
}

/** Marks a line to drop from the rendered document. */
const OMIT = "\u0000omit";

const num = (value: string | undefined) => Number(String(value ?? "").replace(/[^0-9.-]/g, "")) || 0;

export function formatInr(value: number | string) {
  const amount = typeof value === "number" ? value : num(value);
  return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 2 }).format(amount);
}

// Signature blocks (with the client's e-signature record) are printed by the
// agreement layout itself, so the body only closes the agreement.
const SIGN_OFF_CLIENT = `Signed by the authorised representatives of {{company_legal_name}} and {{client_name}} as recorded below.`;

const GOVERNING_LAW = `This document is governed by the laws of India. The courts at {{jurisdiction}} have exclusive jurisdiction over any dispute arising from it.`;

// ---------------------------------------------------------------------------
// Client templates
// ---------------------------------------------------------------------------

const CLIENT_TEMPLATES: LegalTemplate[] = [
  {
    key: "portfolio_consent",
    title: "Portfolio & Case Study Consent",
    audience: "client",
    category: "Handover",
    description: "Permission to showcase the work on LYNVO's website, social media and pitch decks.",
    signature: true,
    fields: [
      { key: "project_title", label: "Project", type: "text", required: true },
      { key: "work_description", label: "Work to be showcased", type: "textarea", default: "Website design and development, brand identity and related visual assets." },
      {
        key: "allowed_uses",
        label: "Permitted uses",
        type: "textarea",
        default:
          "- Screenshots, screen recordings and mock-ups of the delivered work\n- A written case study describing the brief, approach and results\n- The client's name and logo as a client of LYNVO\n- A link to the live website or product",
      },
      { key: "restrictions", label: "Restrictions / confidential items", type: "textarea", default: "No customer data, pricing, internal dashboards or unreleased features will be shown." },
      { key: "credit_line", label: "Credit line", type: "text", default: "Designed and built by LYNVO" },
    ],
    body: `# 1. Parties
This consent is given by {{client_name}} ("the Client") to {{company_legal_name}} ("LYNVO") on {{today}}, in connection with the project "{{project_title}}".

# 2. Work covered
{{work_description}}

# 3. Permission granted
The Client permits LYNVO to display and describe the work, worldwide and free of charge, on LYNVO's websites (including lynvo.studio and lynvo.tech), social media, proposals, pitch decks, award entries and printed portfolios. Permitted uses:
{{allowed_uses}}

# 4. Restrictions
{{restrictions}}

LYNVO will remove any item from its portfolio within 14 days of a written request from the Client.

# 5. Credit
The Client agrees that LYNVO may include a discreet credit on the delivered website or product: "{{credit_line}}", linking to LYNVO's website, unless the Client asks for it to be removed in writing.

# 6. Ownership
This consent does not transfer or limit the Client's ownership of the work. It only allows LYNVO to show the work as an example of its services.

# 7. Duration
This consent continues until withdrawn in writing by the Client. Withdrawal does not require LYNVO to recall printed material already distributed.

${GOVERNING_LAW}

${SIGN_OFF_CLIENT}`,
  },
  {
    key: "ip_assignment",
    title: "Intellectual Property Assignment & Ownership Transfer",
    audience: "client",
    category: "Handover",
    description: "Transfers ownership of the final deliverables to the client once fully paid.",
    signature: true,
    fields: [
      { key: "project_title", label: "Project", type: "text", required: true },
      { key: "deliverables", label: "Deliverables transferred", type: "textarea", default: "- Final website source code and database schema\n- Final logo files (AI, SVG, PNG, PDF) and brand guidelines\n- Design files for all approved screens and assets" },
      { key: "project_value", label: "Project value", type: "text", help: "Filled from the quote when one is chosen." },
      { key: "quote_number", label: "Quotation / invoice reference", type: "text" },
      {
        key: "retained_items",
        label: "Retained by LYNVO",
        type: "textarea",
        default: "LYNVO's pre-existing code libraries, components, frameworks, internal tools, templates and know-how used to build the deliverables. The Client receives a perpetual, royalty-free licence to use these as part of the deliverables.",
      },
      {
        key: "third_party",
        label: "Third-party components",
        type: "textarea",
        default: "Open-source software, fonts, stock images, plugins and APIs remain under their own licences, which the Client agrees to follow. Paid licences are the Client's responsibility unless listed in the quotation.",
      },
    ],
    body: `# 1. Parties
This assignment is made on {{today}} between {{company_legal_name}}, {{company_address}} ("LYNVO") and {{client_name}}, {{client_address}} ("the Client").

# 2. Background
LYNVO created the deliverables below for the Client under the project "{{project_title}}" (reference {{quote_number}}, project value {{project_value}}).

# 3. Deliverables
{{deliverables}}

# 4. Assignment
Subject to full payment of all amounts due for the project, LYNVO assigns to the Client all copyright and other intellectual property rights in the final, approved deliverables, including the right to modify, reproduce, distribute and commercially exploit them, worldwide and for the full term of those rights, in accordance with Section 18 of the Copyright Act, 1957.

Until full payment is received, the Client holds a limited, revocable licence to use the deliverables for review and testing only.

# 5. What LYNVO keeps
{{retained_items}}

Unused concepts, drafts and alternative designs that the Client did not select remain the property of LYNVO.

# 6. Third-party material
{{third_party}}

# 7. Moral rights and portfolio
LYNVO may show the work in its portfolio as agreed in any portfolio consent, and the Client will not remove LYNVO's authorship credit from LYNVO's own materials.

# 8. Warranties
LYNVO confirms that, to the best of its knowledge, the deliverables are original work of LYNVO and its team and do not knowingly infringe the rights of others, except for third-party material listed above.

# 9. Further steps
LYNVO will sign any further documents reasonably needed to record the Client's ownership, such as domain or repository transfers.

${GOVERNING_LAW}

${SIGN_OFF_CLIENT}`,
  },
  {
    key: "handover_certificate",
    title: "Project Handover & Acceptance Certificate",
    audience: "client",
    category: "Handover",
    description: "Confirms delivery, credentials handed over and the start of the warranty period.",
    signature: true,
    fields: [
      { key: "project_title", label: "Project", type: "text", required: true },
      { key: "project_url", label: "Live URL / app link", type: "text" },
      { key: "delivery_date", label: "Delivery date", type: "date" },
      { key: "delivered_items", label: "Delivered", type: "textarea", default: "- Production website deployed and live\n- Admin panel with training\n- Source code repository access\n- Brand and design asset files" },
      {
        key: "credentials",
        label: "Access handed over",
        type: "textarea",
        default: "| Service | Account / owner | Status |\n| Domain registrar | Client account | Transferred |\n| Hosting / cloud | Client account | Transferred |\n| Code repository | Client organisation | Owner access given |\n| Admin panel | Client email | Owner access given |",
      },
      { key: "warranty_days", label: "Bug-fix warranty (days)", type: "number", default: "30" },
      { key: "acceptance_notes", label: "Notes / open items", type: "textarea", default: "None." },
    ],
    body: `# 1. Project
Project: {{project_title}}

Client: {{client_name}}

Delivered on: {{delivery_date}}

Live at: {{project_url}}

# 2. Delivered
{{delivered_items}}

# 3. Access and credentials handed over
{{credentials}}

The Client should change all passwords after handover. LYNVO keeps no access unless the Client grants it for support.

# 4. Acceptance
The Client has reviewed the deliverables and accepts that they meet the agreed scope, subject to these notes:
{{acceptance_notes}}

# 5. Warranty and support
LYNVO will fix defects in the delivered functionality reported within {{warranty_days}} days of the delivery date at no extra cost. New features, content changes, third-party outages and issues caused by changes made by others are outside this warranty and can be covered by a maintenance plan.

# 6. Responsibility after handover
From the delivery date the Client is responsible for renewing domains, hosting, licences and third-party services held in its name, unless they are covered by a LYNVO maintenance plan.

${SIGN_OFF_CLIENT}`,
  },
  {
    key: "software_license",
    title: "Software License Agreement",
    audience: "client",
    category: "Licensing",
    description: "Licenses a LYNVO product or reusable platform where LYNVO keeps ownership.",
    signature: true,
    fields: [
      { key: "product_name", label: "Software / product", type: "text", required: true },
      { key: "license_type", label: "Licence type", type: "select", options: ["Annual subscription, non-exclusive", "Perpetual, non-exclusive", "Monthly subscription, non-exclusive"], default: "Annual subscription, non-exclusive" },
      { key: "users", label: "Users / locations / seats", type: "text", default: "Up to 5 users at one business location" },
      { key: "license_fee", label: "Licence fee", type: "money" },
      { key: "fee_terms", label: "Fee terms", type: "text", default: "payable annually in advance" },
      { key: "term", label: "Term", type: "text", default: "12 months from the effective date, renewing automatically unless either party gives 30 days' notice" },
      { key: "support_terms", label: "Support included", type: "textarea", default: "Bug fixes, security updates and email support on business days (10am–6pm IST), with a response within one business day." },
    ],
    body: `# 1. Parties
This agreement is made on {{today}} between {{company_legal_name}} ("LYNVO", "Licensor") and {{client_name}}, {{client_address}} ("Licensee").

# 2. Grant of licence
LYNVO grants the Licensee a {{license_type}} licence to use {{product_name}} ("the Software") for its internal business purposes, limited to: {{users}}.

# 3. Fees
The Licensee will pay {{license_fee}}, {{fee_terms}}. Taxes are extra where applicable. LYNVO may suspend access if fees remain unpaid 15 days after the due date.

# 4. Term
{{term}}.

# 5. Ownership
The Software, its source code, designs, documentation and all improvements remain the exclusive property of LYNVO. No ownership is transferred. Data the Licensee enters into the Software belongs to the Licensee.

# 6. Restrictions
The Licensee will not:
- copy, resell, sublicense, rent or share the Software with third parties
- reverse engineer, decompile or attempt to extract the source code
- remove LYNVO's notices or use the Software to build a competing product
- use the Software unlawfully or in breach of the Information Technology Act, 2000

# 7. Support and updates
{{support_terms}}

# 8. Data protection
LYNVO processes personal data in the Software only to provide the service and in line with the Digital Personal Data Protection Act, 2023. On termination, LYNVO will export the Licensee's data on request within 30 days and then delete it.

# 9. Warranty and liability
The Software is provided with reasonable skill and care. LYNVO's total liability under this agreement is limited to the fees paid in the 12 months before the claim. Neither party is liable for indirect or consequential loss.

# 10. Termination
Either party may terminate for a material breach not fixed within 30 days of written notice. On termination the licence ends and the Licensee must stop using the Software.

${GOVERNING_LAW}

${SIGN_OFF_CLIENT}`,
  },
  {
    key: "service_agreement",
    title: "Service Agreement & Statement of Work",
    audience: "client",
    category: "Engagement",
    description: "Scope, timeline, payment schedule and responsibilities for a project.",
    signature: true,
    fields: [
      { key: "project_title", label: "Project", type: "text", required: true },
      { key: "quote_number", label: "Quotation reference", type: "text" },
      { key: "project_value", label: "Project value", type: "text", help: "Filled from the quote when one is chosen." },
      { key: "scope", label: "Scope of work", type: "textarea", default: "As described in the quotation referenced above, which forms part of this agreement." },
      { key: "timeline", label: "Timeline", type: "textarea", default: "- Discovery and design: 1–2 weeks\n- Development: 3–4 weeks\n- Testing and launch: 1 week" },
      { key: "payment_schedule", label: "Payment schedule", type: "textarea" },
      { key: "revision_rounds", label: "Revision rounds included", type: "number", default: "2" },
      { key: "client_responsibilities", label: "Client responsibilities", type: "textarea", default: "- Provide content, images, logins and feedback within 3 business days of each request\n- Nominate one person to approve work\n- Pay invoices by their due date" },
    ],
    body: `# 1. Parties
This agreement is made on {{today}} between {{company_legal_name}}, {{company_address}} ("LYNVO") and {{client_name}}, {{client_address}} ("the Client").

# 2. Project
{{project_title}} — quotation {{quote_number}}, project value {{project_value}} plus applicable taxes.

# 3. Scope of work
{{scope}}

Anything not listed in the scope is a change request and will be quoted separately before work begins.

# 4. Timeline
{{timeline}}

Timelines depend on the Client providing content and feedback on time. Delays on the Client's side extend the timeline by at least the same period.

# 5. Payment
{{payment_schedule}}

Work may pause if an invoice is more than 7 days overdue. Final files and ownership transfer once the project is paid in full.

# 6. Revisions
Each design stage includes {{revision_rounds}} rounds of revisions. Further rounds are billed at the rates in LYNVO's catalogue.

# 7. Client responsibilities
{{client_responsibilities}}

# 8. Intellectual property
On full payment, ownership of the final deliverables passes to the Client as set out in LYNVO's Intellectual Property Assignment. LYNVO keeps its pre-existing tools and components and may show the work in its portfolio unless the Client objects in writing.

# 9. Confidentiality
Both parties will keep each other's non-public business information confidential during the project and for two years after it ends.

# 10. Third-party costs
Domains, hosting, paid plugins, API usage, SMS / email credits and payment gateway fees are billed separately unless included in the quotation.

# 11. Termination
Either party may end this agreement with 15 days' written notice. The Client pays for work completed up to the termination date; advances cover work already done and are non-refundable to that extent.

# 12. Liability
LYNVO's total liability is limited to the fees paid for the project. Neither party is liable for indirect or consequential loss, including lost profits or data.

${GOVERNING_LAW}

${SIGN_OFF_CLIENT}`,
  },
  {
    key: "maintenance_agreement",
    title: "Maintenance & Support Agreement (AMC)",
    audience: "client",
    category: "Engagement",
    description: "Monthly or annual care plan: what's included, response times and exclusions.",
    signature: true,
    fields: [
      { key: "plan_name", label: "Plan", type: "select", options: ["Essential Care", "Business Care", "Premium Care", "Custom plan"], default: "Business Care" },
      { key: "fee", label: "Fee per cycle", type: "money" },
      { key: "cycle", label: "Billing cycle", type: "select", options: ["monthly", "quarterly", "yearly"], default: "monthly" },
      { key: "start_date", label: "Start date", type: "date" },
      { key: "term_months", label: "Minimum term (months)", type: "number", default: "12" },
      { key: "covered_assets", label: "Websites / apps covered", type: "textarea" },
      { key: "included", label: "Included services", type: "textarea", default: "- Daily backups and restore on request\n- Security and uptime monitoring\n- Software, plugin and dependency updates\n- Bug fixes in existing functionality\n- Up to 2 hours of small content or design changes per month\n- Monthly health report" },
      { key: "response_time", label: "Response time", type: "text", default: "within 1 business day; critical outages within 4 business hours" },
      { key: "exclusions", label: "Not included", type: "textarea", default: "- New features, pages or redesigns (quoted separately)\n- Third-party service fees (domain, hosting, licences)\n- Recovery from changes made by anyone other than LYNVO" },
    ],
    body: `# 1. Parties
This agreement is made on {{today}} between {{company_legal_name}} ("LYNVO") and {{client_name}} ("the Client").

# 2. Plan and fee
Plan: {{plan_name}}

Fee: {{fee}} {{cycle}}, invoiced in advance, plus applicable taxes.

Start date: {{start_date}}, for a minimum term of {{term_months}} months, renewing automatically for the same period unless either party gives 30 days' written notice.

# 3. Covered websites and applications
{{covered_assets}}

# 4. Included services
{{included}}

Unused hours do not carry over to the next cycle.

# 5. Response times
LYNVO will respond to support requests {{response_time}}. Requests are made by email or through the client portal.

# 6. Not included
{{exclusions}}

Out-of-scope work is quoted in advance and billed at the support rates in LYNVO's catalogue.

# 7. Client responsibilities
The Client keeps LYNVO's access active, tells LYNVO before making changes itself, and pays invoices by the due date. Support may pause if an invoice is more than 15 days overdue.

# 8. Liability
LYNVO takes reasonable care but cannot guarantee uninterrupted service from hosting providers or third parties. LYNVO's liability is limited to the fees paid in the three months before the claim.

${GOVERNING_LAW}

${SIGN_OFF_CLIENT}`,
  },
  {
    key: "mutual_nda",
    title: "Mutual Non-Disclosure Agreement",
    audience: "client",
    category: "Engagement",
    description: "Both sides protect confidential information shared before or during a project.",
    signature: true,
    fields: [
      { key: "purpose", label: "Purpose", type: "textarea", default: "Discussing and evaluating a potential project, and delivering it if agreed." },
      { key: "term_years", label: "Confidentiality period (years)", type: "number", default: "2" },
    ],
    body: `# 1. Parties
This agreement is made on {{today}} between {{company_legal_name}}, {{company_address}} and {{client_name}}, {{client_address}}. Each is a "Party", and the Party sharing information is the "Discloser".

# 2. Purpose
{{purpose}}

# 3. Confidential information
Any non-public business, technical, financial or customer information shared in any form, marked confidential or reasonably understood to be confidential, including source code, designs, credentials, pricing, strategies and personal data.

# 4. Obligations
Each Party will:
- use the other's confidential information only for the purpose above
- share it only with employees and contractors who need it and are bound by similar duties
- protect it with at least reasonable care
- return or delete it on request

# 5. Exceptions
Information that is public through no fault of the recipient, already known to it, independently developed, or required to be disclosed by law (with prompt notice to the Discloser where allowed) is not confidential.

# 6. Term
These obligations last for {{term_years}} years from the date of this agreement. Trade secrets and credentials remain confidential for as long as they qualify as such.

# 7. No licence
Nothing in this agreement grants any licence or ownership in the other Party's information or intellectual property.

# 8. Remedies
Unauthorised disclosure may cause irreparable harm, so the Discloser may seek an injunction in addition to any other remedy.

${GOVERNING_LAW}

${SIGN_OFF_CLIENT}`,
  },
  {
    key: "change_request",
    title: "Change Request Approval",
    audience: "client",
    category: "Engagement",
    description: "Records approval for extra scope, cost and timeline before work starts.",
    signature: true,
    fields: [
      { key: "project_title", label: "Project", type: "text", required: true },
      { key: "change_description", label: "Change requested", type: "textarea", required: true },
      { key: "added_cost", label: "Additional cost", type: "money" },
      { key: "timeline_impact", label: "Timeline impact", type: "text", default: "Adds 3 business days" },
    ],
    body: `# Change request
Project: {{project_title}}

Client: {{client_name}}

Date: {{today}}

# Change
{{change_description}}

# Impact
Additional cost: {{added_cost}} plus applicable taxes, invoiced with the next milestone.

Timeline: {{timeline_impact}}.

# Approval
By signing, the Client approves this change. All other terms of the original agreement and quotation stay the same.

${SIGN_OFF_CLIENT}`,
  },
  {
    key: "security_testing_authorization",
    title: "Security Testing Authorization (VAPT)",
    audience: "client",
    category: "Cybersecurity",
    description: "Written permission and scope for vulnerability assessment / penetration testing.",
    signature: true,
    fields: [
      { key: "scope_targets", label: "In-scope targets", type: "textarea", required: true, default: "| Target | Type |\n| https://example.com | Web application |\n| api.example.com | API |" },
      { key: "testing_type", label: "Testing type", type: "select", options: ["Black-box", "Grey-box (test accounts provided)", "White-box (source code provided)"], default: "Grey-box (test accounts provided)" },
      { key: "window", label: "Testing window", type: "text", default: "Weekdays, 10:00–19:00 IST" },
      { key: "start_date", label: "Start date", type: "date" },
      { key: "end_date", label: "End date", type: "date" },
      { key: "exclusions", label: "Out of scope / prohibited", type: "textarea", default: "- Denial-of-service and load testing\n- Social engineering and phishing of staff\n- Physical access testing\n- Any system not listed as in scope, including third-party providers" },
      { key: "client_contact_details", label: "Client technical contact (name, phone)", type: "text" },
      { key: "emergency_contact", label: "Emergency contact", type: "text" },
    ],
    body: `# 1. Authorization
{{client_name}} ("the Client") authorises {{company_legal_name}} ("LYNVO") to perform security testing on the systems listed below, which the Client owns or is legally entitled to authorise testing on. This authorization is given under the Information Technology Act, 2000 and is valid only for the scope and dates stated.

# 2. Scope
{{scope_targets}}

Testing approach: {{testing_type}}

# 3. Dates and window
From {{start_date}} to {{end_date}}, during {{window}}.

# 4. Out of scope
{{exclusions}}

# 5. Rules of engagement
- LYNVO will test from the IP addresses it shares with the Client before starting
- If testing appears to disrupt a production system, LYNVO will stop immediately and inform the contacts below
- Critical findings will be reported to the Client within 24 hours of discovery
- LYNVO will not access, copy or change real customer data beyond what is needed to prove a finding, and will delete any such data at the end of the engagement

# 6. Contacts
Client technical contact: {{client_contact_details}}

Emergency contact: {{emergency_contact}}

# 7. Confidentiality and reporting
Findings, evidence and the final report are confidential to the Client. LYNVO will securely delete test artefacts 30 days after delivering the final report.

# 8. Acknowledgement
The Client understands that security testing carries some risk of service interruption, confirms it has backups of the in-scope systems, and agrees that LYNVO is not liable for interruptions arising from testing carried out within this scope.

${GOVERNING_LAW}

${SIGN_OFF_CLIENT}`,
  },
];

// ---------------------------------------------------------------------------
// Staff / HR templates
// ---------------------------------------------------------------------------

const SIGN_OFF_STAFF = `For {{company_legal_name}}

{{signatory_name}}

{{signatory_title}}`;

const ACCEPTANCE = `# Acceptance
I, {{name}}, accept the terms set out above.

Signature: ________________________

Date: ________________________`;

const STAFF_TEMPLATES: LegalTemplate[] = [
  {
    key: "offer_letter",
    title: "Offer Letter",
    audience: "staff",
    docType: "offer_letter",
    category: "Hiring",
    description: "Job offer with role, compensation, start date and probation.",
    signature: true,
    fields: [
      { key: "position", label: "Position", type: "text", required: true },
      { key: "department", label: "Department", type: "text" },
      { key: "employment_type", label: "Employment type", type: "select", options: ["full-time", "part-time", "freelance"], default: "full-time" },
      { key: "start_date", label: "Start date", type: "date", required: true },
      { key: "ctc_annual", label: "Annual CTC", type: "money" },
      { key: "monthly_gross", label: "Monthly gross salary", type: "money" },
      { key: "probation_months", label: "Probation (months)", type: "number", default: "3" },
      { key: "work_location", label: "Work location", type: "text", default: "Remote / hybrid" },
      { key: "working_hours", label: "Working hours", type: "text", default: "Monday to Friday, 10:00–18:00 IST" },
      { key: "reporting_to", label: "Reports to", type: "text" },
      { key: "incentives", label: "Incentives / commission", type: "textarea", omitIfEmpty: true, help: "E.g. 10% commission on the first invoice of every client sourced." },
      { key: "accept_by", label: "Accept by", type: "date" },
    ],
    body: `Dear {{name}},

We are delighted to offer you the position of {{position}} in the {{department}} team at {{company_brand}}. This letter sets out the main terms of our offer.

# 1. Role
Position: {{position}}

Employment type: {{employment_type}}

Reporting to: {{reporting_to}}

Location: {{work_location}}

Working hours: {{working_hours}}

# 2. Start date
Your employment will begin on {{start_date}}.

# 3. Compensation
Your annual cost to company will be {{ctc_annual}}, paid monthly as a gross salary of {{monthly_gross}}, subject to statutory deductions. A detailed salary structure will be shared with your appointment letter.

{{incentives}}

# 4. Probation
You will be on probation for {{probation_months}} months. During probation either party may end the employment with 7 days' notice.

# 5. Conditions
This offer depends on satisfactory verification of your identity, education and previous employment, and on you signing LYNVO's employment agreement and non-disclosure agreement.

# 6. Acceptance
Please confirm your acceptance by signing this letter on or before {{accept_by}}.

We look forward to building great work together.

${SIGN_OFF_STAFF}

${ACCEPTANCE}`,
  },
  {
    key: "internship_offer",
    title: "Internship Offer Letter",
    audience: "staff",
    docType: "offer_letter",
    category: "Hiring",
    description: "Internship role, duration, stipend and mentor.",
    signature: true,
    fields: [
      { key: "position", label: "Internship role", type: "text", required: true, default: "Design Intern" },
      { key: "start_date", label: "Start date", type: "date", required: true },
      { key: "end_date", label: "End date", type: "date", required: true },
      { key: "stipend", label: "Monthly stipend", type: "money", default: "0" },
      { key: "mentor", label: "Mentor", type: "text" },
      { key: "work_location", label: "Location", type: "text", default: "Remote" },
      { key: "hours", label: "Expected hours", type: "text", default: "20–25 hours per week" },
    ],
    body: `Dear {{name}},

We are pleased to offer you an internship at {{company_brand}} as {{position}}.

# 1. Duration
From {{start_date}} to {{end_date}}.

# 2. Stipend
A monthly stipend of {{stipend}}, paid by the 7th of the following month.

# 3. Mentor and work
You will work with {{mentor}} on live client and internal projects. Expected commitment: {{hours}}, location: {{work_location}}.

# 4. Learning and certificate
On successful completion you will receive an internship certificate and, based on your performance, a letter of recommendation.

# 5. Confidentiality and ownership
You will sign LYNVO's internship agreement and NDA. Work you create during the internship belongs to LYNVO and its clients; you may show it in your personal portfolio once the client work is public, with LYNVO's written permission.

Please sign below to accept.

${SIGN_OFF_STAFF}

${ACCEPTANCE}`,
  },
  {
    key: "appointment_letter",
    title: "Appointment Letter",
    audience: "staff",
    docType: "appointment",
    category: "Hiring",
    description: "Formal appointment with salary structure, leave and notice period.",
    signature: true,
    fields: [
      { key: "position", label: "Designation", type: "text", required: true },
      { key: "start_date", label: "Date of joining", type: "date", required: true },
      { key: "basic", label: "Basic (monthly)", type: "money" },
      { key: "hra", label: "HRA (monthly)", type: "money" },
      { key: "special_allowance", label: "Special allowance (monthly)", type: "money" },
      { key: "notice_days", label: "Notice period (days)", type: "number", default: "30" },
      { key: "leave_days", label: "Paid leave per year", type: "number", default: "18" },
    ],
    compute: (values) => {
      const gross = num(values.basic) + num(values.hra) + num(values.special_allowance);
      return { monthly_gross: formatInr(gross), annual_gross: formatInr(gross * 12) };
    },
    body: `Dear {{name}},

Further to your acceptance of our offer, we are pleased to appoint you as {{position}} at {{company_legal_name}} with effect from {{start_date}}.

# 1. Salary structure
| Component | Monthly |
| Basic | {{basic}} |
| House rent allowance | {{hra}} |
| Special allowance | {{special_allowance}} |
| Gross salary | {{monthly_gross}} |

Annual gross: {{annual_gross}}. Statutory deductions (professional tax, TDS and PF where applicable) are made from the gross.

# 2. Leave
You are entitled to {{leave_days}} days of paid leave per calendar year, plus public holidays as notified by LYNVO.

# 3. Notice period
After confirmation, either party may end the employment by giving {{notice_days}} days' written notice or salary in lieu of notice.

# 4. Policies
You agree to follow LYNVO's policies published in the team workspace, as updated from time to time.

${SIGN_OFF_STAFF}

${ACCEPTANCE}`,
  },
  {
    key: "employment_agreement",
    title: "Employment Agreement",
    audience: "staff",
    docType: "contract",
    category: "Hiring",
    description: "Full employment terms: duties, IP, confidentiality, non-solicitation, termination.",
    signature: true,
    fields: [
      { key: "position", label: "Designation", type: "text", required: true },
      { key: "start_date", label: "Start date", type: "date", required: true },
      { key: "monthly_gross", label: "Monthly gross salary", type: "money" },
      { key: "probation_months", label: "Probation (months)", type: "number", default: "3" },
      { key: "notice_days", label: "Notice period (days)", type: "number", default: "30" },
      { key: "non_solicit_months", label: "Non-solicitation (months)", type: "number", default: "12" },
    ],
    body: `# 1. Parties
This agreement is made on {{today}} between {{company_legal_name}}, {{company_address}} ("the Company") and {{name}} ("the Employee").

# 2. Appointment
The Company employs the Employee as {{position}} from {{start_date}}. The first {{probation_months}} months are a probation period.

# 3. Duties
The Employee will perform the duties of the role diligently, follow reasonable instructions, use the Company's tools and workspace for all work, and not take up other paid work that conflicts with the Company's business without written consent.

# 4. Salary
A monthly gross salary of {{monthly_gross}}, paid by the 7th of the following month, subject to statutory deductions. Salary is reviewed annually.

# 5. Intellectual property
All work created by the Employee in the course of employment, including code, designs, copy, ideas and documentation, belongs to the Company (or its clients, as agreed with them) from creation. The Employee assigns any rights in such work to the Company and will sign documents needed to confirm this.

# 6. Confidentiality
During and after employment, the Employee will not disclose or misuse confidential information of the Company or its clients, including source code, credentials, pricing, client lists and personal data. Client credentials must never be stored outside approved tools.

# 7. Data protection
The Employee will handle personal data only as needed for work and in line with the Digital Personal Data Protection Act, 2023 and Company policy.

# 8. Non-solicitation
For {{non_solicit_months}} months after leaving, the Employee will not solicit the Company's clients with whom they worked, or encourage Company staff to leave.

# 9. Termination
After probation, either party may terminate with {{notice_days}} days' notice or salary in lieu. The Company may terminate immediately for serious misconduct, including fraud, harassment or a breach of confidentiality.

# 10. Return of property
On leaving, the Employee will return all Company property and hand over all work, files and access.

${GOVERNING_LAW}

# Signatures
${SIGN_OFF_STAFF}

Employee: {{name}}

Signature: ________________________`,
  },
  {
    key: "internship_agreement",
    title: "Internship Agreement",
    audience: "staff",
    docType: "contract",
    category: "Hiring",
    description: "Internship terms, learning goals, IP and confidentiality.",
    signature: true,
    fields: [
      { key: "position", label: "Internship role", type: "text", required: true },
      { key: "start_date", label: "Start date", type: "date" },
      { key: "end_date", label: "End date", type: "date" },
      { key: "stipend", label: "Monthly stipend", type: "money" },
      { key: "learning_goals", label: "Learning goals", type: "textarea", default: "- Work on live client projects end to end\n- Learn LYNVO's design and development workflow\n- Build a portfolio of reviewed work" },
    ],
    body: `# 1. Parties
This agreement is made on {{today}} between {{company_legal_name}} ("LYNVO") and {{name}} ("the Intern").

# 2. Internship
Role: {{position}}, from {{start_date}} to {{end_date}}. Stipend: {{stipend}} per month.

# 3. Learning goals
{{learning_goals}}

# 4. Conduct
The Intern will follow LYNVO's policies, attend scheduled check-ins and update tasks in the team workspace.

# 5. Ownership and portfolio
Work produced during the internship belongs to LYNVO or its clients. The Intern may show finished, publicly released work in a personal portfolio with LYNVO's written permission and appropriate credit.

# 6. Confidentiality
The Intern will keep all LYNVO and client information confidential during and after the internship.

# 7. Ending the internship
Either party may end the internship with 7 days' notice. A certificate is issued on satisfactory completion.

# Signatures
${SIGN_OFF_STAFF}

Intern: {{name}}

Signature: ________________________`,
  },
  {
    key: "employee_nda",
    title: "Employee / Contractor NDA",
    audience: "staff",
    docType: "nda",
    category: "Hiring",
    description: "Confidentiality of company and client information, credentials and code.",
    signature: true,
    fields: [{ key: "term_years", label: "Survives for (years after leaving)", type: "number", default: "3" }],
    body: `# 1. Parties
This agreement is made on {{today}} between {{company_legal_name}} ("LYNVO") and {{name}} ("the Recipient").

# 2. Confidential information
All non-public information about LYNVO, its clients and their customers, including source code, designs, credentials, pricing, proposals, client lists, strategies and personal data.

# 3. Obligations
The Recipient will:
- use confidential information only for LYNVO work
- not copy it to personal devices or accounts except through approved tools
- never share client credentials, and report any suspected leak immediately
- return or delete all confidential information when asked or on leaving

# 4. Duration
These obligations apply during the engagement and for {{term_years}} years after it ends; trade secrets and credentials for as long as they remain confidential.

# 5. Remedies
A breach may cause LYNVO and its clients serious harm. LYNVO may seek an injunction and damages, and may end the engagement immediately.

${GOVERNING_LAW}

# Signatures
${SIGN_OFF_STAFF}

Recipient: {{name}}

Signature: ________________________`,
  },
  {
    key: "payslip",
    title: "Payslip",
    audience: "staff",
    docType: "payslip",
    category: "Payroll",
    description: "Monthly salary slip with earnings, deductions and net pay.",
    signature: false,
    fields: [
      { key: "pay_month", label: "Pay month", type: "text", required: true, help: "E.g. November 2026" },
      { key: "working_days", label: "Working days", type: "number", default: "22" },
      { key: "paid_days", label: "Paid days", type: "number", default: "22" },
      { key: "basic", label: "Basic", type: "money" },
      { key: "hra", label: "HRA", type: "money" },
      { key: "special_allowance", label: "Special allowance", type: "money" },
      { key: "incentive", label: "Incentive / commission", type: "money", default: "0" },
      { key: "pf", label: "Provident fund", type: "money", default: "0" },
      { key: "professional_tax", label: "Professional tax", type: "money", default: "0" },
      { key: "tds", label: "TDS", type: "money", default: "0" },
      { key: "other_deductions", label: "Other deductions", type: "money", default: "0" },
      { key: "bank_account", label: "Bank account (last 4 digits)", type: "text" },
      { key: "pan", label: "PAN", type: "text" },
      { key: "payment_date", label: "Paid on", type: "date" },
    ],
    compute: (values) => {
      const earnings = num(values.basic) + num(values.hra) + num(values.special_allowance) + num(values.incentive);
      const deductions = num(values.pf) + num(values.professional_tax) + num(values.tds) + num(values.other_deductions);
      return {
        gross_earnings: formatInr(earnings),
        total_deductions: formatInr(deductions),
        net_pay: formatInr(earnings - deductions),
      };
    },
    body: `Salary slip for {{pay_month}}

| Employee | Details |
| Name | {{name}} |
| Designation | {{title}} |
| Department | {{department}} |
| Date of joining | {{joined_on}} |
| PAN | {{pan}} |
| Bank account | xxxx {{bank_account}} |
| Working days / paid days | {{working_days}} / {{paid_days}} |

| Earnings | Amount |
| Basic | {{basic}} |
| House rent allowance | {{hra}} |
| Special allowance | {{special_allowance}} |
| Incentive / commission | {{incentive}} |
| Gross earnings | {{gross_earnings}} |

| Deductions | Amount |
| Provident fund | {{pf}} |
| Professional tax | {{professional_tax}} |
| TDS | {{tds}} |
| Other deductions | {{other_deductions}} |
| Total deductions | {{total_deductions}} |

| Summary | Amount |
| Net pay | {{net_pay}} |

Paid on {{payment_date}} by bank transfer. This is a computer-generated payslip.`,
  },
  {
    key: "experience_certificate",
    title: "Experience Certificate",
    audience: "staff",
    docType: "certificate",
    category: "Exit",
    description: "Confirms role and period of employment.",
    signature: false,
    fields: [
      { key: "position", label: "Last designation", type: "text" },
      { key: "last_day", label: "Last working day", type: "date", required: true },
      { key: "summary", label: "Summary of work", type: "textarea", default: "worked on client websites, brand identities and internal tools" },
    ],
    body: `# To whom it may concern
This is to certify that {{name}} was employed with {{company_legal_name}} as {{position}} from {{joined_on}} to {{last_day}}.

During this period, {{name}} {{summary}}. Their conduct throughout was professional and we found them sincere and hardworking.

We wish them every success in their future endeavours.

${SIGN_OFF_STAFF}`,
  },
  {
    key: "internship_certificate",
    title: "Internship Completion Certificate",
    audience: "staff",
    docType: "certificate",
    category: "Exit",
    description: "Confirms completion of the internship and the work done.",
    signature: false,
    fields: [
      { key: "position", label: "Internship role", type: "text" },
      { key: "start_date", label: "Start date", type: "date" },
      { key: "end_date", label: "End date", type: "date" },
      { key: "projects", label: "Projects contributed to", type: "textarea", default: "client website builds, social media creatives and internal tools" },
    ],
    body: `# To whom it may concern
This is to certify that {{name}} successfully completed an internship with {{company_legal_name}} as {{position}} from {{start_date}} to {{end_date}}.

During the internship, {{name}} contributed to {{projects}} and showed a strong willingness to learn.

We wish them the very best for the future.

${SIGN_OFF_STAFF}`,
  },
  {
    key: "recommendation",
    title: "Letter of Recommendation",
    audience: "staff",
    docType: "recommendation",
    category: "Exit",
    description: "Personal recommendation highlighting strengths and achievements.",
    signature: false,
    fields: [
      { key: "relationship", label: "How you worked together", type: "text", default: "as their direct manager" },
      { key: "strengths", label: "Strengths", type: "textarea", default: "- Clear communicator with clients\n- Strong eye for design detail\n- Takes ownership of deadlines" },
      { key: "achievement", label: "Stand-out achievement", type: "textarea", omitIfEmpty: true },
      { key: "recommended_for", label: "Recommended for", type: "text", default: "any role in design, technology or client services" },
    ],
    body: `# To whom it may concern
I am pleased to recommend {{name}}, who worked at {{company_brand}} as {{title}}. I worked with {{name}} {{relationship}}.

## Strengths
{{strengths}}

{{achievement}}

I recommend {{name}} without reservation for {{recommended_for}}. Please feel free to contact me at {{company_email}} for any further information.

${SIGN_OFF_STAFF}`,
  },
  {
    key: "relieving_letter",
    title: "Relieving Letter",
    audience: "staff",
    docType: "relieving",
    category: "Exit",
    description: "Confirms resignation accepted and duties handed over.",
    signature: false,
    fields: [
      { key: "resignation_date", label: "Resignation date", type: "date" },
      { key: "last_day", label: "Last working day", type: "date", required: true },
      { key: "position", label: "Designation", type: "text" },
    ],
    body: `Dear {{name}},

This is to confirm that your resignation dated {{resignation_date}} has been accepted and you are relieved from your duties as {{position}} at {{company_legal_name}} with effect from the close of business on {{last_day}}.

You have handed over your responsibilities, company property and access. Your full and final settlement will be processed as per company policy.

Your obligations of confidentiality and non-solicitation under your employment agreement continue to apply.

We thank you for your contribution and wish you the very best.

${SIGN_OFF_STAFF}`,
  },
  {
    key: "salary_revision",
    title: "Salary Revision Letter",
    audience: "staff",
    docType: "letter",
    category: "Payroll",
    description: "Announces a raise or new designation from an effective date.",
    signature: false,
    fields: [
      { key: "effective_date", label: "Effective from", type: "date", required: true },
      { key: "old_ctc", label: "Current annual CTC", type: "money" },
      { key: "new_ctc", label: "Revised annual CTC", type: "money" },
      { key: "new_designation", label: "New designation (if any)", type: "text", omitIfEmpty: true },
    ],
    compute: (values) => {
      const before = num(values.old_ctc);
      const after = num(values.new_ctc);
      return {
        increase_percent: before > 0 ? `${(((after - before) / before) * 100).toFixed(1)}%` : "—",
        new_designation_line: values.new_designation ? `New designation: ${values.new_designation}` : OMIT,
      };
    },
    body: `Dear {{name}},

In recognition of your contribution, we are pleased to revise your compensation with effect from {{effective_date}}.

| Item | Amount |
| Current annual CTC | {{old_ctc}} |
| Revised annual CTC | {{new_ctc}} |
| Increase | {{increase_percent}} |

{{new_designation_line}}

All other terms of your employment remain unchanged. Thank you for your continued commitment.

${SIGN_OFF_STAFF}`,
  },
];

export const LEGAL_TEMPLATES: LegalTemplate[] = [...CLIENT_TEMPLATES, ...STAFF_TEMPLATES];

export const getTemplate = (key: string) => LEGAL_TEMPLATES.find((template) => template.key === key);

export const clientTemplates = () => CLIENT_TEMPLATES;
export const staffTemplates = () => STAFF_TEMPLATES;

/** Field values typed as dates or money are formatted for print. */
export function formatFieldValues(template: LegalTemplate, raw: Record<string, string>) {
  const values: Record<string, string> = { ...raw };
  for (const field of template.fields) {
    const value = raw[field.key];
    if (!value) {
      if (field.omitIfEmpty) values[field.key] = OMIT;
      continue;
    }
    if (field.type === "money") values[field.key] = formatInr(value);
    if (field.type === "date" && /^\d{4}-\d{2}-\d{2}$/.test(value)) values[field.key] = formatLongDate(value);
  }
  return { ...values, ...(template.compute?.(raw) ?? {}) };
}

export function formatLongDate(iso: string) {
  return new Date(`${iso}T00:00:00`).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" });
}

/** Fills {{tokens}}; anything without a value becomes a blank to complete by hand. */
export function renderTemplate(body: string, values: Record<string, string>) {
  return body
    .replace(/\{\{\s*(\w+)\s*\}\}/g, (_match, key: string) => {
      const value = values[key];
      return value && value.trim() ? value : "________________";
    })
    .split("\n")
    .filter((line) => !line.includes(OMIT))
    .join("\n")
    .replace(/\n{3,}/g, "\n\n");
}
