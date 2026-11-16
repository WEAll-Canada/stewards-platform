import type { APIRoute } from "astro";
import { currentUser, hasRole } from "../../../lib/auth";
import { setEmailThreadStatus } from "../../../lib/db";

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
  const status = String(body.status ?? "");
  if (!Number.isFinite(threadId) || (status !== "open" && status !== "closed")) {
    return Response.json({ error: "Thread id and status (open|closed) are required." }, { status: 400 });
  }

  const ok = await setEmailThreadStatus(threadId, status);
  if (!ok) return Response.json({ error: "Thread not found." }, { status: 404 });
  return Response.json({ ok: true, status });
};
