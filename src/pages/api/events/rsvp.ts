import type { APIRoute } from "astro";
import { currentUser } from "../../../lib/auth";
import { upsertRsvp } from "../../../lib/db";

export const POST: APIRoute = async ({ request }) => {
  const user = await currentUser(request);
  if (!user || user.status !== "active") {
    return Response.json({ error: "Sign in required." }, { status: 401 });
  }

  let input: unknown;
  try {
    input = await request.json();
  } catch {
    return Response.json({ error: "Request body must be JSON." }, { status: 400 });
  }

  const body = (input ?? {}) as Record<string, unknown>;
  const eventId = Number(body.eventId);
  const status = String(body.status ?? "going");
  if (!Number.isFinite(eventId)) return Response.json({ error: "Missing event." }, { status: 400 });
  if (!["going", "interested", "cancelled"].includes(status)) {
    return Response.json({ error: "Invalid RSVP." }, { status: 400 });
  }

  await upsertRsvp(eventId, user.id, status as "going" | "interested" | "cancelled");
  return Response.json({ ok: true });
};
