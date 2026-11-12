import type { APIRoute } from "astro";
import { hashPassword, startSession } from "../../lib/auth";
import { createApplicant, findUserByEmail } from "../../lib/db";
import { checkSubmission } from "../../lib/protect";

const MAX_NAME = 100;
const MAX_EMAIL = 200;
const MAX_NOTE = 2000;

export const POST: APIRoute = async ({ request, clientAddress }) => {
  let input: unknown;
  try {
    input = await request.json();
  } catch {
    return Response.json({ error: "Request body must be JSON." }, { status: 400 });
  }

  const body = (input ?? {}) as Record<string, unknown>;
  const check = await checkSubmission(clientAddress, body.turnstileToken);
  if (!check.ok) return Response.json({ error: check.error }, { status: check.status });

  const name = String(body.name ?? "").trim();
  const email = String(body.email ?? "").trim().toLowerCase();
  const password = String(body.password ?? "");
  const note = String(body.note ?? "").trim();
  const confirmExisting = Boolean(body.confirm_existing);
  const charterAgreed = Boolean(body.charter_agreed);

  if (!name || !email || !password) {
    return Response.json({ error: "Name, email, and password are required." }, { status: 400 });
  }
  if (!confirmExisting) {
    return Response.json(
      { error: "Please confirm you already participated in WEAll Canada." },
      { status: 400 },
    );
  }
  if (!charterAgreed) {
    return Response.json({ error: "Please agree to the Living Charter to activate." }, { status: 400 });
  }
  if (name.length > MAX_NAME || email.length > MAX_EMAIL || note.length > MAX_NOTE) {
    return Response.json({ error: "One of the fields is too long." }, { status: 400 });
  }
  if (!email.includes("@")) {
    return Response.json({ error: "Please enter a valid email." }, { status: 400 });
  }
  if (password.length < 8) {
    return Response.json({ error: "Password must be at least 8 characters." }, { status: 400 });
  }
  if (await findUserByEmail(email)) {
    return Response.json({ error: "An account with that email already exists. Try logging in." }, { status: 409 });
  }

  const about =
    note ||
    "Migrating steward activating an existing WEAll Canada relationship on the new platform.";

  const passwordHash = await hashPassword(password);
  const { userId, applicationId } = await createApplicant({
    email,
    passwordHash,
    displayName: name,
    why: about,
    profile_type: "steward",
    contact_links: email,
    regions: "",
    map_address: "",
    sector: "",
    sector_other: "",
    interests: "",
    interest_other: "",
    about,
    charter_agreed: true,
    source: "activate",
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
