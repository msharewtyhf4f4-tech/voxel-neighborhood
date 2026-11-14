// Player name rules and the name → sign-in address mapping.
// Works in the browser and on the server (Web Crypto only).

export const NAME_MIN = 2;
export const NAME_MAX = 20;
export const PASSWORD_MIN = 6;
const EMAIL_DOMAIN = "players.subscribers-city.app";

export type NameCheck =
  | { ok: true; display: string; key: string }
  | { ok: false; reason: "short" | "long" | "chars" };

export function checkName(raw: string): NameCheck {
  const display = raw.normalize("NFKC").trim().replace(/\s+/g, " ");
  if (display.length < NAME_MIN) return { ok: false, reason: "short" };
  if (display.length > NAME_MAX) return { ok: false, reason: "long" };
  if (!/^[\p{L}\p{M}\p{N}_ ]+$/u.test(display)) return { ok: false, reason: "chars" };
  return { ok: true, display, key: display.toLowerCase() };
}

/** Same name (any spacing/case) always maps to the same hidden sign-in address. */
export async function nameToEmail(nameKey: string): Promise<string> {
  const bytes = new TextEncoder().encode(`city:${nameKey}`);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  const hex = Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, "0")).join("");
  return `p${hex.slice(0, 40)}@${EMAIL_DOMAIN}`;
}
