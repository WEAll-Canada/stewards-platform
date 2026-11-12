import type { APIRoute } from "astro";
import { currentUser, hasRole } from "../../lib/auth";
import { createEvent } from "../../lib/db";

export const POST: APIRoute = async ({ request }) => {
  const user = await currentUser(request);
  if (!user || user.status !== "active") {
    return Response.json({ error: "Sign in required." }, { status: 401 });
  }
  if (!hasRole(user, "admin") && !hasRole(user, "circle_lead") && !hasRole(user, "steward")) {
    return Response.json({ error: "Not allowed." }, { status: 403 });
  }

  let input: unknown;
  try {
    input = await request.json();
  } catch {
    return Response.json({ error: "Request body must be JSON." }, { status: 400 });
  }

  const body = (input ?? {}) as Record<string, unknown>;
  const title = String(body.title ?? "").trim();
  const description = String(body.description ?? "").trim();
  const startsAt = String(body.startsAt ?? "").trim();
  const location = String(body.location ?? "").trim();
  const visibility = String(body.visibility ?? "stewards");
  const circleId = body.circleId == null || body.circleId === "" ? null : Number(body.circleId);

  if (!title || !startsAt) {
    return Response.json({ error: "Title and start time are required." }, { status: 400 });
  }
  if (!["public", "stewards", "circle"].includes(visibility)) {
    return Response.json({ error: "Invalid visibility." }, { status: 400 });
  }
  if (visibility === "circle" && !circleId) {
    return Response.json({ error: "Circle events need a circle." }, { status: 400 });
  }

  const id = await createEvent({
    title: title.slice(0, 200),
    description: description.slice(0, 4000),
    startsAt,
    location: location.slice(0, 200),
    visibility: visibility as "public" | "stewards" | "circle",
    circleId,
    createdBy: user.id,
  });
  return Response.json({ ok: true, id }, { status: 201 });
};
