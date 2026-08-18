"use server";

import { headers } from "next/headers";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

const ENQUIRY_TYPES = ["project", "quote", "careers", "general"] as const;

const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .optional()
    .transform((value) => (value ? value : undefined));

const contactSchema = z.object({
  name: z.string().trim().min(2).max(120),
  email: z.string().trim().toLowerCase().email().max(320),
  message: z.string().trim().min(10).max(4000),
  company: optionalText(160),
  phone: optionalText(40),
  service: optionalText(160),
  budget: optionalText(80),
  timeline: optionalText(80),
  enquiry_type: z.enum(ENQUIRY_TYPES).catch("project"),
  // Bots fill hidden fields; humans leave them empty.
  website: z.string().max(0).optional(),
});

export type ContactState = {
  success: boolean;
  message: string;
};

const RATE_LIMIT_WINDOW_MS = 60_000;
const RATE_LIMIT_MAX = 3;
const attempts = new Map<string, { count: number; resetAt: number }>();

function isRateLimited(key: string) {
  const now = Date.now();
  const entry = attempts.get(key);

  if (!entry || now > entry.resetAt) {
    attempts.set(key, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
    return false;
  }

  entry.count += 1;
  return entry.count > RATE_LIMIT_MAX;
}

export async function submitContact(
  _prevState: ContactState,
  formData: FormData
): Promise<ContactState> {
  const forwardedFor = headers().get("x-forwarded-for") ?? "unknown";
  const clientKey = forwardedFor.split(",")[0].trim();

  if (isRateLimited(clientKey)) {
    return { success: false, message: "Too many attempts. Please try again in a minute." };
  }

  const parsed = contactSchema.safeParse({
    name: formData.get("name"),
    email: formData.get("email"),
    message: formData.get("message"),
    company: formData.get("company") ?? undefined,
    phone: formData.get("phone") ?? undefined,
    service: formData.get("service") ?? undefined,
    budget: formData.get("budget") ?? undefined,
    timeline: formData.get("timeline") ?? undefined,
    enquiry_type: formData.get("enquiry_type") ?? "project",
    website: formData.get("website") ?? undefined,
  });

  if (!parsed.success) {
    return { success: false, message: "Please check the form fields and try again." };
  }

  const supabase = createClient();
  const { error } = await supabase.from("contacts").insert({
    name: parsed.data.name,
    email: parsed.data.email,
    message: parsed.data.message,
    company: parsed.data.company ?? null,
    phone: parsed.data.phone ?? null,
    service: parsed.data.service ?? null,
    budget: parsed.data.budget ?? null,
    timeline: parsed.data.timeline ?? null,
    enquiry_type: parsed.data.enquiry_type,
    status: "new",
  });

  if (error) {
    console.error("[contact] insert failed:", error.code, error.message);
    return {
      success: false,
      message: "We couldn't save your message right now. Please try again shortly.",
    };
  }

  const notificationTo = process.env.CONTACT_NOTIFICATION_TO;

  if (process.env.RESEND_API_KEY && notificationTo) {
    try {
      await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: "LYNVO <notifications@lynvo.studio>",
          to: notificationTo,
          reply_to: parsed.data.email,
          subject: `New ${parsed.data.enquiry_type} enquiry from ${parsed.data.name}`,
          text: [
            `Type: ${parsed.data.enquiry_type}`,
            parsed.data.company && `Company: ${parsed.data.company}`,
            parsed.data.phone && `Phone: ${parsed.data.phone}`,
            parsed.data.service && `Service: ${parsed.data.service}`,
            parsed.data.budget && `Budget: ${parsed.data.budget}`,
            parsed.data.timeline && `Timeline: ${parsed.data.timeline}`,
            "",
            parsed.data.message,
          ]
            .filter(Boolean)
            .join("\n"),
        }),
      });
    } catch {
      // Delivery failure must not lose an already-persisted submission.
    }
  }

  return { success: true, message: "Thanks — we'll be in touch soon." };
}
