// The only place SQL queries live. Pages and API routes call these functions.
import { env } from "cloudflare:workers";

export interface Message {
  id: number;
  name: string;
  body: string;
  created_at: string;
}

export interface StewardUser {
  id: number;
  email: string;
  password_hash: string | null;
  google_sub: string | null;
  status: "applicant" | "active" | "disabled";
  created_at: string;
  display_name: string;
  roles: string[];
}

export interface ApplicationRow {
  id: number;
  user_id: number;
  why: string;
  status: "pending" | "approved" | "rejected";
  created_at: string;
  email: string;
  display_name: string;
  profile_type: string;
  contact_links: string;
  regions: string;
  map_address: string;
  sector: string;
  sector_other: string;
  interests: string;
  interest_other: string;
  about: string;
  charter_agreed: number;
  source: "apply" | "activate";
}

export async function listMessages(limit = 50): Promise<Message[]> {
  const { results } = await env.DB.prepare(
    "SELECT id, name, body, created_at FROM messages ORDER BY created_at DESC, id DESC LIMIT ?",
  )
    .bind(limit)
    .all<Message>();
  return results;
}

export async function addMessage(name: string, body: string): Promise<Message> {
  const message = await env.DB.prepare(
    "INSERT INTO messages (name, body) VALUES (?, ?) RETURNING id, name, body, created_at",
  )
    .bind(name, body)
    .first<Message>();
  if (!message) throw new Error("Insert returned no row");
  return message;
}

async function rolesForUser(userId: number): Promise<string[]> {
  const { results } = await env.DB.prepare(
    `SELECT r.name FROM user_roles ur
     JOIN roles r ON r.id = ur.role_id
     WHERE ur.user_id = ?`,
  )
    .bind(userId)
    .all<{ name: string }>();
  return results.map((r) => r.name);
}

async function hydrateUser(row: {
  id: number;
  email: string;
  password_hash: string | null;
  google_sub: string | null;
  status: StewardUser["status"];
  created_at: string;
  display_name?: string | null;
}): Promise<StewardUser> {
  return {
    id: row.id,
    email: row.email,
    password_hash: row.password_hash,
    google_sub: row.google_sub,
    status: row.status,
    created_at: row.created_at,
    display_name: row.display_name ?? "",
    roles: await rolesForUser(row.id),
  };
}

export async function findUserByEmail(email: string): Promise<StewardUser | null> {
  const row = await env.DB.prepare(
    `SELECT u.id, u.email, u.password_hash, u.google_sub, u.status, u.created_at, p.display_name
     FROM users u
     LEFT JOIN profiles p ON p.user_id = u.id
     WHERE lower(u.email) = lower(?)`,
  )
    .bind(email.trim())
    .first<{
      id: number;
      email: string;
      password_hash: string | null;
      google_sub: string | null;
      status: StewardUser["status"];
      created_at: string;
      display_name: string | null;
    }>();
  if (!row) return null;
  return hydrateUser(row);
}

export async function getUserById(id: number): Promise<StewardUser | null> {
  const row = await env.DB.prepare(
    `SELECT u.id, u.email, u.password_hash, u.google_sub, u.status, u.created_at, p.display_name
     FROM users u
     LEFT JOIN profiles p ON p.user_id = u.id
     WHERE u.id = ?`,
  )
    .bind(id)
    .first<{
      id: number;
      email: string;
      password_hash: string | null;
      google_sub: string | null;
      status: StewardUser["status"];
      created_at: string;
      display_name: string | null;
    }>();
  if (!row) return null;
  return hydrateUser(row);
}

export async function createApplicant(input: {
  email: string;
  passwordHash: string;
  displayName: string;
  why: string;
  profile_type: "steward" | "partner";
  contact_links: string;
  regions: string;
  map_address: string;
  sector: string;
  sector_other: string;
  interests: string;
  interest_other: string;
  about: string;
  charter_agreed: boolean;
  source?: "apply" | "activate";
}): Promise<{ userId: number; applicationId: number }> {
  const source = input.source ?? "apply";
  const user = await env.DB.prepare(
    `INSERT INTO users (email, password_hash, status)
     VALUES (?, ?, 'applicant')
     RETURNING id`,
  )
    .bind(input.email.trim().toLowerCase(), input.passwordHash)
    .first<{ id: number }>();
  if (!user) throw new Error("Could not create user");

  await env.DB.prepare(
    `INSERT INTO profiles (
       user_id, display_name, profile_type, contact_links, regions, map_address,
       sector, sector_other, interests, interest_other, about, bio
     ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  )
    .bind(
      user.id,
      input.displayName.trim(),
      input.profile_type,
      input.contact_links,
      input.regions,
      input.map_address,
      input.sector,
      input.sector_other,
      input.interests,
      input.interest_other,
      input.about,
      input.about,
    )
    .run();

  await env.DB.prepare(`INSERT INTO preferences (user_id) VALUES (?)`).bind(user.id).run();

  const application = await env.DB.prepare(
    `INSERT INTO applications (
       user_id, why, status, profile_type, contact_links, regions, map_address,
       sector, sector_other, interests, interest_other, about, charter_agreed, source
     ) VALUES (?, ?, 'pending', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
     RETURNING id`,
  )
    .bind(
      user.id,
      input.why.trim() || input.about.trim(),
      input.profile_type,
      input.contact_links,
      input.regions,
      input.map_address,
      input.sector,
      input.sector_other,
      input.interests,
      input.interest_other,
      input.about,
      input.charter_agreed ? 1 : 0,
      source,
    )
    .first<{ id: number }>();
  if (!application) throw new Error("Could not create application");

  return { userId: user.id, applicationId: application.id };
}

export async function listPendingApplications(): Promise<ApplicationRow[]> {
  const { results } = await env.DB.prepare(
    `SELECT a.id, a.user_id, a.why, a.status, a.created_at, u.email, p.display_name,
            a.profile_type, a.contact_links, a.regions, a.map_address, a.sector, a.sector_other,
            a.interests, a.interest_other, a.about, a.charter_agreed, a.source
     FROM applications a
     JOIN users u ON u.id = a.user_id
     LEFT JOIN profiles p ON p.user_id = u.id
     WHERE a.status = 'pending'
     ORDER BY CASE a.source WHEN 'activate' THEN 0 ELSE 1 END, a.created_at ASC, a.id ASC`,
  ).all<ApplicationRow>();
  return results;
}

export async function reviewApplication(
  applicationId: number,
  decision: "approved" | "rejected",
  reviewerId: number,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const app = await env.DB.prepare(
    `SELECT id, user_id, status FROM applications WHERE id = ?`,
  )
    .bind(applicationId)
    .first<{ id: number; user_id: number; status: string }>();
  if (!app) return { ok: false, error: "Application not found." };
  if (app.status !== "pending") return { ok: false, error: "That application was already reviewed." };

  const now = new Date().toISOString().replace(/\.\d{3}Z$/, "Z");
  await env.DB.prepare(
    `UPDATE applications
     SET status = ?, reviewed_by = ?, reviewed_at = ?
     WHERE id = ?`,
  )
    .bind(decision, reviewerId, now, applicationId)
    .run();

  if (decision === "approved") {
    await env.DB.prepare(`UPDATE users SET status = 'active' WHERE id = ?`).bind(app.user_id).run();
    await env.DB.prepare(
      `INSERT OR IGNORE INTO user_roles (user_id, role_id)
       SELECT ?, id FROM roles WHERE name = 'steward'`,
    )
      .bind(app.user_id)
      .run();
  } else {
    await env.DB.prepare(`UPDATE users SET status = 'disabled' WHERE id = ?`).bind(app.user_id).run();
  }

  await logActivity({
    actorId: reviewerId,
    action: decision === "approved" ? "application.approved" : "application.rejected",
    subjectType: "application",
    subjectId: String(applicationId),
    detail: `Application #${applicationId} ${decision}.`,
  });

  return { ok: true };
}

export const ADMIN_ROLE_NAMES = ["steward", "circle_lead", "admin"] as const;
export type AdminRoleName = (typeof ADMIN_ROLE_NAMES)[number];

export interface AdminPersonRow {
  id: number;
  email: string;
  status: StewardUser["status"];
  created_at: string;
  display_name: string;
  partner_org: string;
  sector: string;
  roles: string[];
}

export async function listAdminPeople(filters: {
  q?: string;
  status?: "all" | StewardUser["status"];
} = {}): Promise<AdminPersonRow[]> {
  const q = (filters.q ?? "").trim().toLowerCase();
  const status = filters.status && filters.status !== "all" ? filters.status : null;
  const clauses: string[] = [];
  const binds: (string | number)[] = [];

  if (status) {
    clauses.push("u.status = ?");
    binds.push(status);
  }
  if (q) {
    clauses.push(
      `(lower(u.email) LIKE ? OR lower(COALESCE(p.display_name, '')) LIKE ? OR lower(COALESCE(p.partner_org, '')) LIKE ?)`,
    );
    const like = `%${q}%`;
    binds.push(like, like, like);
  }

  const where = clauses.length ? `WHERE ${clauses.join(" AND ")}` : "";
  const { results } = await env.DB.prepare(
    `SELECT u.id, u.email, u.status, u.created_at,
            COALESCE(p.display_name, '') AS display_name,
            COALESCE(p.partner_org, '') AS partner_org,
            COALESCE(p.sector, '') AS sector
     FROM users u
     LEFT JOIN profiles p ON p.user_id = u.id
     ${where}
     ORDER BY lower(COALESCE(NULLIF(p.display_name, ''), u.email)) COLLATE NOCASE, u.id`,
  )
    .bind(...binds)
    .all<{
      id: number;
      email: string;
      status: StewardUser["status"];
      created_at: string;
      display_name: string;
      partner_org: string;
      sector: string;
    }>();

  const people: AdminPersonRow[] = [];
  for (const row of results) {
    people.push({
      ...row,
      roles: await rolesForUser(row.id),
    });
  }
  return people;
}

