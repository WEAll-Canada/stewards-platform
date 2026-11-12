import type { APIRoute } from "astro";
import { currentUser, hasRole } from "../../../lib/auth";
import { getEmailReplyTarget, saveOutboundEmail } from "../../../lib/db";
import { sendEmail } from "../../../lib/email";

export const POST: APIRoute = async ({ request }) => {
  const user = await currentUser(request);
  if (!user || (!hasRole(user, "admin") && !hasRole(user, "circle_lead"))) {
    return Response.json({ error: "Email access required." }, { status: 403 });
  }

  let input: unknown;
  try {
    input = await request.json();
  } catch {
    return Response.json({ error: "Request body must be JSON." }, { status: 400 });
  }

  const body = (input ?? {}) as Record<string, unknown>;
  const threadId = Number(body.threadId);
  const text = String(body.body ?? "").trim();
  if (!Number.isFinite(threadId) || !text) {
    return Response.json({ error: "Thread and message body are required." }, { status: 400 });
  }

  const target = await getEmailReplyTarget(threadId);
  if (!target) return Response.json({ error: "No inbound address to reply to." }, { status: 400 });

  const sent = await sendEmail({
    to: target.to,
    subject: target.subject.startsWith("Re:") ? target.subject : `Re: ${target.subject}`,
    text,
  });
  if (!sent.ok) return Response.json({ error: sent.error }, { status: 502 });

  await saveOutboundEmail({
    threadId,
    adminUserId: user.id,
    to: target.to,
    body: text,
    providerId: sent.providerId,
  });

  return Response.json({ ok: true, mode: sent.mode });
};
