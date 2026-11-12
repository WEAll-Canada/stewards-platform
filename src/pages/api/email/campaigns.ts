import type { APIRoute } from "astro";
import { currentUser, hasRole } from "../../../lib/auth";
import { createCampaign, listActiveStewardEmails } from "../../../lib/db";
import { emailConfigured, sendEmail } from "../../../lib/email";

export const POST: APIRoute = async ({ request }) => {
  const user = await currentUser(request);
  if (!user || !hasRole(user, "admin")) {
    return Response.json({ error: "Admin access required." }, { status: 403 });
  }

  let input: unknown;
  try {
    input = await request.json();
  } catch {
    return Response.json({ error: "Request body must be JSON." }, { status: 400 });
  }

  const body = (input ?? {}) as Record<string, unknown>;
  const name = String(body.name ?? "").trim();
  const subject = String(body.subject ?? "").trim();
  const text = String(body.body ?? "").trim();
  const confirmCount = Number(body.confirmCount);

  if (!name || !subject || !text) {
    return Response.json({ error: "Name, subject, and body are required." }, { status: 400 });
  }

  const recipients = await listActiveStewardEmails();
  if (confirmCount !== recipients.length) {
    return Response.json(
      {
        error: `Confirm the recipient count. About to email ${recipients.length} people.`,
        recipientCount: recipients.length,
      },
      { status: 400 },
    );
  }

  const mode = emailConfigured() ? "sent" : "simulated";
  if (mode === "sent") {
    for (const r of recipients) {
      const result = await sendEmail({ to: r.email, subject, text });
      if (!result.ok) return Response.json({ error: result.error }, { status: 502 });
    }
  }

  const id = await createCampaign({
    name,
    subject,
    body: text,
    createdBy: user.id,
    recipients,
    status: mode,
  });

  return Response.json({ ok: true, id, mode, recipientCount: recipients.length });
};