export async function updateAdminPerson(
  userId: number,
  input: {
    status?: StewardUser["status"];
    roles?: string[];
  },
  actorId: number,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const target = await getUserById(userId);
  if (!target) return { ok: false, error: "Person not found." };

  if (input.status) {
    if (!["applicant", "active", "disabled"].includes(input.status)) {
      return { ok: false, error: "Invalid status." };
    }
    if (userId === actorId && input.status !== "active") {
      return { ok: false, error: "You can’t disable your own account." };
    }
    await env.DB.prepare(`UPDATE users SET status = ? WHERE id = ?`).bind(input.status, userId).run();
  }

  if (input.roles) {
    const wanted = [...new Set(input.roles.filter((r): r is AdminRoleName =>
      (ADMIN_ROLE_NAMES as readonly string[]).includes(r),
    ))];
    if (userId === actorId && !wanted.includes("admin")) {
      return { ok: false, error: "You can’t remove your own admin role." };
    }
    await env.DB.prepare(`DELETE FROM user_roles WHERE user_id = ?`).bind(userId).run();
    for (const name of wanted) {
      await env.DB.prepare(
        `INSERT INTO user_roles (user_id, role_id)
         SELECT ?, id FROM roles WHERE name = ?`,
      )
        .bind(userId, name)
        .run();
    }
  }

  await logActivity({
    actorId,
    action: "person.updated",
    subjectType: "user",
    subjectId: String(userId),
    detail: `Updated ${target.display_name || target.email}${input.status ? ` · status ${input.status}` : ""}${input.roles ? ` · roles ${input.roles.join(", ")}` : ""}.`,
  });

  return { ok: true };
}

export async function createSession(id: string, userId: number, expiresAt: string): Promise<void> {
  await env.DB.prepare(`INSERT INTO sessions (id, user_id, expires_at) VALUES (?, ?, ?)`).bind(id, userId, expiresAt).run();
}

export async function deleteSession(id: string): Promise<void> {
  await env.DB.prepare(`DELETE FROM sessions WHERE id = ?`).bind(id).run();
}

export async function getSessionUser(sessionId: string): Promise<StewardUser | null> {
  const row = await env.DB.prepare(
    `SELECT u.id, u.email, u.password_hash, u.google_sub, u.status, u.created_at, p.display_name, s.expires_at
     FROM sessions s
     JOIN users u ON u.id = s.user_id
     LEFT JOIN profiles p ON p.user_id = u.id
     WHERE s.id = ?`,
  )
    .bind(sessionId)
    .first<{
      id: number;
      email: string;
      password_hash: string | null;
      google_sub: string | null;
      status: StewardUser["status"];
      created_at: string;
      display_name: string | null;
      expires_at: string;
    }>();
  if (!row) return null;
  if (new Date(row.expires_at).getTime() < Date.now()) {
    await deleteSession(sessionId);
    return null;
  }
  return hydrateUser(row);
}

export type DirectorySteward = {
  id: number;
  display_name: string;
  bio: string;
  location: string;
  partner_org: string;
  regions: string;
  sector: string;
  interests: string;
  avatar_url: string;
};

export type DirectoryFilters = {
  q?: string;
  region?: string;
  sector?: string;
  interest?: string;
};

export async function listDirectoryStewards(filters: DirectoryFilters = {}): Promise<DirectorySteward[]> {
  const clauses = [
    "u.status = 'active'",
    "pref.allow_directory = 1",
    "p.visibility != 'private'",
  ];
  const binds: (string | number)[] = [];

  const q = filters.q?.trim();
  if (q) {
    clauses.push(
      `(p.display_name LIKE ? OR p.bio LIKE ? OR p.partner_org LIKE ? OR p.location LIKE ? OR p.regions LIKE ?)`,
    );
    const like = `%${q}%`;
    binds.push(like, like, like, like, like);
  }
  const region = filters.region?.trim();
  if (region) {
    clauses.push(`p.regions LIKE ?`);
    binds.push(`%${region}%`);
  }
  const sector = filters.sector?.trim();
  if (sector) {
    clauses.push(`p.sector = ?`);
    binds.push(sector);
  }
  const interest = filters.interest?.trim();
  if (interest) {
    clauses.push(`('|' || p.interests || '|') LIKE ?`);
    binds.push(`%|${interest}|%`);
  }

  const stmt = env.DB.prepare(
    `SELECT u.id, p.display_name, p.bio, p.location, p.partner_org, p.regions, p.sector, p.interests, p.avatar_url
     FROM users u
     JOIN profiles p ON p.user_id = u.id
     JOIN preferences pref ON pref.user_id = u.id
     WHERE ${clauses.join(" AND ")}
     ORDER BY u.created_at DESC, u.id DESC`,
  );
  const { results } = binds.length ? await stmt.bind(...binds).all<DirectorySteward>() : await stmt.all<DirectorySteward>();
  return results;
}

export type MatchCandidateRow = {
  id: number;
  display_name: string;
  bio: string;
  location: string;
  partner_org: string;
  regions: string;
  sector: string;
  interests: string;
  interest_other: string;
  about: string;
  avatar_url: string;
};

/** Directory-visible stewards with fields needed for interest matching. */
export async function listMatchCandidates(): Promise<MatchCandidateRow[]> {
  const { results } = await env.DB.prepare(
    `SELECT u.id, p.display_name, p.bio, p.location, p.partner_org, p.regions, p.sector,
            p.interests, p.interest_other, p.about, p.avatar_url
     FROM users u
     JOIN profiles p ON p.user_id = u.id
     JOIN preferences pref ON pref.user_id = u.id
     WHERE u.status = 'active' AND pref.allow_directory = 1 AND p.visibility != 'private'
     ORDER BY p.display_name COLLATE NOCASE ASC`,
  ).all<MatchCandidateRow>();
  return results;
}

export type NetworkNode = {
  id: number;
  display_name: string;
  interests: string;
  avatar_url: string;
  regions: string;
  sector: string;
};

export type NetworkEdge = {
  source: number;
  target: number;
  strength: number;
  reason: string;
};

/** Nodes = directory-visible stewards; edges = connections between those nodes. */
export async function getNetworkGraph(): Promise<{ nodes: NetworkNode[]; edges: NetworkEdge[] }> {
  const { results: nodes } = await env.DB.prepare(
    `SELECT u.id, p.display_name, p.interests, p.avatar_url, p.regions, p.sector
     FROM users u
     JOIN profiles p ON p.user_id = u.id
     JOIN preferences pref ON pref.user_id = u.id
     WHERE u.status = 'active' AND pref.allow_directory = 1 AND p.visibility != 'private'
     ORDER BY p.display_name COLLATE NOCASE ASC`,
  ).all<NetworkNode>();

  const idSet = new Set(nodes.map((n) => n.id));
  const { results: rawEdges } = await env.DB.prepare(
    `SELECT from_user_id, to_user_id, strength, reason
     FROM connections
     ORDER BY strength DESC, updated_at DESC`,
  ).all<{ from_user_id: number; to_user_id: number; strength: number; reason: string }>();

  const edgeMap = new Map<string, NetworkEdge>();
  for (const e of rawEdges) {
    if (!idSet.has(e.from_user_id) || !idSet.has(e.to_user_id)) continue;
    const a = Math.min(e.from_user_id, e.to_user_id);
    const b = Math.max(e.from_user_id, e.to_user_id);
    const key = `${a}:${b}`;
    const existing = edgeMap.get(key);
    if (!existing || e.strength > existing.strength) {
      edgeMap.set(key, { source: a, target: b, strength: e.strength, reason: e.reason || "" });
    }
  }

  return { nodes, edges: [...edgeMap.values()] };
}

export async function listDirectoryFilterOptions(): Promise<{
  regions: string[];
  sectors: string[];
  interests: string[];
}> {
  const { results } = await env.DB.prepare(
    `SELECT p.regions, p.sector, p.interests
     FROM users u
     JOIN profiles p ON p.user_id = u.id
     JOIN preferences pref ON pref.user_id = u.id
     WHERE u.status = 'active' AND pref.allow_directory = 1 AND p.visibility != 'private'`,
  ).all<{ regions: string; sector: string; interests: string }>();

  const regions = new Set<string>();
  const sectors = new Set<string>();
  const interests = new Set<string>();
  for (const row of results) {
    if (row.regions?.trim()) regions.add(row.regions.trim());
    if (row.sector?.trim()) sectors.add(row.sector.trim());
    for (const part of (row.interests || "").split("|")) {
      if (part.trim()) interests.add(part.trim());
    }
  }
  return {
    regions: [...regions].sort((a, b) => a.localeCompare(b)),
    sectors: [...sectors].sort((a, b) => a.localeCompare(b)),
    interests: [...interests].sort((a, b) => a.localeCompare(b)),
  };
}

export interface ProfileBundle {
  display_name: string;
  bio: string;
  location: string;
  partner_org: string;
  visibility: "public" | "stewards" | "private";
  allow_directory: number;
  allow_messages: number;
  email_updates: number;
  profile_type: string;
  contact_links: string;
  regions: string;
  map_address: string;
  sector: string;
  sector_other: string;
  interests: string;
  interest_other: string;
  about: string;
  avatar_url: string;
}

export async function getProfileBundle(userId: number): Promise<ProfileBundle | null> {
  return env.DB.prepare(
    `SELECT p.display_name, p.bio, p.location, p.partner_org, p.visibility, p.avatar_url,
            p.profile_type, p.contact_links, p.regions, p.map_address, p.sector, p.sector_other,
            p.interests, p.interest_other, p.about,
            pref.allow_directory, pref.allow_messages, pref.email_updates
     FROM profiles p
     JOIN preferences pref ON pref.user_id = p.user_id
     WHERE p.user_id = ?`,
  )
    .bind(userId)
    .first<ProfileBundle>();
}

