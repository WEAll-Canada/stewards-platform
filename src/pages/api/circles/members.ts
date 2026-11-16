import type { APIRoute } from "astro";
import { currentUser, hasRole } from "../../../lib/auth";
import {
  getCircleBySlug,
  removeCircleMember,
  setCircleMemberRole,
} from "../../../lib/db";

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
  const slug = String(body.slug ?? "").trim();
  const targetUserId = Number(body.userId);
  const action = String(body.action ?? "");

  if (!slug) return Response.json({ error: "Missing circle." }, { status: 400 });
  if (!Number.isFinite(targetUserId)) {
    return Response.json({ error: "Missing person." }, { status: 400 });
  }

  const circle = await getCircleBySlug(slug, user.id);
  if (!circle) return Response.json({ error: "Circle not found." }, { status: 404 });

  const canManage = circle.membership === "lead" || hasRole(user, "admin");
  if (!canManage) {
    return Response.json({ error: "Only circle leads or admins can manage members." }, { status: 403 });
  }

  if (action === "set_role") {
    const role = String(body.role ?? "");
    if (role !== "member" && role !== "lead") {
      return Response.json({ error: "Role must be member or lead." }, { status: 400 });
    }
    const result = await setCircleMemberRole(circle.id, targetUserId, role, user.id);
    if (!result.ok) return Response.json({ error: result.error }, { status: 400 });
    return Response.json({ ok: true });
  }

  if (action === "remove") {
    const result = await removeCircleMember(circle.id, targetUserId);
    if (!result.ok) return Response.json({ error: result.error }, { status: 400 });
    return Response.json({ ok: true });
  }

  return Response.json({ error: "Unknown action." }, { status: 400 });
};
