import type { APIRoute } from "astro";
import { currentUser } from "../../../lib/auth";
import { requestCircleJoin } from "../../../lib/db";

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

  const circleId = Number((input as Record<string, unknown>).circleId);
  if (!Number.isFinite(circleId)) return Response.json({ error: "Missing circle." }, { status: 400 });

  const result = await requestCircleJoin(circleId, user.id);
  if (!result.ok) return Response.json({ error: result.error }, { status: 400 });
  return Response.json({ ok: true });
};
