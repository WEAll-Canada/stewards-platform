import type { APIRoute } from "astro";
import { currentUser } from "../../lib/auth";
import { updateProfileBundle } from "../../lib/db";

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
  const display_name = String(body.display_name ?? "").trim();
  const bio = String(body.bio ?? "").trim();
  const location = String(body.location ?? "").trim();
  const partner_org = String(body.partner_org ?? "").trim();
  const visibility = String(body.visibility ?? "stewards");
  if (!display_name) return Response.json({ error: "Display name is required." }, { status: 400 });
  if (!["public", "stewards", "private"].includes(visibility)) {
    return Response.json({ error: "Invalid visibility." }, { status: 400 });
  }

  await updateProfileBundle(user.id, {
    display_name: display_name.slice(0, 100),
    bio: bio.slice(0, 2000),
    location: location.slice(0, 120),
    partner_org: partner_org.slice(0, 120),
    visibility: visibility as "public" | "stewards" | "private",
    allow_directory: body.allow_directory ? 1 : 0,
    allow_messages: body.allow_messages ? 1 : 0,
    email_updates: body.email_updates ? 1 : 0,
  });

  return Response.json({ ok: true });
};
