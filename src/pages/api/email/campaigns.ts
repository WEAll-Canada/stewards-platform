import type { APIRoute } from "astro";
import { currentUser, hasRole } from "../../../lib/auth";
import { createCampaign, listSegmentRecipients, updateCampaignDraft } from "../../../lib/db";
import { emailConfigured, sendEmail } from "../../../lib/email";
import {
  applyMergeVars,
  htmlToText,
  parseSegment,
  serializeSegment,
  wrapEmailHtml,
} from "../../../lib/email-segments";

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
  const action = String(body.action ?? "send");
  const name = String(body.name ?? "").trim();
  const subject = String(body.subject ?? "").trim();
  const bodyHtml = String(body.bodyHtml ?? body.body ?? "").trim();
  const bodyText = htmlToText(bodyHtml) || String(body.body ?? "").trim();
  const campaignType = String(body.campaignType ?? "marketing");
  const headerVariant = String(body.headerVariant ?? "weall_banner");
  const segment = parseSegment(body.segment ?? body.segmentKind);
  if (body.segmentKind && body.segmentValue != null) {
    segment.value = String(body.segmentValue);
  }
  const segmentKey = serializeSegment(segment);
  const confirmCount = Number(body.confirmCount);
  const draftId = Number(body.draftId);

  if (!name || !subject || !bodyHtml) {
    return Response.json({ error: "Name, subject, and body are required." }, { status: 400 });
  }

  const recipients = await listSegmentRecipients(segment);

  if (action === "count") {
    return Response.json({ ok: true, recipientCount: recipients.length, segment: segmentKey });
  }

  if (action === "draft") {
    if (Number.isFinite(draftId) && draftId > 0) {
      const updated = await updateCampaignDraft(draftId, {
        name,
        subject,
        body: bodyText,
        bodyHtml,
        segment: segmentKey,
        campaignType,
        headerVariant,
      });
      if (!updated) return Response.json({ error: "Draft not found." }, { status: 404 });
      return Response.json({ ok: true, id: draftId, mode: "draft" });
    }
    const id = await createCampaign({
      name,
      subject,
      body: bodyText,
      bodyHtml,
      segment: segmentKey,
      campaignType,
      headerVariant,
      createdBy: user.id,
      recipients: [],
      status: "draft",
    });
    return Response.json({ ok: true, id, mode: "draft" });
  }

  if (action === "test") {
    const personalized = applyMergeVars(bodyHtml, {
      display_name: user.display_name || "Steward",
      email: user.email,
    });
    const html = wrapEmailHtml(personalized, headerVariant);
    const sent = await sendEmail({
      to: user.email,
      subject: `[TEST] ${subject}`,
      text: htmlToText(html),
    });
    if (!sent.ok) return Response.json({ error: sent.error }, { status: 502 });
    return Response.json({ ok: true, mode: sent.mode, recipientCount: 1 });
  }

  if (action === "preview") {
    const sample = recipients[0] ?? {
      display_name: user.display_name || "Steward",
      email: user.email,
    };
    const personalized = applyMergeVars(bodyHtml, {
      display_name: sample.display_name,
      email: sample.email,
    });
    return Response.json({
      ok: true,
      html: wrapEmailHtml(personalized, headerVariant),
      recipientCount: recipients.length,
      sampleName: sample.display_name,
    });
  }

  // Default: send
  if (confirmCount !== recipients.length) {
    return Response.json(
      {
        error: `Confirm the recipient count. About to email ${recipients.length} people.`,
        recipientCount: recipients.length,
      },
      { status: 400 },
    );
  }
  if (recipients.length === 0) {
    return Response.json({ error: "No recipients match this audience." }, { status: 400 });
  }

  const mode = emailConfigured() ? "sent" : "simulated";
  if (mode === "sent") {
    for (const r of recipients) {
      const personalized = applyMergeVars(bodyHtml, {
        display_name: r.display_name,
        email: r.email,
      });
      const result = await sendEmail({
        to: r.email,
        subject: applyMergeVars(subject, { display_name: r.display_name, email: r.email }),
        text: htmlToText(wrapEmailHtml(personalized, headerVariant)),
      });
      if (!result.ok) return Response.json({ error: result.error }, { status: 502 });
    }
  }

  // If editing a draft, keep history by creating a new sent row (draft remains for reuse).
  const id = await createCampaign({
    name,
    subject,
    body: bodyText,
    bodyHtml,
    segment: segmentKey,
    campaignType,
    headerVariant,
    createdBy: user.id,
    recipients,
    status: mode,
    stats: {
      sent: recipients.length,
      delivered: mode === "simulated" ? recipients.length : 0,
      opened: 0,
      clicked: 0,
      bounced: 0,
    },
  });

  return Response.json({ ok: true, id, mode, recipientCount: recipients.length });
};
