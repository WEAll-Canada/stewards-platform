import type { APIRoute } from "astro";
import { currentUser } from "../../lib/auth";
import { upsertFaq } from "../../lib/db";

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
  const question = String(body.question ?? "").trim();
  const answer = String(body.answer ?? "").trim();
  const id = body.id == null ? undefined : Number(body.id);
  if (!question) {
    return Response.json({ error: "Question is required." }, { status: 400 });
  }

  await upsertFaq({
    id: Number.isFinite(id as number) ? (id as number) : undefined,
    question: question.slice(0, 300),
    answer: answer.slice(0, 4000),
    userId: user.id,
  });
  return Response.json({ ok: true });
};
