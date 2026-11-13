import type { APIRoute } from "astro";
import { currentUser } from "../../lib/auth";
import { normalizeConnectionReasons } from "../../lib/connections";
import { upsertConnection } from "../../lib/db";

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
  const toUserId = Number(body.toUserId);
  const strength = Number(body.strength);
  const reason = normalizeConnectionReasons(body.reasons ?? body.reason);
  if (!Number.isFinite(toUserId)) return Response.json({ error: "Missing steward." }, { status: 400 });
  if (!reason) {
    return Response.json({ error: "Pick at least one reason for the connection." }, { status: 400 });
  }

  const result = await upsertConnection({
    fromUserId: user.id,
    toUserId,
    strength,
    reason: reason.slice(0, 80),
  });
  if (!result.ok) return Response.json({ error: result.error }, { status: 400 });
  return Response.json({ ok: true });
};
