import type { APIRoute } from "astro";
import { authenticateEmailPassword, startSession } from "../../lib/auth";
import { checkSubmission } from "../../lib/protect";

export const POST: APIRoute = async ({ request, clientAddress }) => {
  let input: unknown;
  try {
    input = await request.json();
  } catch {
    return Response.json({ error: "Request body must be JSON." }, { status: 400 });
  }

  const { email, password, turnstileToken } = (input ?? {}) as Record<string, unknown>;
  const check = await checkSubmission(clientAddress, turnstileToken);
  if (!check.ok) return Response.json({ error: check.error }, { status: check.status });

  if (typeof email !== "string" || typeof password !== "string") {
    return Response.json({ error: "Email and password are required." }, { status: 400 });
  }

  const result = await authenticateEmailPassword(email, password);
  if (!result.ok) return Response.json({ error: result.error }, { status: 401 });

  const session = await startSession(result.user.id, request);
  const redirect =
    result.user.status === "applicant"
      ? "/stewards/pending"
      : result.user.roles.includes("admin")
        ? "/stewards/admin"
        : "/stewards/dashboard";

  return new Response(JSON.stringify({ ok: true, redirect }), {
    status: 200,
    headers: {
      "Content-Type": "application/json",
      "Set-Cookie": session.header,
    },
  });
};