export async function updateProfileBundle(userId: number, input: ProfileBundle): Promise<void> {
  const now = new Date().toISOString().replace(/\.\d{3}Z$/, "Z");
  await env.DB.prepare(
    `UPDATE profiles
     SET display_name = ?, bio = ?, location = ?, partner_org = ?, visibility = ?,
         profile_type = ?, contact_links = ?, regions = ?, map_address = ?,
         sector = ?, sector_other = ?, interests = ?, interest_other = ?, about = ?,
         avatar_url = ?, updated_at = ?
     WHERE user_id = ?`,
  )
    .bind(
      input.display_name,
      input.bio,
      input.location,
      input.partner_org,
      input.visibility,
      input.profile_type,
      input.contact_links,
      input.regions,
      input.map_address,
      input.sector,
      input.sector_other,
      input.interests,
      input.interest_other,
      input.about,
      input.avatar_url,
      now,
      userId,
    )
    .run();
  await env.DB.prepare(
    `UPDATE preferences
     SET allow_directory = ?, allow_messages = ?, email_updates = ?, updated_at = ?
     WHERE user_id = ?`,
  )
    .bind(input.allow_directory, input.allow_messages, input.email_updates, now, userId)
    .run();
}

export interface CircleRow {
  id: number;
  slug: string;
  name: string;
  color_token: string;
  status: "active" | "dormant";
  description: string;
  welcome_note: string;
  resources_blurb: string;
  member_count: number;
  membership: string | null;
  pending_request: number;
}

export const CIRCLE_COLOR_TOKENS = [
  "central",
  "knowledge",
  "policy",
  "liberating",
  "grassroots",
  "master",
] as const;

export type CircleColorToken = (typeof CIRCLE_COLOR_TOKENS)[number];

export async function listCirclesForUser(userId: number): Promise<CircleRow[]> {
  const { results } = await env.DB.prepare(
    `SELECT c.id, c.slug, c.name, c.color_token, c.status, c.description,
            COALESCE(c.welcome_note, '') AS welcome_note,
            COALESCE(c.resources_blurb, '') AS resources_blurb,
            (SELECT COUNT(*) FROM circle_members cm2 WHERE cm2.circle_id = c.id) AS member_count,
            cm.role AS membership,
            CASE WHEN jr.id IS NULL THEN 0 ELSE 1 END AS pending_request
     FROM circles c
     LEFT JOIN circle_members cm ON cm.circle_id = c.id AND cm.user_id = ?
     LEFT JOIN circle_join_requests jr
       ON jr.circle_id = c.id AND jr.user_id = ? AND jr.status = 'pending'
     ORDER BY CASE c.status WHEN 'active' THEN 0 ELSE 1 END, c.name COLLATE NOCASE`,
  )
    .bind(userId, userId)
    .all<CircleRow>();
  return results;
}

export async function requestCircleJoin(
  circleId: number,
  userId: number,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const circle = await env.DB.prepare(`SELECT id, status FROM circles WHERE id = ?`)
    .bind(circleId)
    .first<{ id: number; status: string }>();
  if (!circle) return { ok: false, error: "Circle not found." };
  if (circle.status !== "active") return { ok: false, error: "That circle is dormant." };

  const existing = await env.DB.prepare(
    `SELECT 1 AS ok FROM circle_members WHERE circle_id = ? AND user_id = ?`,
  )
    .bind(circleId, userId)
    .first();
  if (existing) return { ok: false, error: "You are already a member." };

  const pending = await env.DB.prepare(
    `SELECT id FROM circle_join_requests WHERE circle_id = ? AND user_id = ? AND status = 'pending'`,
  )
    .bind(circleId, userId)
    .first();
  if (pending) return { ok: false, error: "You already requested to join." };

  await env.DB.prepare(
    `INSERT INTO circle_join_requests (circle_id, user_id, status) VALUES (?, ?, 'pending')`,
  )
    .bind(circleId, userId)
    .run();
  return { ok: true };
}

export async function listPendingCircleJoins(): Promise<
  { id: number; circle_name: string; display_name: string; email: string; created_at: string }[]
> {
  const { results } = await env.DB.prepare(
    `SELECT jr.id, c.name AS circle_name, p.display_name, u.email, jr.created_at
     FROM circle_join_requests jr
     JOIN circles c ON c.id = jr.circle_id
     JOIN users u ON u.id = jr.user_id
     LEFT JOIN profiles p ON p.user_id = u.id
     WHERE jr.status = 'pending'
     ORDER BY jr.created_at ASC`,
  ).all<{ id: number; circle_name: string; display_name: string; email: string; created_at: string }>();
  return results;
}

export async function reviewCircleJoin(
  requestId: number,
  decision: "approved" | "rejected",
  reviewerId?: number,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const row = await env.DB.prepare(
    `SELECT id, circle_id, user_id, status FROM circle_join_requests WHERE id = ?`,
  )
    .bind(requestId)
    .first<{ id: number; circle_id: number; user_id: number; status: string }>();
  if (!row) return { ok: false, error: "Request not found." };
  if (row.status !== "pending") return { ok: false, error: "Already reviewed." };

  const now = new Date().toISOString().replace(/\.\d{3}Z$/, "Z");
  await env.DB.prepare(
    `UPDATE circle_join_requests SET status = ?, reviewed_at = ? WHERE id = ?`,
  )
    .bind(decision, now, requestId)
    .run();

  if (decision === "approved") {
    await env.DB.prepare(
      `INSERT OR IGNORE INTO circle_members (circle_id, user_id, role) VALUES (?, ?, 'member')`,
    )
      .bind(row.circle_id, row.user_id)
      .run();
  }
  await logActivity({
    actorId: reviewerId ?? null,
    action: decision === "approved" ? "circle_join.approved" : "circle_join.rejected",
    subjectType: "circle_join",
    subjectId: String(requestId),
    detail: `Circle join #${requestId} ${decision}.`,
  });
  return { ok: true };
}

