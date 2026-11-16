import type { APIRoute } from "astro";
import { currentUser, hasRole } from "../../../lib/auth";
import { getCircleBySlug, logActivity, updateCircleDetails } from "../../../lib/db";

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
  if (!slug) return Response.json({ error: "Missing circle." }, { status: 400 });

  const circle = await getCircleBySlug(slug, user.id);
  if (!circle) return Response.json({ error: "Circle not found." }, { status: 404 });

  const canEdit = circle.membership === "lead" || hasRole(user, "admin");
  if (!canEdit) {
    return Response.json({ error: "Only circle leads or admins can edit this page." }, { status: 403 });
  }

  const result = await updateCircleDetails(circle.id, {
    name: String(body.name ?? ""),
    description: String(body.description ?? ""),
    welcomeNote: String(body.welcomeNote ?? ""),
    resourcesBlurb: String(body.resourcesBlurb ?? ""),
    status: String(body.status ?? circle.status) as "active" | "dormant",
    colorToken: String(body.colorToken ?? circle.color_token),
  });

  if (!result.ok) return Response.json({ error: result.error }, { status: 400 });
  await logActivity({
    actorId: user.id,
    action: "circle.updated",
    subjectType: "circle",
    subjectId: String(circle.id),
    detail: `Updated circle page “${result.name}”.`,
  });
  return Response.json({ ok: true, slug: circle.slug });
};
