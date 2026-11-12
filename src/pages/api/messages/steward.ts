import type { APIRoute } from "astro";
import { currentUser } from "../../../lib/auth";
import { addStewardMessage, getOrCreateDmThread, getUserById, userCanMessage } from "../../../lib/db";

export const POST: APIRoute = async ({ request }) => {
  const user = await currentUser(request);
  if (!user || user.status !== "active") {
    return Response.json({ error: "Sign in required." }, { status: 401 });
  }
  if (!(await userCanMessage(user.id))) {
    return Response.json({ error: "Messaging is turned off in your preferences." }, { status: 403 });
  }

  let input: unknown;
  try {
    input = await request.json();
  } catch {
    return Response.json({ error: "Request body must be JSON." }, { status: 400 });
  }

  const body = (input ?? {}) as Record<string, unknown>;
  const text = String(body.body ?? "").trim();
  if (!text) return Response.json({ error: "Message cannot be empty." }, { status: 400 });
  if (text.length > 4000) return Response.json({ error: "Message is too long." }, { status: 400 });

  let threadId = Number(body.threadId);
  const toUserId = Number(body.toUserId);

  if (!Number.isFinite(threadId) || threadId <= 0) {
    if (!Number.isFinite(toUserId)) {
      return Response.json({ error: "Choose someone to message." }, { status: 400 });
    }
    const other = await getUserById(toUserId);
    if (!other || other.status !== "active") {
      return Response.json({ error: "Steward not found." }, { status: 404 });
    }
    if (!(await userCanMessage(toUserId))) {
      return Response.json({ error: "That steward is not accepting messages." }, { status: 403 });
    }
    threadId = await getOrCreateDmThread(user.id, toUserId);
  }

  await addStewardMessage(threadId, user.id, text);
  return Response.json({ ok: true, threadId });
};
