import type { APIRoute } from "astro";
import { currentUser, hasRole } from "../../../lib/auth";
import { nominateCircleLink, reviewCircleLink } from "../../../lib/db";

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
  const action = String(body.action ?? "");
  const actorIsAdmin = hasRole(user, "admin");

  if (action === "nominate") {
    const targetUserId = Number(body.userId ?? user.id);
    const circleAId = Number(body.circleAId);
    const circleBId = Number(body.circleBId);
    if (!Number.isFinite(targetUserId) || !Number.isFinite(circleAId) || !Number.isFinite(circleBId)) {
      return Response.json({ error: "Missing person or circles." }, { status: 400 });
    }
    const result = await nominateCircleLink({
      actorId: user.id,
      actorIsAdmin,
      userId: targetUserId,
      circleAId,
      circleBId,
    });
    if (!result.ok) return Response.json({ error: result.error }, { status: 400 });
    return Response.json({ ok: true, status: result.status });
  }

  if (action === "review") {
    const linkId = Number(body.linkId);
    const decision = String(body.decision ?? "");
    if (!Number.isFinite(linkId)) {
      return Response.json({ error: "Missing link." }, { status: 400 });
    }
    if (decision !== "approved" && decision !== "rejected") {
      return Response.json({ error: "Decision must be approved or rejected." }, { status: 400 });
    }
    const result = await reviewCircleLink({
      linkId,
      actorId: user.id,
      actorIsAdmin,
      decision,
    });
    if (!result.ok) return Response.json({ error: result.error }, { status: 400 });
    return Response.json({ ok: true });
  }

  return Response.json({ error: "Unknown action." }, { status: 400 });
};
