/**
 * Canonical public contact addresses (Proton Mail · entelekron.io).
 * Display names are set in Proton — not in code.
 */
export const CONTACT_EMAILS = {
  hq: "hq@entelekron.io",
  contact: "contact@entelekron.io",
  invest: "invest@entelekron.io",
  partner: "partner@entelekron.io",
  support: "support@entelekron.io",
  legal: "legal@tvk.group",
} as const;

export type ContactEmailKey = keyof typeof CONTACT_EMAILS;

export function mailto(email: string, subject?: string) {
  if (!subject) return `mailto:${email}`;
  return `mailto:${email}?subject=${encodeURIComponent(subject)}`;
}