export async function upsertConnection(input: {
  fromUserId: number;
  toUserId: number;
  strength: number;
  reason: string;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  if (input.fromUserId === input.toUserId) return { ok: false, error: "You cannot connect to yourself." };
  if (input.strength < 1 || input.strength > 4) return { ok: false, error: "Strength must be 1–4." };
  const target = await getUserById(input.toUserId);
  if (!target || target.status !== "active") return { ok: false, error: "Steward not found." };

  const now = new Date().toISOString().replace(/\.\d{3}Z$/, "Z");
  await env.DB.prepare(
    `INSERT INTO connections (from_user_id, to_user_id, strength, reason, updated_at)
     VALUES (?, ?, ?, ?, ?)
     ON CONFLICT(from_user_id, to_user_id) DO UPDATE SET
       strength = excluded.strength,
       reason = excluded.reason,
       updated_at = excluded.updated_at`,
  )
    .bind(input.fromUserId, input.toUserId, input.strength, input.reason.trim(), now)
    .run();
  return { ok: true };
}

export async function listConnectionsFor(userId: number): Promise<
  {
    id: number;
    other_id: number;
    display_name: string;
    avatar_url: string;
    strength: number;
    reason: string;
    direction: string;
  }[]
> {
  const { results } = await env.DB.prepare(
    `SELECT c.id, c.strength, c.reason,
            CASE WHEN c.from_user_id = ? THEN c.to_user_id ELSE c.from_user_id END AS other_id,
            p.display_name,
            p.avatar_url,
            CASE WHEN c.from_user_id = ? THEN 'out' ELSE 'in' END AS direction
     FROM connections c
     JOIN profiles p ON p.user_id = CASE WHEN c.from_user_id = ? THEN c.to_user_id ELSE c.from_user_id END
     WHERE c.from_user_id = ? OR c.to_user_id = ?
     ORDER BY c.updated_at DESC`,
  )
    .bind(userId, userId, userId, userId, userId)
    .all<{
      id: number;
      other_id: number;
      display_name: string;
      avatar_url: string;
      strength: number;
      reason: string;
      direction: string;
    }>();
  return results;
}

export async function getOrCreateDmThread(userA: number, userB: number): Promise<number> {
  const existing = await env.DB.prepare(
    `SELECT t.id
     FROM steward_threads t
     JOIN steward_thread_participants a ON a.thread_id = t.id AND a.user_id = ?
     JOIN steward_thread_participants b ON b.thread_id = t.id AND b.user_id = ?
     WHERE (
       SELECT COUNT(*) FROM steward_thread_participants p WHERE p.thread_id = t.id
     ) = 2`,
  )
    .bind(userA, userB)
    .first<{ id: number }>();
  if (existing) return existing.id;

  const thread = await env.DB.prepare(`INSERT INTO steward_threads DEFAULT VALUES RETURNING id`).first<{
    id: number;
  }>();
  if (!thread) throw new Error("Could not create thread");
  await env.DB.prepare(`INSERT INTO steward_thread_participants (thread_id, user_id) VALUES (?, ?)`)
    .bind(thread.id, userA)
    .run();
  await env.DB.prepare(`INSERT INTO steward_thread_participants (thread_id, user_id) VALUES (?, ?)`)
    .bind(thread.id, userB)
    .run();
  return thread.id;
}

export async function addStewardMessage(threadId: number, fromUserId: number, body: string): Promise<void> {
  const now = new Date().toISOString().replace(/\.\d{3}Z$/, "Z");
  await env.DB.prepare(
    `INSERT INTO steward_messages (thread_id, from_user_id, body, created_at) VALUES (?, ?, ?, ?)`,
  )
    .bind(threadId, fromUserId, body, now)
    .run();
  await env.DB.prepare(`UPDATE steward_threads SET last_message_at = ? WHERE id = ?`).bind(now, threadId).run();
}

export async function listStewardThreads(userId: number): Promise<
  { id: number; last_message_at: string; other_name: string; other_avatar: string; preview: string }[]
> {
  const { results } = await env.DB.prepare(
    `SELECT t.id, t.last_message_at,
            COALESCE((
              SELECT COALESCE(p.display_name, u.email)
              FROM steward_thread_participants op
              JOIN users u ON u.id = op.user_id
              LEFT JOIN profiles p ON p.user_id = op.user_id
              WHERE op.thread_id = t.id AND op.user_id != ?
              ORDER BY op.user_id ASC
              LIMIT 1
            ), 'Steward') AS other_name,
            COALESCE((
              SELECT COALESCE(p.avatar_url, '')
              FROM steward_thread_participants op
              LEFT JOIN profiles p ON p.user_id = op.user_id
              WHERE op.thread_id = t.id AND op.user_id != ?
              ORDER BY op.user_id ASC
              LIMIT 1
            ), '') AS other_avatar,
            COALESCE((
              SELECT m.body FROM steward_messages m
              WHERE m.thread_id = t.id
              ORDER BY m.created_at DESC, m.id DESC LIMIT 1
            ), '') AS preview
     FROM steward_threads t
     JOIN steward_thread_participants me ON me.thread_id = t.id AND me.user_id = ?
     ORDER BY t.last_message_at DESC`,
  )
    .bind(userId, userId, userId)
    .all<{
      id: number;
      last_message_at: string;
      other_name: string;
      other_avatar: string;
      preview: string;
    }>();
  return results;
}

export async function listStewardMessages(
  threadId: number,
  userId: number,
): Promise<
  {
    id: number;
    from_user_id: number;
    body: string;
    created_at: string;
    display_name: string;
    avatar_url: string;
  }[]
> {
  const member = await env.DB.prepare(
    `SELECT 1 AS ok FROM steward_thread_participants WHERE thread_id = ? AND user_id = ?`,
  )
    .bind(threadId, userId)
    .first();
  if (!member) return [];

  const { results } = await env.DB.prepare(
    `SELECT m.id, m.from_user_id, m.body, m.created_at,
            COALESCE(p.display_name, u.email) AS display_name,
            COALESCE(p.avatar_url, '') AS avatar_url
     FROM steward_messages m
     JOIN users u ON u.id = m.from_user_id
     LEFT JOIN profiles p ON p.user_id = m.from_user_id
     WHERE m.thread_id = ?
     ORDER BY m.created_at ASC, m.id ASC`,
  )
    .bind(threadId)
    .all<{
      id: number;
      from_user_id: number;
      body: string;
      created_at: string;
      display_name: string;
      avatar_url: string;
    }>();
  return results;
}

export async function userCanMessage(userId: number): Promise<boolean> {
  const row = await env.DB.prepare(`SELECT allow_messages FROM preferences WHERE user_id = ?`)
    .bind(userId)
    .first<{ allow_messages: number }>();
  return !!row?.allow_messages;
}

export type EmailThreadFilters = {
  q?: string;
  status?: string;
};

export type EmailThreadRow = {
  id: number;
  subject: string;
  status: string;
  last_message_at: string;
  preview: string;
  from_addr: string;
  last_admin_name: string;
};

export async function listEmailThreads(filters: EmailThreadFilters = {}): Promise<EmailThreadRow[]> {
  const clauses: string[] = ["1=1"];
  const binds: string[] = [];
  const q = filters.q?.trim();
  if (q) {
    clauses.push(
      `(t.subject LIKE ? OR t.from_addr LIKE ? OR EXISTS (
         SELECT 1 FROM email_messages m
         WHERE m.thread_id = t.id
           AND (m.body_text LIKE ? OR m.from_addr LIKE ? OR m.to_addrs LIKE ?)
       ))`,
    );
    const like = `%${q}%`;
    binds.push(like, like, like, like, like);
  }
  const status = filters.status?.trim();
  if (status === "open" || status === "closed") {
    clauses.push(`t.status = ?`);
    binds.push(status);
  }

  const stmt = env.DB.prepare(
    `SELECT t.id, t.subject, t.status, t.last_message_at, t.from_addr, t.last_admin_name,
            COALESCE((
              SELECT m.body_text FROM email_messages m
              WHERE m.thread_id = t.id
              ORDER BY m.created_at DESC, m.id DESC LIMIT 1
            ), '') AS preview
     FROM email_threads t
     WHERE ${clauses.join(" AND ")}
     ORDER BY t.last_message_at DESC`,
  );
  const { results } = binds.length
    ? await stmt.bind(...binds).all<EmailThreadRow>()
    : await stmt.all<EmailThreadRow>();
  return results;
}

export async function getEmailThread(threadId: number): Promise<{
  thread: {
    id: number;
    subject: string;
    status: string;
    from_addr: string;
    last_admin_name: string;
  } | null;
  messages: {
    id: number;
    direction: string;
    from_addr: string;
    to_addrs: string;
    body_text: string;
    created_at: string;
    admin_name: string;
  }[];
}> {
  const thread = await env.DB.prepare(
    `SELECT id, subject, status, from_addr, last_admin_name FROM email_threads WHERE id = ?`,
  )
    .bind(threadId)
    .first<{
      id: number;
      subject: string;
      status: string;
      from_addr: string;
      last_admin_name: string;
    }>();
  if (!thread) return { thread: null, messages: [] };
  const { results } = await env.DB.prepare(
    `SELECT m.id, m.direction, m.from_addr, m.to_addrs, m.body_text, m.created_at,
            COALESCE(p.display_name, u.email, '') AS admin_name
     FROM email_messages m
     LEFT JOIN users u ON u.id = m.admin_user_id
     LEFT JOIN profiles p ON p.user_id = m.admin_user_id
     WHERE m.thread_id = ?
     ORDER BY m.created_at ASC, m.id ASC`,
  )
    .bind(threadId)
    .all<{
      id: number;
      direction: string;
      from_addr: string;
      to_addrs: string;
      body_text: string;
      created_at: string;
      admin_name: string;
    }>();
  return { thread, messages: results };
}

export async function setEmailThreadStatus(
  threadId: number,
  status: "open" | "closed",
): Promise<boolean> {
  const result = await env.DB.prepare(`UPDATE email_threads SET status = ? WHERE id = ?`)
    .bind(status, threadId)
    .run();
  return (result.meta.changes ?? 0) > 0;
}

export async function getEmailReplyTarget(
  threadId: number,
): Promise<{ to: string; subject: string } | null> {
  const thread = await env.DB.prepare(`SELECT subject FROM email_threads WHERE id = ?`)
    .bind(threadId)
    .first<{ subject: string }>();
  if (!thread) return null;
  const lastInbound = await env.DB.prepare(
    `SELECT from_addr FROM email_messages
     WHERE thread_id = ? AND direction = 'inbound'
     ORDER BY created_at DESC, id DESC LIMIT 1`,
  )
    .bind(threadId)
    .first<{ from_addr: string }>();
  if (!lastInbound) return null;
  return { to: lastInbound.from_addr, subject: thread.subject };
}

export async function saveOutboundEmail(input: {
  threadId: number;
  adminUserId: number;
  to: string;
  body: string;
  providerId?: string | null;
  adminName?: string;
}): Promise<void> {
  const now = new Date().toISOString().replace(/\.\d{3}Z$/, "Z");
  await env.DB.prepare(
    `INSERT INTO email_messages (thread_id, direction, from_addr, to_addrs, body_text, admin_user_id, provider_id, created_at)
     VALUES (?, 'outbound', 'hello@weallcanada.com', ?, ?, ?, ?, ?)`,
  )
    .bind(
      input.threadId,
      input.to,
      input.body.trim(),
      input.adminUserId,
      input.providerId ?? null,
      now,
    )
    .run();
  await env.DB.prepare(
    `UPDATE email_threads
     SET last_message_at = ?, last_admin_name = COALESCE(?, last_admin_name)
     WHERE id = ?`,
  )
    .bind(now, input.adminName ?? "", input.threadId)
    .run();
}

export async function countActiveStewards(): Promise<number> {
  const row = await env.DB.prepare(`SELECT COUNT(*) AS n FROM users WHERE status = 'active'`).first<{ n: number }>();
  return row?.n ?? 0;
}

export type CampaignRecipient = {
  id: number;
  email: string;
  display_name: string;
};

export async function listActiveStewardEmails(): Promise<CampaignRecipient[]> {
  return listSegmentRecipients({ kind: "all_opted_in" });
}

export async function listSegmentRecipients(segment: {
  kind: string;
  value?: string;
}): Promise<CampaignRecipient[]> {
  const base = `
    SELECT u.id, u.email, COALESCE(p.display_name, u.email) AS display_name
    FROM users u
    JOIN preferences pref ON pref.user_id = u.id
    LEFT JOIN profiles p ON p.user_id = u.id
    WHERE u.status = 'active' AND pref.email_updates = 1`;

  if (segment.kind === "circle" && segment.value) {
    const { results } = await env.DB.prepare(
      `${base}
       AND EXISTS (
         SELECT 1 FROM circle_members cm
         WHERE cm.user_id = u.id AND cm.circle_id = ?
       )
       ORDER BY display_name COLLATE NOCASE`,
    )
      .bind(Number(segment.value))
      .all<CampaignRecipient>();
    return results;
  }

  if (segment.kind === "role" && segment.value) {
    const { results } = await env.DB.prepare(
      `${base}
       AND EXISTS (
         SELECT 1 FROM user_roles ur
         JOIN roles r ON r.id = ur.role_id
         WHERE ur.user_id = u.id AND r.name = ?
       )
       ORDER BY display_name COLLATE NOCASE`,
    )
      .bind(segment.value)
      .all<CampaignRecipient>();
    return results;
  }

  if (segment.kind === "interest" && segment.value) {
    const { results } = await env.DB.prepare(
      `${base}
       AND ('|' || COALESCE(p.interests, '') || '|') LIKE ?
       ORDER BY display_name COLLATE NOCASE`,
    )
      .bind(`%|${segment.value}|%`)
      .all<CampaignRecipient>();
    return results;
  }

  const { results } = await env.DB.prepare(`${base} ORDER BY display_name COLLATE NOCASE`).all<CampaignRecipient>();
  return results;
}

export async function listEmailTemplates(): Promise<
  { id: number; name: string; subject: string; body_html: string; header_variant: string }[]
> {
  const { results } = await env.DB.prepare(
    `SELECT id, name, subject, body_html, header_variant FROM email_templates ORDER BY name COLLATE NOCASE`,
  ).all<{ id: number; name: string; subject: string; body_html: string; header_variant: string }>();
  return results;
}

export async function getEmailTemplate(id: number) {
  return env.DB.prepare(
    `SELECT id, name, subject, body_html, header_variant FROM email_templates WHERE id = ?`,
  )
    .bind(id)
    .first<{ id: number; name: string; subject: string; body_html: string; header_variant: string }>();
}

export async function listCircles(): Promise<{ id: number; name: string; slug: string }[]> {
  const { results } = await env.DB.prepare(
    `SELECT id, name, slug FROM circles WHERE status = 'active' ORDER BY name COLLATE NOCASE`,
  ).all<{ id: number; name: string; slug: string }>();
  return results;
}

export type CampaignRow = {
  id: number;
  name: string;
  subject: string;
  body_text: string;
  body_html: string;
  segment: string;
  status: string;
  campaign_type: string;
  header_variant: string;
  stats_json: string;
  recipient_count: number;
  sent_at: string | null;
  created_at: string;
  updated_at: string;
};

export async function createCampaign(input: {
  name: string;
  subject: string;
  body: string;
  bodyHtml?: string;
  segment?: string;
  campaignType?: string;
  headerVariant?: string;
  createdBy: number;
  recipients: CampaignRecipient[];
  status: "draft" | "sent" | "simulated";
  stats?: Record<string, number>;
}): Promise<number> {
  const now = new Date().toISOString().replace(/\.\d{3}Z$/, "Z");
  const sentAt = input.status === "draft" ? null : now;
  const stats = JSON.stringify(
    input.stats ?? {
      sent: input.status === "draft" ? 0 : input.recipients.length,
      delivered: 0,
      opened: 0,
      clicked: 0,
      bounced: 0,
    },
  );
  const campaign = await env.DB.prepare(
    `INSERT INTO email_campaigns
      (name, subject, body_text, body_html, segment, status, campaign_type, header_variant, stats_json,
       created_by, recipient_count, sent_at, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
     RETURNING id`,
  )
    .bind(
      input.name,
      input.subject,
      input.body,
      input.bodyHtml ?? "",
      input.segment ?? "all_opted_in",
      input.status,
      input.campaignType ?? "marketing",
      input.headerVariant ?? "weall_banner",
      stats,
      input.createdBy,
      input.recipients.length,
      sentAt,
      now,
      now,
    )
    .first<{ id: number }>();
  if (!campaign) throw new Error("Could not create campaign");

  if (input.status !== "draft") {
    for (const r of input.recipients) {
      await env.DB.prepare(
        `INSERT INTO email_campaign_recipients (campaign_id, user_id, email, status)
         VALUES (?, ?, ?, ?)`,
      )
        .bind(campaign.id, r.id, r.email, input.status === "sent" ? "sent" : "simulated")
        .run();
    }
  }
  return campaign.id;
}

export async function updateCampaignDraft(
  id: number,
  input: {
    name: string;
    subject: string;
    body: string;
    bodyHtml: string;
    segment: string;
    campaignType: string;
    headerVariant: string;
  },
): Promise<boolean> {
  const now = new Date().toISOString().replace(/\.\d{3}Z$/, "Z");
  const result = await env.DB.prepare(
    `UPDATE email_campaigns
     SET name = ?, subject = ?, body_text = ?, body_html = ?, segment = ?,
         campaign_type = ?, header_variant = ?, updated_at = ?
     WHERE id = ? AND status = 'draft'`,
  )
    .bind(
      input.name,
      input.subject,
      input.body,
      input.bodyHtml,
      input.segment,
      input.campaignType,
      input.headerVariant,
      now,
      id,
    )
    .run();
  return (result.meta.changes ?? 0) > 0;
}

export async function getCampaign(id: number): Promise<CampaignRow | null> {
  return env.DB.prepare(
    `SELECT id, name, subject, body_text, body_html, segment, status, campaign_type, header_variant,
            stats_json, recipient_count, sent_at, created_at, updated_at
     FROM email_campaigns WHERE id = ?`,
  )
    .bind(id)
    .first<CampaignRow>();
}

export async function listCampaigns(): Promise<CampaignRow[]> {
  const { results } = await env.DB.prepare(
    `SELECT id, name, subject, body_text, body_html, segment, status, campaign_type, header_variant,
            stats_json, recipient_count, sent_at, created_at, updated_at
     FROM email_campaigns
     ORDER BY updated_at DESC, created_at DESC`,
  ).all<CampaignRow>();
  return results;
}

export async function listCampaignRecipients(
  campaignId: number,
): Promise<{ email: string; status: string; display_name: string }[]> {
  const { results } = await env.DB.prepare(
    `SELECT r.email, r.status, COALESCE(p.display_name, r.email) AS display_name
     FROM email_campaign_recipients r
     LEFT JOIN profiles p ON p.user_id = r.user_id
     WHERE r.campaign_id = ?
     ORDER BY display_name COLLATE NOCASE`,
  )
    .bind(campaignId)
    .all<{ email: string; status: string; display_name: string }>();
  return results;
}

export async function listUserCircles(
  userId: number,
): Promise<{ id: number; slug: string; name: string; color_token: string; role: string }[]> {
  const { results } = await env.DB.prepare(
    `SELECT c.id, c.slug, c.name, c.color_token, cm.role
     FROM circle_members cm
     JOIN circles c ON c.id = cm.circle_id
     WHERE cm.user_id = ?
     ORDER BY c.name COLLATE NOCASE`,
  )
    .bind(userId)
    .all<{ id: number; slug: string; name: string; color_token: string; role: string }>();
  return results;
}

export async function getCircleBySlug(slug: string, userId: number): Promise<CircleRow | null> {
  return (
    (await env.DB.prepare(
      `SELECT c.id, c.slug, c.name, c.color_token, c.status, c.description,
              COALESCE(c.welcome_note, '') AS welcome_note,
              COALESCE(c.resources_blurb, '') AS resources_blurb,
              (SELECT COUNT(*) FROM circle_members cm2 WHERE cm2.circle_id = c.id) AS member_count,
              cm.role AS membership,
              CASE WHEN jr.id IS NULL THEN 0 ELSE 1 END AS pending_request
       FROM circles c
       LEFT JOIN circle_members cm ON cm.circle_id = c.id AND cm.user_id = ?
       LEFT JOIN circle_join_requests jr
         ON jr.circle_id = c.id AND jr.user_id = ? AND jr.status = 'pending'
       WHERE c.slug = ?`,
    )
      .bind(userId, userId, slug)
      .first<CircleRow>()) ?? null
  );
}

export async function updateCircleDetails(
  circleId: number,
  input: {
    name: string;
    description: string;
    welcomeNote: string;
    resourcesBlurb: string;
    status: "active" | "dormant";
    colorToken: string;
  },
): Promise<{ ok: true; name: string } | { ok: false; error: string }> {
  const name = input.name.trim();
  if (!name) return { ok: false, error: "Name is required." };
  if (!(CIRCLE_COLOR_TOKENS as readonly string[]).includes(input.colorToken)) {
    return { ok: false, error: "Invalid circle colour." };
  }
  if (!["active", "dormant"].includes(input.status)) {
    return { ok: false, error: "Invalid status." };
  }

  const now = new Date().toISOString().replace(/\.\d{3}Z$/, "Z");
  const result = await env.DB.prepare(
    `UPDATE circles
     SET name = ?, description = ?, welcome_note = ?, resources_blurb = ?,
         status = ?, color_token = ?, updated_at = ?
     WHERE id = ?`,
  )
    .bind(
      name.slice(0, 120),
      input.description.trim().slice(0, 1000),
      input.welcomeNote.trim().slice(0, 4000),
      input.resourcesBlurb.trim().slice(0, 1000),
      input.status,
      input.colorToken,
      now,
      circleId,
    )
    .run();

  if (!result.meta.changes) return { ok: false, error: "Circle not found." };
  return { ok: true, name };
}

export async function setCircleMemberRole(
  circleId: number,
  targetUserId: number,
  role: "member" | "lead",
  actorId: number,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const membership = await env.DB.prepare(
    `SELECT role FROM circle_members WHERE circle_id = ? AND user_id = ?`,
  )
    .bind(circleId, targetUserId)
    .first<{ role: string }>();
  if (!membership) return { ok: false, error: "That person is not in this circle." };

  if (membership.role === "lead" && role === "member") {
    const leads = await env.DB.prepare(
      `SELECT COUNT(*) AS n FROM circle_members WHERE circle_id = ? AND role = 'lead'`,
    )
      .bind(circleId)
      .first<{ n: number }>();
    if ((leads?.n ?? 0) <= 1) {
      return { ok: false, error: "Keep at least one circle lead." };
    }
    if (targetUserId === actorId) {
      // Allow self-demotion only when another lead remains (checked above).
    }
  }

  await env.DB.prepare(
    `UPDATE circle_members SET role = ? WHERE circle_id = ? AND user_id = ?`,
  )
    .bind(role, circleId, targetUserId)
    .run();
  return { ok: true };
}

export async function removeCircleMember(
  circleId: number,
  targetUserId: number,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const membership = await env.DB.prepare(
    `SELECT role FROM circle_members WHERE circle_id = ? AND user_id = ?`,
  )
    .bind(circleId, targetUserId)
    .first<{ role: string }>();
  if (!membership) return { ok: false, error: "That person is not in this circle." };

  if (membership.role === "lead") {
    const leads = await env.DB.prepare(
      `SELECT COUNT(*) AS n FROM circle_members WHERE circle_id = ? AND role = 'lead'`,
    )
      .bind(circleId)
      .first<{ n: number }>();
    if ((leads?.n ?? 0) <= 1) {
      return { ok: false, error: "Promote another lead before removing the last lead." };
    }
  }

  await env.DB.prepare(`DELETE FROM circle_members WHERE circle_id = ? AND user_id = ?`)
    .bind(circleId, targetUserId)
    .run();
  return { ok: true };
}

export async function listCircleMembers(
  circleId: number,
): Promise<{ user_id: number; display_name: string; role: string }[]> {
  const { results } = await env.DB.prepare(
    `SELECT cm.user_id, COALESCE(NULLIF(p.display_name, ''), u.email) AS display_name, cm.role
     FROM circle_members cm
     JOIN users u ON u.id = cm.user_id
     LEFT JOIN profiles p ON p.user_id = u.id
     WHERE cm.circle_id = ?
     ORDER BY CASE cm.role WHEN 'lead' THEN 0 ELSE 1 END, display_name COLLATE NOCASE`,
  )
    .bind(circleId)
    .all<{ user_id: number; display_name: string; role: string }>();
  return results;
}

export type CircleResourceRow = {
  id: number;
  title: string;
  url: string;
  note: string;
  created_at: string;
  created_by_name: string;
};

export type CircleDecisionRow = {
  id: number;
  title: string;
  detail: string;
  decided_at: string;
  created_by_name: string;
};

export async function listCircleResources(circleId: number): Promise<CircleResourceRow[]> {
  const { results } = await env.DB.prepare(
    `SELECT cr.id, cr.title, cr.url, cr.note, cr.created_at,
            COALESCE(NULLIF(p.display_name, ''), u.email) AS created_by_name
     FROM circle_resources cr
     JOIN users u ON u.id = cr.created_by
     LEFT JOIN profiles p ON p.user_id = u.id
     WHERE cr.circle_id = ?
     ORDER BY cr.created_at DESC, cr.id DESC`,
  )
    .bind(circleId)
    .all<CircleResourceRow>();
  return results;
}

export async function addCircleResource(input: {
  circleId: number;
  title: string;
  url: string;
  note: string;
  createdBy: number;
}): Promise<number> {
  const row = await env.DB.prepare(
    `INSERT INTO circle_resources (circle_id, title, url, note, created_by)
     VALUES (?, ?, ?, ?, ?)
     RETURNING id`,
  )
    .bind(input.circleId, input.title, input.url, input.note, input.createdBy)
    .first<{ id: number }>();
  if (!row) throw new Error("Could not add resource");
  return row.id;
}

export async function listCircleDecisions(circleId: number): Promise<CircleDecisionRow[]> {
  const { results } = await env.DB.prepare(
    `SELECT cd.id, cd.title, cd.detail, cd.decided_at,
            COALESCE(NULLIF(p.display_name, ''), u.email) AS created_by_name
     FROM circle_decisions cd
     JOIN users u ON u.id = cd.created_by
     LEFT JOIN profiles p ON p.user_id = u.id
     WHERE cd.circle_id = ?
     ORDER BY cd.decided_at DESC, cd.id DESC`,
  )
    .bind(circleId)
    .all<CircleDecisionRow>();
  return results;
}

export async function addCircleDecision(input: {
  circleId: number;
  title: string;
  detail: string;
  decidedAt: string;
  createdBy: number;
}): Promise<number> {
  const row = await env.DB.prepare(
    `INSERT INTO circle_decisions (circle_id, title, detail, decided_at, created_by)
     VALUES (?, ?, ?, ?, ?)
     RETURNING id`,
  )
    .bind(input.circleId, input.title, input.detail, input.decidedAt, input.createdBy)
    .first<{ id: number }>();
  if (!row) throw new Error("Could not add decision");
  return row.id;
}

export async function userIsCircleMember(circleId: number, userId: number): Promise<boolean> {
  const row = await env.DB.prepare(
    `SELECT 1 AS ok FROM circle_members WHERE circle_id = ? AND user_id = ?`,
  )
    .bind(circleId, userId)
    .first<{ ok: number }>();
  return !!row;
}

export type KnowledgeItemRow = {
  id: number;
  title: string;
  summary: string;
  url: string;
  body_text: string;
  tags: string;
  created_at: string;
  created_by_name: string;
};

export async function listKnowledgeItems(q = ""): Promise<KnowledgeItemRow[]> {
  const query = q.trim().toLowerCase();
  const like = `%${query}%`;
  const { results } = await env.DB.prepare(
    query
      ? `SELECT k.id, k.title, k.summary, k.url, k.body_text, k.tags, k.created_at,
                COALESCE(NULLIF(p.display_name, ''), u.email) AS created_by_name
         FROM knowledge_items k
         JOIN users u ON u.id = k.created_by
         LEFT JOIN profiles p ON p.user_id = u.id
         WHERE lower(k.title) LIKE ?
            OR lower(k.summary) LIKE ?
            OR lower(k.body_text) LIKE ?
            OR lower(k.tags) LIKE ?
         ORDER BY k.created_at DESC, k.id DESC`
      : `SELECT k.id, k.title, k.summary, k.url, k.body_text, k.tags, k.created_at,
                COALESCE(NULLIF(p.display_name, ''), u.email) AS created_by_name
         FROM knowledge_items k
         JOIN users u ON u.id = k.created_by
         LEFT JOIN profiles p ON p.user_id = u.id
         ORDER BY k.created_at DESC, k.id DESC`,
  )
    .bind(...(query ? [like, like, like, like] : []))
    .all<KnowledgeItemRow>();
  return results;
}

export async function addKnowledgeItem(input: {
  title: string;
  summary: string;
  url: string;
  bodyText: string;
  tags: string;
  createdBy: number;
}): Promise<number> {
  const row = await env.DB.prepare(
    `INSERT INTO knowledge_items (title, summary, url, body_text, tags, created_by)
     VALUES (?, ?, ?, ?, ?, ?)
     RETURNING id`,
  )
    .bind(input.title, input.summary, input.url, input.bodyText, input.tags, input.createdBy)
    .first<{ id: number }>();
  if (!row) throw new Error("Could not add knowledge item");
  return row.id;
}

export type EventRow = {
  id: number;
  title: string;
  description: string;
  starts_at: string;
  ends_at: string | null;
  location: string;
  visibility: string;
  circle_name: string | null;
  rsvp: string | null;
  going_count: number;
  interested_count: number;
  maybe_count: number;
  going_names: string[];
};

export async function listEventsForUser(userId: number): Promise<EventRow[]> {
  const { results } = await env.DB.prepare(
    `SELECT e.id, e.title, e.description, e.starts_at, e.ends_at, e.location, e.visibility,
            c.name AS circle_name, r.status AS rsvp,
            (SELECT COUNT(*) FROM event_rsvps g WHERE g.event_id = e.id AND g.status = 'going') AS going_count,
            (SELECT COUNT(*) FROM event_rsvps i WHERE i.event_id = e.id AND i.status = 'interested') AS interested_count,
            (SELECT COUNT(*) FROM event_rsvps m WHERE m.event_id = e.id AND m.status = 'maybe') AS maybe_count
     FROM events e
     LEFT JOIN circles c ON c.id = e.circle_id
     LEFT JOIN event_rsvps r ON r.event_id = e.id AND r.user_id = ?
     WHERE e.visibility IN ('public', 'stewards')
        OR (e.visibility = 'circle' AND e.circle_id IN (
              SELECT circle_id FROM circle_members WHERE user_id = ?
            ))
     ORDER BY e.starts_at ASC`,
  )
    .bind(userId, userId)
    .all<Omit<EventRow, "going_names"> & { going_count: number; interested_count: number; maybe_count: number }>();

  const events: EventRow[] = [];
  for (const row of results) {
    const { results: names } = await env.DB.prepare(
      `SELECT COALESCE(NULLIF(p.display_name, ''), u.email) AS display_name
       FROM event_rsvps r
       JOIN users u ON u.id = r.user_id
       LEFT JOIN profiles p ON p.user_id = u.id
       WHERE r.event_id = ? AND r.status = 'going'
       ORDER BY display_name COLLATE NOCASE
       LIMIT 12`,
    )
      .bind(row.id)
      .all<{ display_name: string }>();
    events.push({
      ...row,
      going_names: names.map((n) => n.display_name),
    });
  }
  return events;
}

export async function createEvent(input: {
  title: string;
  description: string;
  startsAt: string;
  endsAt: string | null;
  location: string;
  visibility: "public" | "stewards" | "circle";
  circleId: number | null;
  createdBy: number;
}): Promise<number> {
  const row = await env.DB.prepare(
    `INSERT INTO events (title, description, starts_at, ends_at, location, visibility, circle_id, created_by)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)
     RETURNING id`,
  )
    .bind(
      input.title,
      input.description,
      input.startsAt,
      input.endsAt,
      input.location,
      input.visibility,
      input.circleId,
      input.createdBy,
    )
    .first<{ id: number }>();
  if (!row) throw new Error("Could not create event");
  return row.id;
}

export async function upsertRsvp(
  eventId: number,
  userId: number,
  status: "going" | "interested" | "maybe" | "cancelled",
): Promise<void> {
  await env.DB.prepare(
    `INSERT INTO event_rsvps (event_id, user_id, status)
     VALUES (?, ?, ?)
     ON CONFLICT(event_id, user_id) DO UPDATE SET status = excluded.status`,
  )
    .bind(eventId, userId, status)
    .run();
}

export async function listFaqs(): Promise<{ id: number; question: string; answer: string }[]> {
  const { results } = await env.DB.prepare(
    `SELECT id, question, answer FROM faqs
     ORDER BY CASE WHEN trim(answer) = '' THEN 0 ELSE 1 END, sort_order ASC, id ASC`,
  ).all<{ id: number; question: string; answer: string }>();
  return results;
}

export async function upsertFaq(input: {
  id?: number;
  question: string;
  answer: string;
  userId: number;
}): Promise<void> {
  const now = new Date().toISOString().replace(/\.\d{3}Z$/, "Z");
  if (input.id) {
    await env.DB.prepare(
      `UPDATE faqs SET question = ?, answer = ?, updated_by = ?, updated_at = ? WHERE id = ?`,
    )
      .bind(input.question, input.answer, input.userId, now, input.id)
      .run();
    return;
  }
  await env.DB.prepare(
    `INSERT INTO faqs (question, answer, sort_order, updated_by, updated_at)
     VALUES (?, ?, ?, ?, ?)`,
  )
    .bind(input.question, input.answer, input.answer.trim() ? 100 : 40, input.userId, now)
    .run();
}

/** Record a steward page view (skip admin routes — Festival excludes admin traffic). */
export async function recordPageView(path: string, userId: number | null): Promise<void> {
  const clean = path.split("?")[0].slice(0, 200);
  if (!clean.startsWith("/stewards")) return;
  if (clean.startsWith("/stewards/admin")) return;
  await env.DB.prepare(`INSERT INTO page_views (path, user_id) VALUES (?, ?)`).bind(clean, userId).run();
}

export type AnalyticsSnapshot = {
  activeStewards: number;
  pendingApplications: number;
  directoryVisible: number;
  openInboxThreads: number;
  connectionsTotal: number;
  circleMemberships: number;
  campaignsSent: number;
  eventsTotal: number;
  pageViewsPeriod: number;
  pageViewsToday: number;
  newStewardsPeriod: number;
  applicationsPeriod: number;
  stewardMessagesPeriod: number;
  emailRepliesPeriod: number;
  rsvpsPeriod: number;
  series: {
    newStewards: { day: string; value: number }[];
    pageViews: { day: string; value: number }[];
    stewardMessages: { day: string; value: number }[];
    applications: { day: string; value: number }[];
  };
  topPaths: { path: string; view_count: number }[];
  circleSizes: { label: string; count: number }[];
  interests: { label: string; count: number }[];
  connectionStrengths: { label: string; count: number }[];
  rsvpBuckets: { label: string; count: number }[];
  rsvpStats: {
    stewardCount: number;
    withRsvp: number;
    totalRsvps: number;
    average: number;
  };
};

async function daySeries(
  sql: string,
  startIso: string | null,
): Promise<{ day: string; value: number }[]> {
  const stmt = startIso
    ? env.DB.prepare(sql.replace("/*RANGE*/", "AND created_at >= ?")).bind(startIso)
    : env.DB.prepare(sql.replace("/*RANGE*/", ""));
  const { results } = await stmt.all<{ day: string; value: number }>();
  return results.map((r) => ({ day: String(r.day).slice(0, 10), value: Number(r.value) || 0 }));
}

export async function getAnalyticsSnapshot(startIso: string | null): Promise<AnalyticsSnapshot> {
  const rangeClause = startIso ? "AND created_at >= ?" : "";

  const activeStewards =
    (
      await env.DB.prepare(`SELECT COUNT(*) AS n FROM users WHERE status = 'active'`).first<{ n: number }>()
    )?.n ?? 0;
  const pendingApplications =
    (
      await env.DB.prepare(
        `SELECT COUNT(*) AS n FROM applications WHERE status = 'pending'`,
      ).first<{ n: number }>()
    )?.n ?? 0;
  const directoryVisible =
    (
      await env.DB.prepare(
        `SELECT COUNT(*) AS n
         FROM users u
         JOIN preferences pref ON pref.user_id = u.id
         JOIN profiles p ON p.user_id = u.id
         WHERE u.status = 'active' AND pref.allow_directory = 1 AND p.visibility != 'private'`,
      ).first<{ n: number }>()
    )?.n ?? 0;
  const openInboxThreads =
    (
      await env.DB.prepare(`SELECT COUNT(*) AS n FROM email_threads WHERE status = 'open'`).first<{
        n: number;
      }>()
    )?.n ?? 0;
  const connectionsTotal =
    (await env.DB.prepare(`SELECT COUNT(*) AS n FROM connections`).first<{ n: number }>())?.n ?? 0;
  const circleMemberships =
    (await env.DB.prepare(`SELECT COUNT(*) AS n FROM circle_members`).first<{ n: number }>())?.n ?? 0;
  const campaignsSent =
    (
      await env.DB.prepare(
        `SELECT COUNT(*) AS n FROM email_campaigns WHERE status IN ('sent', 'simulated')`,
      ).first<{ n: number }>()
    )?.n ?? 0;
  const eventsTotal =
    (await env.DB.prepare(`SELECT COUNT(*) AS n FROM events`).first<{ n: number }>())?.n ?? 0;

  const today = new Date().toISOString().slice(0, 10) + "T00:00:00Z";

  const pageViewsPeriod = startIso
    ? (
        await env.DB.prepare(`SELECT COUNT(*) AS n FROM page_views WHERE created_at >= ?`)
          .bind(startIso)
          .first<{ n: number }>()
      )?.n ?? 0
    : (await env.DB.prepare(`SELECT COUNT(*) AS n FROM page_views`).first<{ n: number }>())?.n ?? 0;

  const pageViewsToday =
    (
      await env.DB.prepare(`SELECT COUNT(*) AS n FROM page_views WHERE created_at >= ?`)
        .bind(today)
        .first<{ n: number }>()
    )?.n ?? 0;

  const newStewardsPeriod = startIso
    ? (
        await env.DB.prepare(
          `SELECT COUNT(*) AS n FROM users WHERE status = 'active' AND created_at >= ?`,
        )
          .bind(startIso)
          .first<{ n: number }>()
      )?.n ?? 0
    : activeStewards;

  const applicationsPeriod = startIso
    ? (
        await env.DB.prepare(`SELECT COUNT(*) AS n FROM applications WHERE created_at >= ?`)
          .bind(startIso)
          .first<{ n: number }>()
      )?.n ?? 0
    : (await env.DB.prepare(`SELECT COUNT(*) AS n FROM applications`).first<{ n: number }>())?.n ?? 0;

  const stewardMessagesPeriod = startIso
    ? (
        await env.DB.prepare(`SELECT COUNT(*) AS n FROM steward_messages WHERE created_at >= ?`)
          .bind(startIso)
          .first<{ n: number }>()
      )?.n ?? 0
    : (
        await env.DB.prepare(`SELECT COUNT(*) AS n FROM steward_messages`).first<{ n: number }>()
      )?.n ?? 0;

  const emailRepliesPeriod = startIso
    ? (
        await env.DB.prepare(
          `SELECT COUNT(*) AS n FROM email_messages WHERE direction = 'outbound' AND created_at >= ?`,
        )
          .bind(startIso)
          .first<{ n: number }>()
      )?.n ?? 0
    : (
        await env.DB.prepare(
          `SELECT COUNT(*) AS n FROM email_messages WHERE direction = 'outbound'`,
        ).first<{ n: number }>()
      )?.n ?? 0;

  const newStewards = await daySeries(
    `SELECT substr(created_at, 1, 10) AS day, COUNT(*) AS value
     FROM users WHERE status = 'active' /*RANGE*/
     GROUP BY day ORDER BY day`,
    startIso,
  );
  const pageViews = await daySeries(
    `SELECT substr(created_at, 1, 10) AS day, COUNT(*) AS value
     FROM page_views WHERE 1=1 /*RANGE*/
     GROUP BY day ORDER BY day`,
    startIso,
  );
  const stewardMessages = await daySeries(
    `SELECT substr(created_at, 1, 10) AS day, COUNT(*) AS value
     FROM steward_messages WHERE 1=1 /*RANGE*/
     GROUP BY day ORDER BY day`,
    startIso,
  );
  const applications = await daySeries(
    `SELECT substr(created_at, 1, 10) AS day, COUNT(*) AS value
     FROM applications WHERE 1=1 /*RANGE*/
     GROUP BY day ORDER BY day`,
    startIso,
  );

  const topPathStmt = startIso
    ? env.DB.prepare(
        `SELECT path, COUNT(*) AS view_count FROM page_views
         WHERE created_at >= ? GROUP BY path ORDER BY view_count DESC LIMIT 10`,
      ).bind(startIso)
    : env.DB.prepare(
        `SELECT path, COUNT(*) AS view_count FROM page_views
         GROUP BY path ORDER BY view_count DESC LIMIT 10`,
      );
  const { results: topPaths } = await topPathStmt.all<{ path: string; view_count: number }>();

  const { results: circleSizes } = await env.DB.prepare(
    `SELECT c.name AS label, COUNT(cm.user_id) AS count
     FROM circles c
     LEFT JOIN circle_members cm ON cm.circle_id = c.id
     WHERE c.status = 'active'
     GROUP BY c.id
     ORDER BY count DESC, c.name COLLATE NOCASE`,
  ).all<{ label: string; count: number }>();

  const { results: interestRows } = await env.DB.prepare(
    `SELECT p.interests FROM users u
     JOIN profiles p ON p.user_id = u.id
     WHERE u.status = 'active' AND p.interests != ''`,
  ).all<{ interests: string }>();
  const interestMap = new Map<string, number>();
  for (const row of interestRows) {
    for (const part of (row.interests || "").split("|")) {
      const label = part.trim();
      if (!label) continue;
      interestMap.set(label, (interestMap.get(label) ?? 0) + 1);
    }
  }
  const interests = [...interestMap.entries()]
    .map(([label, count]) => ({ label, count }))
    .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label))
    .slice(0, 12);

  const { results: strengthRows } = await env.DB.prepare(
    `SELECT strength AS label, COUNT(*) AS count FROM connections GROUP BY strength ORDER BY strength`,
  ).all<{ label: number; count: number }>();
  const connectionStrengths = strengthRows.map((r) => ({
    label: `Strength ${r.label}`,
    count: r.count,
  }));

  const { results: rsvpCounts } = await env.DB.prepare(
    `SELECT u.id, COUNT(r.event_id) AS n
     FROM users u
     LEFT JOIN event_rsvps r ON r.user_id = u.id
     WHERE u.status = 'active'
     GROUP BY u.id`,
  ).all<{ id: number; n: number }>();
  const bucketsDef = [
    { label: "0", min: 0, max: 0 },
    { label: "1", min: 1, max: 1 },
    { label: "2", min: 2, max: 2 },
    { label: "3–4", min: 3, max: 4 },
    { label: "5+", min: 5, max: 999 },
  ];
  const rsvpBuckets = bucketsDef.map((b) => ({
    label: b.label,
    count: rsvpCounts.filter((r) => r.n >= b.min && r.n <= b.max).length,
  }));
  const withRsvp = rsvpCounts.filter((r) => r.n > 0).length;
  const totalRsvps = rsvpCounts.reduce((sum, r) => sum + r.n, 0);
  const stewardCount = rsvpCounts.length || 1;
  void rangeClause;

  return {
    activeStewards,
    pendingApplications,
    directoryVisible,
    openInboxThreads,
    connectionsTotal,
    circleMemberships,
    campaignsSent,
    eventsTotal,
    pageViewsPeriod,
    pageViewsToday,
    newStewardsPeriod,
    applicationsPeriod,
    stewardMessagesPeriod,
    emailRepliesPeriod,
    rsvpsPeriod: totalRsvps,
    series: { newStewards, pageViews, stewardMessages, applications },
    topPaths,
    circleSizes,
    interests,
    connectionStrengths,
    rsvpBuckets,
    rsvpStats: {
      stewardCount: rsvpCounts.length,
      withRsvp,
      totalRsvps,
      average: totalRsvps / stewardCount,
    },
  };
}

