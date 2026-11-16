import type { APIRoute } from "astro";
import { currentUser, hasRole } from "../../../lib/auth";
import { addCircleResource, userIsCircleMember } from "../../../lib/db";

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
  const url = String(body.url ?? "").trim();
  const note = String(body.note ?? "").trim();

  if (!Number.isFinite(circleId)) return Response.json({ error: "Missing circle." }, { status: 400 });
  if (!title) return Response.json({ error: "Title is required." }, { status: 400 });
  if (url && !/^https?:\/\//i.test(url)) {
    return Response.json({ error: "Link must start with http:// or https://." }, { status: 400 });
  }

  const member = await userIsCircleMember(circleId, user.id);
  if (!member && !hasRole(user, "admin")) {
    return Response.json({ error: "Join this circle before adding resources." }, { status: 403 });
  }

  const id = await addCircleResource({
    circleId,
    title: title.slice(0, 200),
    url: url.slice(0, 500),
    note: note.slice(0, 2000),
    createdBy: user.id,
  });
  return Response.json({ ok: true, id });
};
