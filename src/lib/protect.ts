// Spam and abuse protection for public forms. Every API route that accepts
// submissions from visitors calls `checkSubmission` before touching the database.
import { env } from "cloudflare:workers";

// Cloudflare's documented always-pass test secret, used only by local previews and tests.
// Accepting it without a network call keeps the local preview working offline.
const TEST_SECRET = "1x0000000000000000000000000000000AA";

export const turnstileSiteKey = (): string => String(env.TURNSTILE_SITE_KEY ?? "");

type Check = { ok: true } | { ok: false; status: number; error: string };

export async function checkSubmission(clientAddress: string, turnstileToken: unknown): Promise<Check> {
  // 1. Rate limit per visitor, so one visitor can't flood the database.
  const { success } = await env.FORM_LIMITER.limit({ key: clientAddress || "unknown" });
  if (!success) {
    return { ok: false, status: 429, error: "Too many submissions. Please wait a minute and try again." };
  }

  // 2. Turnstile: proves a real browser filled in the form. Fails closed if not set up.
  const secret = String(env.TURNSTILE_SECRET_KEY ?? "");
  if (!secret || !turnstileSiteKey()) {
    return { ok: false, status: 503, error: "This form isn't switched on yet." };
  }
  if (typeof turnstileToken !== "string" || !turnstileToken) {
    return { ok: false, status: 400, error: "Please complete the spam check and try again." };
  }
  if (secret === TEST_SECRET) return { ok: true };

  const res = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
    method: "POST",
    body: new URLSearchParams({ secret, response: turnstileToken, remoteip: clientAddress }),
  });
  const result = (await res.json()) as { success: boolean };
  if (!result.success) {
    return { ok: false, status: 400, error: "The spam check didn't pass. Please try again." };
  }
  return { ok: true };
}
