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
    `SELECT u.id, p.display_name, p.bio, p.location, p.partner_org, p.regions, p.sector, p.interests
     FROM users u
     JOIN profiles p ON p.user_id = u.id
     JOIN preferences pref ON pref.user_id = u.id
     WHERE ${clauses.join(" AND ")}
     ORDER BY p.display_name COLLATE NOCASE ASC`,
  );
  const { results } = binds.length ? await stmt.bind(...binds).all<DirectorySteward>() : await stmt.all<DirectorySteward>();
  return results;
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
}

export async function getProfileBundle(userId: number): Promise<ProfileBundle | null> {
  return env.DB.prepare(
    `SELECT p.display_name, p.bio, p.location, p.partner_org, p.visibility,
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
         updated_at = ?
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
  member_count: number;
  membership: string | null;
  pending_request: number;
}

export async function listCirclesForUser(userId: number): Promise<CircleRow[]> {
  const { results } = await env.DB.prepare(
    `SELECT c.id, c.slug, c.name, c.color_token, c.status, c.description,
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
  { id: number; other_id: number; display_name: string; strength: number; reason: string; direction: string }[]
> {
  const { results } = await env.DB.prepare(
    `SELECT c.id, c.strength, c.reason,
            CASE WHEN c.from_user_id = ? THEN c.to_user_id ELSE c.from_user_id END AS other_id,
            p.display_name,
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
  { id: number; last_message_at: string; other_name: string; preview: string }[]
> {
  const { results } = await env.DB.prepare(
    `SELECT t.id, t.last_message_at,
            COALESCE(p.display_name, u.email) AS other_name,
            COALESCE((
              SELECT m.body FROM steward_messages m
              WHERE m.thread_id = t.id
              ORDER BY m.created_at DESC, m.id DESC LIMIT 1
            ), '') AS preview
     FROM steward_threads t
     JOIN steward_thread_participants me ON me.thread_id = t.id AND me.user_id = ?
     JOIN steward_thread_participants other ON other.thread_id = t.id AND other.user_id != ?
     JOIN users u ON u.id = other.user_id
     LEFT JOIN profiles p ON p.user_id = other.user_id
     ORDER BY t.last_message_at DESC`,
  )
    .bind(userId, userId)
    .all<{ id: number; last_message_at: string; other_name: string; preview: string }>();
  return results;
}

export async function listStewardMessages(
  threadId: number,
  userId: number,
): Promise<{ id: number; from_user_id: number; body: string; created_at: string; display_name: string }[]> {
  const member = await env.DB.prepare(
    `SELECT 1 AS ok FROM steward_thread_participants WHERE thread_id = ? AND user_id = ?`,
  )
    .bind(threadId, userId)
    .first();
  if (!member) return [];

  const { results } = await env.DB.prepare(
    `SELECT m.id, m.from_user_id, m.body, m.created_at, COALESCE(p.display_name, u.email) AS display_name
     FROM steward_messages m
     JOIN users u ON u.id = m.from_user_id
     LEFT JOIN profiles p ON p.user_id = m.from_user_id
     WHERE m.thread_id = ?
     ORDER BY m.created_at ASC, m.id ASC`,
  )
    .bind(threadId)
    .all<{ id: number; from_user_id: number; body: string; created_at: string; display_name: string }>();
  return results;
}

export async function userCanMessage(userId: number): Promise<boolean> {
  const row = await env.DB.prepare(`SELECT allow_messages FROM preferences WHERE user_id = ?`)
    .bind(userId)
    .first<{ allow_messages: number }>();
  return !!row?.allow_messages;
}

export async function listEmailThreads(): Promise<
  { id: number; subject: string; status: string; last_message_at: string; preview: string }[]
> {
  const { results } = await env.DB.prepare(
    `SELECT t.id, t.subject, t.status, t.last_message_at,
            COALESCE((
              SELECT m.body_text FROM email_messages m
              WHERE m.thread_id = t.id
              ORDER BY m.created_at DESC, m.id DESC LIMIT 1
            ), '') AS preview
     FROM email_threads t
     ORDER BY t.last_message_at DESC`,
  ).all<{ id: number; subject: string; status: string; last_message_at: string; preview: string }>();
  return results;
}

export async function getEmailThread(threadId: number): Promise<{
  thread: { id: number; subject: string; status: string } | null;
  messages: {
    id: number;
    direction: string;
    from_addr: string;
    to_addrs: string;
    body_text: string;
    created_at: string;
  }[];
}> {
  const thread = await env.DB.prepare(`SELECT id, subject, status FROM email_threads WHERE id = ?`)
    .bind(threadId)
    .first<{ id: number; subject: string; status: string }>();
  if (!thread) return { thread: null, messages: [] };
  const { results } = await env.DB.prepare(
    `SELECT id, direction, from_addr, to_addrs, body_text, created_at
     FROM email_messages WHERE thread_id = ?
     ORDER BY created_at ASC, id ASC`,
  )
    .bind(threadId)
    .all<{
      id: number;
      direction: string;
      from_addr: string;
      to_addrs: string;
      body_text: string;
      created_at: string;
    }>();
  return { thread, messages: results };
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
  await env.DB.prepare(`UPDATE email_threads SET last_message_at = ? WHERE id = ?`)
    .bind(now, input.threadId)
    .run();
}

export async function countActiveStewards(): Promise<number> {
  const row = await env.DB.prepare(`SELECT COUNT(*) AS n FROM users WHERE status = 'active'`).first<{ n: number }>();
  return row?.n ?? 0;
}

export async function listActiveStewardEmails(): Promise<{ id: number; email: string }[]> {
  const { results } = await env.DB.prepare(
    `SELECT u.id, u.email
     FROM users u
     JOIN preferences p ON p.user_id = u.id
     WHERE u.status = 'active' AND p.email_updates = 1`,
  ).all<{ id: number; email: string }>();
  return results;
}

export async function createCampaign(input: {
  name: string;
  subject: string;
  body: string;
  createdBy: number;
  recipients: { id: number; email: string }[];
  status: "sent" | "simulated";
}): Promise<number> {
  const now = new Date().toISOString().replace(/\.\d{3}Z$/, "Z");
  const campaign = await env.DB.prepare(
    `INSERT INTO email_campaigns (name, subject, body_text, segment, status, created_by, recipient_count, sent_at)
     VALUES (?, ?, ?, 'all_active', ?, ?, ?, ?)
     RETURNING id`,
  )
    .bind(
      input.name,
      input.subject,
      input.body,
      input.status,
      input.createdBy,
      input.recipients.length,
      now,
    )
    .first<{ id: number }>();
  if (!campaign) throw new Error("Could not create campaign");

  for (const r of input.recipients) {
    await env.DB.prepare(
      `INSERT INTO email_campaign_recipients (campaign_id, user_id, email, status)
       VALUES (?, ?, ?, ?)`,
    )
      .bind(campaign.id, r.id, r.email, input.status === "sent" ? "sent" : "simulated")
      .run();
  }
  return campaign.id;
}

export async function listCampaigns(): Promise<
  { id: number; name: string; subject: string; status: string; recipient_count: number; sent_at: string | null }[]
> {
  const { results } = await env.DB.prepare(
    `SELECT id, name, subject, status, recipient_count, sent_at
     FROM email_campaigns
     ORDER BY created_at DESC`,
  ).all<{
    id: number;
    name: string;
    subject: string;
    status: string;
    recipient_count: number;
    sent_at: string | null;
  }>();
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
};

export async function listEventsForUser(userId: number): Promise<EventRow[]> {
  const { results } = await env.DB.prepare(
    `SELECT e.id, e.title, e.description, e.starts_at, e.ends_at, e.location, e.visibility,
            c.name AS circle_name, r.status AS rsvp
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
    .all<EventRow>();
  return results;
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
  status: "going" | "interested" | "cancelled",
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
    `SELECT id, question, answer FROM faqs ORDER BY sort_order ASC, id ASC`,
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
     VALUES (?, ?, 100, ?, ?)`,
  )
    .bind(input.question, input.answer, input.userId, now)
    .run();
}
