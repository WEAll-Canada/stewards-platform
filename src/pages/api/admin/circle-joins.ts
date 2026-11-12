import type { APIRoute } from "astro";
import { currentUser, hasRole } from "../../../lib/auth";
import { reviewCircleJoin } from "../../../lib/db";

export const POST: APIRoute = async ({ request }) => {
  const user = await currentUser(request);
  if (!user || (!hasRole(user, "admin") && !hasRole(user, "circle_lead"))) {
    return Response.json({ error: "Admin or circle lead access required." }, { status: 403 });
  }

  let input: unknown;
  try {
    input = await request.json();
  } catch {
    return Response.json({ error: "Request body must be JSON." }, { status: 400 });
  }

  const body = (input ?? {}) as Record<string, unknown>;
  const requestId = Number(body.requestId);
  const decision = body.decision;
  if (!Number.isFinite(requestId)) return Response.json({ error: "Missing request." }, { status: 400 });
  if (decision !== "approved" && decision !== "rejected") {
    return Response.json({ error: "Invalid decision." }, { status: 400 });
  }

  const result = await reviewCircleJoin(requestId, decision);
  if (!result.ok) return Response.json({ error: result.error }, { status: 400 });
  return Response.json({ ok: true });
};
