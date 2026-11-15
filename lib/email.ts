import "server-only";

/** Sends a plain-text email through Resend. Returns false when not configured or on failure. */
export async function sendEmail({ to, subject, text, replyTo }: { to: string; subject: string; text: string; replyTo?: string }) {
  const key = process.env.RESEND_API_KEY;
  if (!key) return false;
  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from: process.env.EMAIL_FROM || "LYNVO <notifications@lynvo.studio>",
        to,
        subject,
        text,
        ...(replyTo ? { reply_to: replyTo } : {}),
      }),
    });
    return response.ok;
  } catch {
    return false;
  }
}
