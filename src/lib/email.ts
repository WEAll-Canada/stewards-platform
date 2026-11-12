// Outbound email helper. Uses Resend when RESEND_API_KEY is set; otherwise simulates locally.
import { env } from "cloudflare:workers";

export type SendResult =
  | { ok: true; mode: "sent"; providerId: string }
  | { ok: true; mode: "simulated"; providerId: null }
  | { ok: false; error: string };

export function emailConfigured(): boolean {
  return Boolean(String(env.RESEND_API_KEY ?? ""));
}

export async function sendEmail(input: {
  to: string | string[];
  subject: string;
  text: string;
  from?: string;
}): Promise<SendResult> {
  const apiKey = String(env.RESEND_API_KEY ?? "");
  const from = input.from || String(env.EMAIL_FROM ?? "WeAll Canada <hello@weallcanada.com>");
  const to = Array.isArray(input.to) ? input.to : [input.to];

  if (!apiKey) {
    return { ok: true, mode: "simulated", providerId: null };
  }

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from,
      to,
      subject: input.subject,
      text: input.text,
    }),
  });

  if (!res.ok) {
    const detail = await res.text();
    return { ok: false, error: `Email provider error: ${detail.slice(0, 200)}` };
  }

  const data = (await res.json()) as { id?: string };
  return { ok: true, mode: "sent", providerId: data.id ?? "unknown" };
}
