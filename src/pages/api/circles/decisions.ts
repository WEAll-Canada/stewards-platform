import type { APIRoute } from "astro";
import { currentUser, hasRole } from "../../../lib/auth";
import { addCircleDecision, userIsCircleMember } from "../../../lib/db";

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
  const circleId = Number(body.circleId);
  const title = String(body.title ?? "").trim();
  const detail = String(body.detail ?? "").trim();
  const decidedAtRaw = String(body.decidedAt ?? "").trim();

  if (!Number.isFinite(circleId)) return Response.json({ error: "Missing circle." }, { status: 400 });
  if (!title) return Response.json({ error: "Title is required." }, { status: 400 });

  const member = await userIsCircleMember(circleId, user.id);
  if (!member && !hasRole(user, "admin")) {
    return Response.json({ error: "Join this circle before logging decisions." }, { status: 403 });
  }

  const decidedAt = decidedAtRaw
    ? new Date(decidedAtRaw).toISOString().replace(/\.\d{3}Z$/, "Z")
    : new Date().toISOString().replace(/\.\d{3}Z$/, "Z");
  if (Number.isNaN(Date.parse(decidedAt))) {
    return Response.json({ error: "Invalid decision date." }, { status: 400 });
  }

  const id = await addCircleDecision({
    circleId,
    title: title.slice(0, 200),
    detail: detail.slice(0, 4000),
    decidedAt,
    createdBy: user.id,
  });
  return Response.json({ ok: true, id });
};
