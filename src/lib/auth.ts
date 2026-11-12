// Session and password helpers for the Stewards Platform.
import { env } from "cloudflare:workers";
import {
  createSession,
  deleteSession,
  findUserByEmail,
  getSessionUser,
  type StewardUser,
} from "./db";

const COOKIE = "steward_session";
const SESSION_DAYS = 14;
const PBKDF2_ITERATIONS = 100_000;

function sessionSecret(): string {
  const secret = String(env.SESSION_SECRET ?? "");
  if (secret) return secret;
  // Local preview only — production/staging must set SESSION_SECRET.
  return "local-dev-session-secret";
}

function bytesToBase64(bytes: ArrayBuffer | Uint8Array): string {
  const arr = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
  let binary = "";
  for (const b of arr) binary += String.fromCharCode(b);
  return btoa(binary);
}

function base64ToBytes(value: string): Uint8Array {
  const binary = atob(value);
  const out = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) out[i] = binary.charCodeAt(i);
  return out;
}

export async function hashPassword(password: string): Promise<string> {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(password), "PBKDF2", false, [
    "deriveBits",
  ]);
  const bits = await crypto.subtle.deriveBits(
    { name: "PBKDF2", salt, iterations: PBKDF2_ITERATIONS, hash: "SHA-256" },
    key,
    256,
  );
  return `${bytesToBase64(salt)}:${bytesToBase64(bits)}`;
}

export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const [saltB64, hashB64] = stored.split(":");
  if (!saltB64 || !hashB64) return false;
  const salt = base64ToBytes(saltB64);
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(password), "PBKDF2", false, [
    "deriveBits",
  ]);
  const bits = await crypto.subtle.deriveBits(
    { name: "PBKDF2", salt, iterations: PBKDF2_ITERATIONS, hash: "SHA-256" },
    key,
    256,
  );
  const left = bytesToBase64(bits);
  return left === hashB64;
}

function parseCookies(header: string | null): Record<string, string> {
  const out: Record<string, string> = {};
  if (!header) return out;
  for (const part of header.split(";")) {
    const [rawKey, ...rest] = part.trim().split("=");
    if (!rawKey) continue;
    out[rawKey] = decodeURIComponent(rest.join("="));
  }
  return out;
}

export function sessionCookieHeader(sessionId: string, maxAgeSeconds: number, secure: boolean): string {
  return `${COOKIE}=${encodeURIComponent(sessionId)}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${maxAgeSeconds}${secure ? "; Secure" : ""}`;
}

export function clearSessionCookieHeader(): string {
  return `${COOKIE}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0`;
}

export async function startSession(
  userId: number,
  request: Request,
): Promise<{ id: string; header: string }> {
  const id = crypto.randomUUID();
  const expires = new Date(Date.now() + SESSION_DAYS * 24 * 60 * 60 * 1000).toISOString().replace(/\.\d{3}Z$/, "Z");
  await createSession(id, userId, expires);
  void sessionSecret();
  const secure = new URL(request.url).protocol === "https:";
  return { id, header: sessionCookieHeader(id, SESSION_DAYS * 24 * 60 * 60, secure) };
}

export async function endSession(request: Request): Promise<string> {
  const cookies = parseCookies(request.headers.get("cookie"));
  const id = cookies[COOKIE];
  if (id) await deleteSession(id);
  return clearSessionCookieHeader();
}

export async function currentUser(request: Request): Promise<StewardUser | null> {
  const cookies = parseCookies(request.headers.get("cookie"));
  const id = cookies[COOKIE];
  if (!id) return null;
  return getSessionUser(id);
}

export async function requireUser(request: Request): Promise<StewardUser | Response> {
  const user = await currentUser(request);
  if (!user) {
    return new Response(null, { status: 302, headers: { Location: "/stewards/login" } });
  }
  return user;
}

export function hasRole(user: StewardUser, role: string): boolean {
  return user.roles.includes(role);
}

export async function authenticateEmailPassword(
  email: string,
  password: string,
): Promise<{ ok: true; user: StewardUser } | { ok: false; error: string }> {
  const user = await findUserByEmail(email);
  if (!user || !user.password_hash) {
    return { ok: false, error: "Email or password is incorrect." };
  }
  if (user.status === "disabled") {
    return { ok: false, error: "This account is disabled." };
  }
  const valid = await verifyPassword(password, user.password_hash);
  if (!valid) return { ok: false, error: "Email or password is incorrect." };
  return { ok: true, user };
}
