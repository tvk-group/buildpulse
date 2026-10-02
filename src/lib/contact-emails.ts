/**
 * Canonical fallback contact addresses for the standalone BuildPulse service.
 * Display names are set in Proton — not in code.
 */
export const CONTACT_EMAILS = {
  hq: "hq@tvk.group",
  contact: "hq@tvk.group",
  invest: "hq@tvk.group",
  partner: "hq@tvk.group",
  support: "hq@tvk.group",
  legal: "legal@tvk.group",
} as const;

export type ContactEmailKey = keyof typeof CONTACT_EMAILS;

export function mailto(email: string, subject?: string) {
  if (!subject) return `mailto:${email}`;
  return `mailto:${email}?subject=${encodeURIComponent(subject)}`;
}