function nowIso() {
  return new Date().toISOString().replace(/\.\d{3}Z$/, "Z");
}

export async function logActivity(input: {
  actorId: number | null;
  action: string;
  subjectType?: string;
  subjectId?: string;
  detail?: string;
}): Promise<void> {
  try {
    await env.DB.prepare(
      `INSERT INTO activity_log (actor_id, action, subject_type, subject_id, detail, created_at)
       VALUES (?, ?, ?, ?, ?, ?)`,
    )
      .bind(
        input.actorId,
        input.action.slice(0, 80),
        (input.subjectType ?? "").slice(0, 40),
        (input.subjectId ?? "").slice(0, 40),
        (input.detail ?? "").slice(0, 500),
        nowIso(),
      )
      .run();
  } catch {
    // Activity logging must never break the main action (e.g. before migration).
  }
}

export type ActivityRow = {
  id: number;
  actor_id: number | null;
  actor_name: string;
  action: string;
  subject_type: string;
  subject_id: string;
  detail: string;
  created_at: string;
};

export async function listActivity(limit = 80): Promise<ActivityRow[]> {
  const { results } = await env.DB.prepare(
    `SELECT a.id, a.actor_id, a.action, a.subject_type, a.subject_id, a.detail, a.created_at,
            COALESCE(NULLIF(p.display_name, ''), u.email, 'System') AS actor_name
     FROM activity_log a
     LEFT JOIN users u ON u.id = a.actor_id
     LEFT JOIN profiles p ON p.user_id = u.id
     ORDER BY a.created_at DESC, a.id DESC
     LIMIT ?`,
  )
    .bind(limit)
    .all<ActivityRow>();
  return results;
}

