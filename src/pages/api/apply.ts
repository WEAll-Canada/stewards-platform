import type { APIRoute } from "astro";
import { hashPassword, startSession } from "../../lib/auth";
import { createApplicant, findUserByEmail } from "../../lib/db";
import { checkSubmission } from "../../lib/protect";
import { INTERESTS, SECTORS } from "../../lib/survey";

const MAX_NAME = 100;
const MAX_EMAIL = 200;
const MAX_TEXT = 4000;

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
  const profile_type = String(body.profile_type ?? "");
  const contact_links = String(body.contact_links ?? "").trim();
  const regions = String(body.regions ?? "").trim();
  const map_address = String(body.map_address ?? "").trim();
  const sector = String(body.sector ?? "").trim();
  const sector_other = String(body.sector_other ?? "").trim();
  const interest_other = String(body.interest_other ?? "").trim();
  const about = String(body.about ?? "").trim();
  const charter_agreed = Boolean(body.charter_agreed);
  const interestsRaw = Array.isArray(body.interests) ? body.interests.map(String) : [];

  if (!name || !email || !password) {
    return Response.json({ error: "Name, email, and password are required." }, { status: 400 });
  }
  if (profile_type !== "steward" && profile_type !== "partner") {
    return Response.json({ error: "Please choose Steward or Partner." }, { status: 400 });
  }
  if (!contact_links || !regions || !sector || !about) {
    return Response.json({ error: "Please complete contact, location, sector, and about you." }, { status: 400 });
  }
  if (!(SECTORS as readonly string[]).includes(sector)) {
    return Response.json({ error: "Please choose a valid sector." }, { status: 400 });
  }
  if (sector === "Other" && !sector_other) {
    return Response.json({ error: "Please specify your sector." }, { status: 400 });
  }
  const interests = [...new Set(interestsRaw.filter((i) => (INTERESTS as readonly string[]).includes(i)))].slice(0, 3);
  if (interests.length === 0) {
    return Response.json({ error: "Select up to 3 areas of interest (at least one)." }, { status: 400 });
  }
  if (interests.includes("Other") && !interest_other) {
    return Response.json({ error: "Please specify your other area of interest." }, { status: 400 });
  }
  if (!charter_agreed) {
    return Response.json({ error: "Please agree to the Living Charter to join." }, { status: 400 });
  }
  if (name.length > MAX_NAME || email.length > MAX_EMAIL || about.length > MAX_TEXT) {
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

  const passwordHash = await hashPassword(password);
  const { userId, applicationId } = await createApplicant({
    email,
    passwordHash,
    displayName: name,
    why: about,
    profile_type,
    contact_links: contact_links.slice(0, MAX_TEXT),
    regions: regions.slice(0, 500),
    map_address: map_address.slice(0, 500),
    sector,
    sector_other: sector_other.slice(0, 200),
    interests: interests.join("|"),
    interest_other: interest_other.slice(0, 200),
    about: about.slice(0, MAX_TEXT),
    charter_agreed,
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
