import { getServerEnv, getPublicEnv } from "@/config/env";
import { createHmac, timingSafeEqual } from "crypto";

const TOKEN_VERSION = "v1";
const TOKEN_TTL_DAYS = 365 * 3;

function getUnsubscribeSecret(): string | null {
  const secret = getServerEnv().MARKETING_UNSUBSCRIBE_SECRET?.trim();
  return secret && secret.length >= 16 ? secret : null;
}

export function normalizeMarketingEmail(email: string): string {
  return email.trim().toLowerCase();
}

function base64UrlEncode(value: string): string {
  return Buffer.from(value, "utf8")
    .toString("base64url");
}

function base64UrlDecode(value: string): string {
  return Buffer.from(value, "base64url").toString("utf8");
}

function signPayload(payload: string, secret: string): string {
  return createHmac("sha256", secret).update(payload).digest("base64url");
}

function getSiteOrigin(): string {
  return (
    getPublicEnv().NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") ||
    getPublicEnv().NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") ||
    "https://www.entelekron.io"
  );
}

export function buildMarketingUnsubscribeUrl(
  email: string,
  locale = "en"
): string | null {
  const secret = getUnsubscribeSecret();
  if (!secret) return null;

  const normalized = normalizeMarketingEmail(email);
  const expiresAt = Math.floor(Date.now() / 1000) + TOKEN_TTL_DAYS * 24 * 60 * 60;
  const payload = `${TOKEN_VERSION}:${normalized}:${expiresAt}`;
  const signature = signPayload(payload, secret);
  const token = base64UrlEncode(`${payload}:${signature}`);

  return `${getSiteOrigin()}/presale/${locale}/unsubscribe?token=${encodeURIComponent(token)}`;
}

export function verifyMarketingUnsubscribeToken(
  token: string
): { email: string } | { error: string } {
  const secret = getUnsubscribeSecret();
  if (!secret) {
    return { error: "Unsubscribe is not configured." };
  }

  let decoded: string;
  try {
    decoded = base64UrlDecode(token);
  } catch {
    return { error: "Invalid unsubscribe link." };
  }

  const parts = decoded.split(":");
  if (parts.length !== 4) {
    return { error: "Invalid unsubscribe link." };
  }

  const [version, email, expiresAtRaw, signature] = parts;
  if (version !== TOKEN_VERSION || !email || !expiresAtRaw || !signature) {
    return { error: "Invalid unsubscribe link." };
  }

  const payload = `${version}:${email}:${expiresAtRaw}`;
  const expected = signPayload(payload, secret);

  const sigBuf = Buffer.from(signature);
  const expectedBuf = Buffer.from(expected);
  if (
    sigBuf.length !== expectedBuf.length ||
    !timingSafeEqual(sigBuf, expectedBuf)
  ) {
    return { error: "Invalid unsubscribe link." };
  }

  const expiresAt = Number(expiresAtRaw);
  if (!Number.isFinite(expiresAt) || expiresAt < Math.floor(Date.now() / 1000)) {
    return { error: "This unsubscribe link has expired." };
  }

  return { email: normalizeMarketingEmail(email) };
}