export type SurveyOptionKind = "sector" | "interest";

export type SurveyOptionRow = {
  id: number;
  kind: SurveyOptionKind;
  label: string;
  sort_order: number;
  active: number;
};

export async function listSurveyOptions(
  kind?: SurveyOptionKind,
  includeInactive = false,
): Promise<SurveyOptionRow[]> {
  const clauses: string[] = [];
  const binds: (string | number)[] = [];
  if (kind) {
    clauses.push("kind = ?");
    binds.push(kind);
  }
  if (!includeInactive) {
    clauses.push("active = 1");
  }
  const where = clauses.length ? `WHERE ${clauses.join(" AND ")}` : "";
  const { results } = await env.DB.prepare(
    `SELECT id, kind, label, sort_order, active
     FROM survey_options
     ${where}
     ORDER BY kind, sort_order ASC, id ASC`,
  )
    .bind(...binds)
    .all<SurveyOptionRow>();
  return results;
}

export async function getSurveyLabels(kind: SurveyOptionKind): Promise<string[]> {
  try {
    const rows = await listSurveyOptions(kind, false);
    if (rows.length > 0) return rows.map((r) => r.label);
  } catch {
    // fall through to empty — callers use hardcoded defaults
  }
  return [];
}

export async function addSurveyOption(
  kind: SurveyOptionKind,
  label: string,
  actorId: number,
): Promise<{ ok: true; id: number } | { ok: false; error: string }> {
  const clean = label.trim().slice(0, 80);
  if (!clean) return { ok: false, error: "Label is required." };
  const maxSort = await env.DB.prepare(
    `SELECT COALESCE(MAX(sort_order), 0) AS n FROM survey_options WHERE kind = ? AND label != 'Other'`,
  )
    .bind(kind)
    .first<{ n: number }>();
  try {
    const row = await env.DB.prepare(
      `INSERT INTO survey_options (kind, label, sort_order, active, created_at)
       VALUES (?, ?, ?, 1, ?)
       RETURNING id`,
    )
      .bind(kind, clean, (maxSort?.n ?? 0) + 10, nowIso())
      .first<{ id: number }>();
    if (!row) return { ok: false, error: "Could not add option." };
    await logActivity({
      actorId,
      action: "survey.option_added",
      subjectType: "survey_option",
      subjectId: String(row.id),
      detail: `Added ${kind} option “${clean}”.`,
    });
    return { ok: true, id: row.id };
  } catch {
    return { ok: false, error: "That option already exists." };
  }
}

