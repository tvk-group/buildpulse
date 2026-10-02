import { getServerEnv } from "@/config/env";
import { CONTACT_EMAILS } from "@/lib/contact-emails";
import { buildPulseEmailInvitation } from "@/lib/buildpulse/email-invitation";

export type BrevoSendResult =
  | { sent: true; messageId?: string }
  | { sent: false; reason: "not_configured" | "send_failed"; detail?: string };

function getBrevoApiKey(): string | null {
  const key = getServerEnv().BREVO_API_KEY?.trim();
  return key || null;
}

export function getBrevoFromEmail(): string {
  return getServerEnv().BREVO_FROM_EMAIL?.trim() || CONTACT_EMAILS.hq;
}

export function getBrevoFromName(): string {
  return getServerEnv().BREVO_FROM_NAME?.trim() || "ENTELΞKRON";
}

export function isBrevoConfigured(): boolean {
  return Boolean(getBrevoApiKey());
}

/** Send a transactional email via Brevo SMTP API (v3). */
export async function sendBrevoEmail(params: {
  to: string | string[];
  subject: string;
  html: string;
  replyTo?: string;
  tags?: string[];
  buildPulseInvite?: boolean;
}): Promise<BrevoSendResult> {
  const apiKey = getBrevoApiKey();
  if (!apiKey) {
    console.log("[email] BREVO_API_KEY not set — skip send", params.to);
    return { sent: false, reason: "not_configured" };
  }

  const recipients = (Array.isArray(params.to) ? params.to : [params.to]).map((email) => ({
    email: email.trim(),
  }));

  const replyToEmail = params.replyTo?.trim() || getServerEnv().BREVO_REPLY_TO_EMAIL?.trim();

  try {
    const res = await fetch("https://api.brevo.com/v3/smtp/email", {
      method: "POST",
      headers: {
        "api-key": apiKey,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({
        sender: {
          name: getBrevoFromName(),
          email: getBrevoFromEmail(),
        },
        to: recipients,
        subject: params.subject,
        htmlContent: params.buildPulseInvite === true ? (params.html.includes("OPTIONAL · TVK BUILDPULSE") ? params.html : params.html.replace(/<\/body>/i, `${buildPulseEmailInvitation()}</body>`)) : params.html,
        ...(params.tags?.length ? { tags: params.tags } : {}),
        ...(replyToEmail ? { replyTo: { email: replyToEmail } } : {}),
      }),
    });

    if (!res.ok) {
      const detail = await res.text();
      console.error("[email] Brevo error", res.status, detail);
      return { sent: false, reason: "send_failed", detail };
    }

    const data = (await res.json().catch(() => ({}))) as { messageId?: string };
    return { sent: true, messageId: data.messageId };
  } catch (err) {
    console.error("[email] Brevo send failed", err);
    return { sent: false, reason: "send_failed" };
  }
}
