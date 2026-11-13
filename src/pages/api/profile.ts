import type { APIRoute } from "astro";
import { normalizeAvatarInput } from "../../lib/avatars";
import { currentUser } from "../../lib/auth";
import { getProfileBundle, updateProfileBundle } from "../../lib/db";
import { INTERESTS, SECTORS } from "../../lib/survey";

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
  const display_name = String(body.display_name ?? "").trim();
  const bio = String(body.bio ?? "").trim();
  const location = String(body.location ?? "").trim();
  const partner_org = String(body.partner_org ?? "").trim();
  const visibility = String(body.visibility ?? "stewards");
  const profile_type = String(body.profile_type ?? "steward");
  const contact_links = String(body.contact_links ?? "").trim();
  const regions = String(body.regions ?? "").trim();
  const map_address = String(body.map_address ?? "").trim();
  const sector = String(body.sector ?? "").trim();
  const sector_other = String(body.sector_other ?? "").trim();
  const interest_other = String(body.interest_other ?? "").trim();
  const about = String(body.about ?? "").trim();
  const interestsRaw = Array.isArray(body.interests) ? body.interests.map(String) : [];

  if (!display_name) return Response.json({ error: "Display name is required." }, { status: 400 });
  if (!["public", "stewards", "private"].includes(visibility)) {
    return Response.json({ error: "Invalid visibility." }, { status: 400 });
  }
  if (profile_type !== "steward" && profile_type !== "partner") {
    return Response.json({ error: "Please choose Steward or Partner." }, { status: 400 });
  }
  if (sector && !(SECTORS as readonly string[]).includes(sector)) {
    return Response.json({ error: "Please choose a valid sector." }, { status: 400 });
  }

  let avatar_url = "";
  if (Object.prototype.hasOwnProperty.call(body, "avatar_url")) {
    const avatar = normalizeAvatarInput(String(body.avatar_url ?? ""));
    if (!avatar.ok) return Response.json({ error: avatar.error }, { status: 400 });
    avatar_url = avatar.value;
  } else {
    const existing = await getProfileBundle(user.id);
    avatar_url = existing?.avatar_url ?? "";
  }
  const interests = [...new Set(interestsRaw.filter((i) => (INTERESTS as readonly string[]).includes(i)))].slice(0, 3);

  await updateProfileBundle(user.id, {
    display_name: display_name.slice(0, 100),
    bio: bio.slice(0, 2000),
    location: location.slice(0, 120),
    partner_org: partner_org.slice(0, 120),
    visibility: visibility as "public" | "stewards" | "private",
    allow_directory: body.allow_directory ? 1 : 0,
    allow_messages: body.allow_messages ? 1 : 0,
    email_updates: body.email_updates ? 1 : 0,
    profile_type,
    contact_links: contact_links.slice(0, 4000),
    regions: regions.slice(0, 500),
    map_address: map_address.slice(0, 500),
    sector,
    sector_other: sector_other.slice(0, 200),
    interests: interests.join("|"),
    interest_other: interest_other.slice(0, 200),
    about: about.slice(0, 4000),
    avatar_url,
  });

  return Response.json({ ok: true });
};