export async function setSurveyOptionActive(
  id: number,
  active: boolean,
  actorId: number,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const row = await env.DB.prepare(`SELECT id, kind, label FROM survey_options WHERE id = ?`)
    .bind(id)
    .first<{ id: number; kind: string; label: string }>();
  if (!row) return { ok: false, error: "Option not found." };
  if (row.label === "Other" && !active) {
    return { ok: false, error: "Keep the “Other” option available." };
  }
  await env.DB.prepare(`UPDATE survey_options SET active = ? WHERE id = ?`)
    .bind(active ? 1 : 0, id)
    .run();
  await logActivity({
    actorId,
    action: active ? "survey.option_enabled" : "survey.option_disabled",
    subjectType: "survey_option",
    subjectId: String(id),
    detail: `${active ? "Enabled" : "Disabled"} ${row.kind} option “${row.label}”.`,
  });
  return { ok: true };
}

export async function getSiteSettings(keys: string[]): Promise<Record<string, string>> {
  if (keys.length === 0) return {};
  const placeholders = keys.map(() => "?").join(", ");
  try {
    const { results } = await env.DB.prepare(
      `SELECT key, value FROM site_settings WHERE key IN (${placeholders})`,
    )
      .bind(...keys)
      .all<{ key: string; value: string }>();
    const out: Record<string, string> = {};
    for (const row of results) out[row.key] = row.value;
    return out;
  } catch {
    return {};
  }
}

