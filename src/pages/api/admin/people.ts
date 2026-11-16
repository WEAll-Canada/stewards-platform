import type { APIRoute } from "astro";
import { currentUser, hasRole } from "../../../lib/auth";
import { updateAdminPerson, type StewardUser } from "../../../lib/db";

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
  const userId = Number(body.userId);
  if (!Number.isFinite(userId)) {
    return Response.json({ error: "Missing person." }, { status: 400 });
  }

  const patch: {
    status?: StewardUser["status"];
    roles?: string[];
  } = {};

  if (typeof body.status === "string") {
    patch.status = body.status as StewardUser["status"];
  }
  if (Array.isArray(body.roles)) {
    patch.roles = body.roles.filter((r): r is string => typeof r === "string");
  }

  if (!patch.status && !patch.roles) {
    return Response.json({ error: "Nothing to update." }, { status: 400 });
  }

  const result = await updateAdminPerson(userId, patch, user.id);
  if (!result.ok) return Response.json({ error: result.error }, { status: 400 });
  return Response.json({ ok: true });
};
