import type { APIRoute } from "astro";
import { currentUser, hasRole } from "../../../lib/auth";
import { addSurveyOption, setSurveyOptionActive, type SurveyOptionKind } from "../../../lib/db";

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
  const action = String(body.action ?? "");

  if (action === "add") {
    const kind = String(body.kind ?? "") as SurveyOptionKind;
    if (kind !== "sector" && kind !== "interest") {
      return Response.json({ error: "Kind must be sector or interest." }, { status: 400 });
    }
    const result = await addSurveyOption(kind, String(body.label ?? ""), user.id);
    if (!result.ok) return Response.json({ error: result.error }, { status: 400 });
    return Response.json({ ok: true, id: result.id });
  }

  if (action === "set_active") {
    const id = Number(body.id);
    if (!Number.isFinite(id)) return Response.json({ error: "Missing option." }, { status: 400 });
    const result = await setSurveyOptionActive(id, Boolean(body.active), user.id);
    if (!result.ok) return Response.json({ error: result.error }, { status: 400 });
    return Response.json({ ok: true });
  }

  return Response.json({ error: "Unknown action." }, { status: 400 });
};