export async function getSiteSetting(key: string, fallback = ""): Promise<string> {
  const map = await getSiteSettings([key]);
  return map[key] ?? fallback;
}

export async function setSiteSettings(
  updates: Record<string, string>,
  actorId: number,
): Promise<void> {
  const stamp = nowIso();
  for (const [key, value] of Object.entries(updates)) {
    await env.DB.prepare(
      `INSERT INTO site_settings (key, value, updated_at, updated_by)
       VALUES (?, ?, ?, ?)
       ON CONFLICT(key) DO UPDATE SET
         value = excluded.value,
         updated_at = excluded.updated_at,
         updated_by = excluded.updated_by`,
    )
      .bind(key.slice(0, 80), value.slice(0, 8000), stamp, actorId)
      .run();
  }
  await logActivity({
    actorId,
    action: "settings.updated",
    subjectType: "site_settings",
    subjectId: Object.keys(updates).join(",").slice(0, 40),
    detail: `Updated settings: ${Object.keys(updates).join(", ")}.`,
  });
}

export type DashboardBundle = {
  threads: { id: number; other_name: string; preview: string; last_message_at: string }[];
  commons: { id: number; title: string; summary: string }[];
  pendingApplications: number;
  pendingCircleJoins: number;
};

export async function getDashboardBundle(userId: number, isAdmin: boolean): Promise<DashboardBundle> {
  const threads = (await listStewardThreads(userId)).slice(0, 4).map((t) => ({
    id: t.id,
    other_name: t.other_name,
    preview: t.preview,
    last_message_at: t.last_message_at,
  }));
  let commons: { id: number; title: string; summary: string }[] = [];
  try {
    commons = (await listKnowledgeItems("")).slice(0, 3).map((k) => ({
      id: k.id,
      title: k.title,
      summary: k.summary,
    }));
  } catch {
    commons = [];
  }
  let pendingApplications = 0;
  let pendingCircleJoins = 0;
  if (isAdmin) {
    pendingApplications = (await listPendingApplications()).length;
    pendingCircleJoins = (await listPendingCircleJoins()).length;
  }
  return { threads, commons, pendingApplications, pendingCircleJoins };
}
