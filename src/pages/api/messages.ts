import type { APIRoute } from "astro";
import { addMessage, listMessages } from "../../lib/db";
import { checkSubmission } from "../../lib/protect";

const MAX_NAME = 100;
const MAX_BODY = 1000;

export const GET: APIRoute = async () => {
  return Response.json({ messages: await listMessages() });
};

export const POST: APIRoute = async ({ request, clientAddress }) => {
  let input: unknown;
  try {
    input = await request.json();
  } catch {
    return Response.json({ error: "Request body must be JSON." }, { status: 400 });
  }

  const { name, body, turnstileToken } = (input ?? {}) as Record<string, unknown>;

  const check = await checkSubmission(clientAddress, turnstileToken);
  if (!check.ok) return Response.json({ error: check.error }, { status: check.status });

  if (typeof name !== "string" || typeof body !== "string") {
    return Response.json({ error: "Both name and body are required." }, { status: 400 });
  }
  const cleanName = name.trim();
  const cleanBody = body.trim();
  if (!cleanName || !cleanBody) {
    return Response.json({ error: "Both name and body are required." }, { status: 400 });
  }
  if (cleanName.length > MAX_NAME || cleanBody.length > MAX_BODY) {
    return Response.json(
      { error: `Name must be under ${MAX_NAME} characters and message under ${MAX_BODY}.` },
      { status: 400 },
    );
  }

  return Response.json({ message: await addMessage(cleanName, cleanBody) }, { status: 201 });
};
