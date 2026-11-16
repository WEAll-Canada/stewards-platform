import type { APIRoute } from "astro";
import { currentUser, hasRole } from "../../../lib/auth";
import { setSiteSettings } from "../../../lib/db";

const ALLOWED = new Set([
  "charter_title",
  "charter_body",
  "charter_version",
  "about_prompt",
  "about_hint",
  "tor_fields",
]);

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
  const updates: Record<string, string> = {};
  for (const [key, value] of Object.entries(body)) {
    if (!ALLOWED.has(key)) continue;
    if (typeof value !== "string") continue;
    updates[key] = value.trim();
  }

  if (Object.keys(updates).length === 0) {
    return Response.json({ error: "Nothing to update." }, { status: 400 });
  }
  if (updates.charter_title !== undefined && !updates.charter_title) {
    return Response.json({ error: "Agreement title is required." }, { status: 400 });
  }
  if (updates.charter_body !== undefined && !updates.charter_body) {
    return Response.json({ error: "Agreement body is required." }, { status: 400 });
  }

  await setSiteSettings(updates, user.id);
  return Response.json({ ok: true });
};
