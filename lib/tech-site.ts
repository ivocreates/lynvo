import "server-only";

import { headers } from "next/headers";
import { siteForHost } from "@/lib/sites";
import { getStudioUrl } from "@/lib/env";

/**
 * On lynvo.tech the middleware rewrites "/x" to "/tech/x", so links are
 * root-relative there; everywhere else (localhost, previews) they keep the
 * /tech prefix.
 */
export function techBase() {
  return siteForHost(headers().get("host")) === "tech" ? "" : "/tech";
}

export function techHref(path: string) {
  const base = techBase();
  if (path === "/") return base || "/";
  return `${base}${path}`;
}

/** Links from the tech site back to the studio site. */
export function studioHref(path = "/") {
  return siteForHost(headers().get("host")) === "tech" ? `${getStudioUrl()}${path === "/" ? "" : path}` : path;
}

export const TECH_SOLUTIONS = [
  {
    title: "Billing, GST & inventory",
    text: "Quotes, invoices, payments, stock levels and low-stock alerts in one place, with GST-ready invoices.",
    for: "Retail, wholesale, distributors",
  },
  {
    title: "Bookings & appointments",
    text: "Online booking, reminders on WhatsApp, staff calendars and payments for service businesses.",
    for: "Clinics, salons, studios, consultants",
  },
  {
    title: "Client & customer portals",
    text: "A branded login where your customers see orders, invoices, documents and progress.",
    for: "Agencies, B2B suppliers, firms",
  },
  {
    title: "Staff & operations apps",
    text: "Tasks, attendance, field visits, approvals and HR documents for growing teams.",
    for: "Teams of 5 to 200",
  },
  {
    title: "AI assistants",
    text: "A chat assistant trained on your services and FAQs that answers customers and captures leads 24/7.",
    for: "Any business with repeat questions",
  },
  {
    title: "Dashboards & reports",
    text: "Live numbers from your sales, stock and spreadsheets, so decisions don't wait for month-end.",
    for: "Owners and managers",
  },
];

export const SECURITY_SERVICES = [
  {
    title: "Vulnerability assessment & penetration testing (VAPT)",
    text: "We test your website, web app or API the way an attacker would, then give you a clear report ranked by risk with fixes your developers can follow.",
    points: ["OWASP Top 10 coverage", "Authenticated & unauthenticated testing", "Retest after fixes"],
  },
  {
    title: "Security audit & hardening",
    text: "A review of hosting, DNS, email, passwords, admin access and backups — and we fix what we find.",
    points: ["Cloud & server configuration", "SPF / DKIM / DMARC email security", "Admin access and 2FA"],
  },
  {
    title: "Monitoring & incident response",
    text: "Uptime and change monitoring, automated backups and a team to call when something goes wrong.",
    points: ["24/7 uptime alerts", "Daily off-site backups", "Clean-up after an incident"],
  },
  {
    title: "Secure development",
    text: "Every system we build follows secure-by-default practices: least privilege, encrypted secrets and row-level data access.",
    points: ["Code review", "Dependency scanning", "Data protection by design (DPDP Act)"],
  },
];

export const TECH_PROCESS = [
  { step: "01", title: "Discover", text: "A free call to understand the process you want to fix and what success looks like." },
  { step: "02", title: "Scope & price", text: "A clear, fixed-price proposal for a focused first version. No surprises." },
  { step: "03", title: "Build in sprints", text: "Weekly demos you can click through. Feedback goes straight into the next sprint." },
  { step: "04", title: "Launch & support", text: "We deploy, train your team and stay on with a support plan. You own the code." },
];
