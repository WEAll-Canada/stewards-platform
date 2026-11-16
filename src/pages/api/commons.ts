import type { APIRoute } from "astro";
import { currentUser } from "../../lib/auth";
import { addKnowledgeItem } from "../../lib/db";

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
  const title = String(body.title ?? "").trim();
  const summary = String(body.summary ?? "").trim();
  const url = String(body.url ?? "").trim();
  const bodyText = String(body.bodyText ?? "").trim();
  const tags = String(body.tags ?? "")
    .split(/[,|]/)
    .map((t) => t.trim())
    .filter(Boolean)
    .join("|");

  if (!title) return Response.json({ error: "Title is required." }, { status: 400 });
  if (!url && !bodyText && !summary) {
    return Response.json({ error: "Add a link, summary, or notes." }, { status: 400 });
  }
  if (url && !/^https?:\/\//i.test(url)) {
    return Response.json({ error: "Link must start with http:// or https://." }, { status: 400 });
  }

  const id = await addKnowledgeItem({
    title: title.slice(0, 200),
    summary: summary.slice(0, 500),
    url: url.slice(0, 500),
    bodyText: bodyText.slice(0, 8000),
    tags: tags.slice(0, 200),
    createdBy: user.id,
  });
  return Response.json({ ok: true, id });
};
