import type { APIRoute } from "astro";
import { currentUser, hasRole } from "../../../lib/auth";
import { reviewApplication } from "../../../lib/db";

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

  const { applicationId, decision } = (input ?? {}) as Record<string, unknown>;
  if (typeof applicationId !== "number" && typeof applicationId !== "string") {
    return Response.json({ error: "Missing application." }, { status: 400 });
  }
  if (decision !== "approved" && decision !== "rejected") {
    return Response.json({ error: "Decision must be approved or rejected." }, { status: 400 });
  }

  const id = Number(applicationId);
  if (!Number.isFinite(id)) return Response.json({ error: "Invalid application." }, { status: 400 });

  const result = await reviewApplication(id, decision, user.id);
  if (!result.ok) return Response.json({ error: result.error }, { status: 400 });
  return Response.json({ ok: true });
};
