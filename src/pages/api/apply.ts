import type { APIRoute } from "astro";
import { hashPassword, startSession } from "../../lib/auth";
import { createApplicant, findUserByEmail } from "../../lib/db";
import { checkSubmission } from "../../lib/protect";

const MAX_NAME = 100;
const MAX_EMAIL = 200;
const MAX_WHY = 2000;

export const POST: APIRoute = async ({ request, clientAddress }) => {
  let input: unknown;
  try {
    input = await request.json();
  } catch {
    return Response.json({ error: "Request body must be JSON." }, { status: 400 });
  }

  const { name, email, password, why, turnstileToken } = (input ?? {}) as Record<string, unknown>;
  const check = await checkSubmission(clientAddress, turnstileToken);
  if (!check.ok) return Response.json({ error: check.error }, { status: check.status });

  if (
    typeof name !== "string" ||
    typeof email !== "string" ||
    typeof password !== "string" ||
    typeof why !== "string"
  ) {
    return Response.json({ error: "Please fill in all fields." }, { status: 400 });
  }

  const cleanName = name.trim();
  const cleanEmail = email.trim().toLowerCase();
  const cleanWhy = why.trim();
  if (!cleanName || !cleanEmail || !password || !cleanWhy) {
    return Response.json({ error: "Please fill in all fields." }, { status: 400 });
  }
  if (cleanName.length > MAX_NAME || cleanEmail.length > MAX_EMAIL || cleanWhy.length > MAX_WHY) {
    return Response.json({ error: "One of the fields is too long." }, { status: 400 });
  }
  if (!cleanEmail.includes("@")) {
    return Response.json({ error: "Please enter a valid email." }, { status: 400 });
  }
  if (password.length < 8) {
    return Response.json({ error: "Password must be at least 8 characters." }, { status: 400 });
  }

  if (await findUserByEmail(cleanEmail)) {
    return Response.json({ error: "An account with that email already exists. Try logging in." }, { status: 409 });
  }

  const passwordHash = await hashPassword(password);
  const { userId, applicationId } = await createApplicant({
    email: cleanEmail,
    passwordHash,
    displayName: cleanName,
    why: cleanWhy,
  });

  const session = await startSession(userId, request);
  return new Response(JSON.stringify({ ok: true, redirect: "/stewards/pending", applicationId }), {
    status: 201,
    headers: {
      "Content-Type": "application/json",
      "Set-Cookie": session.header,
    },
  });
};
