/** Connection strength + reason options (Festival-aligned labels, weall.org styling). */

export const CONNECTION_STRENGTHS = [
  { value: 1, label: "We've met once or twice" },
  { value: 2, label: "We connect a few times a year" },
  { value: 3, label: "We connect 1–2 times a month" },
  { value: 4, label: "We connect weekly or daily" },
] as const;

export const CONNECTION_REASONS = [
  { id: "work", label: "Work & Action" },
  { id: "social", label: "Social & Feeling" },
  { id: "learning", label: "Learning & Inquiry" },
] as const;

export type ConnectionReasonId = (typeof CONNECTION_REASONS)[number]["id"];

export function normalizeConnectionReasons(input: unknown): string {
  const allowed = new Set(CONNECTION_REASONS.map((r) => r.id));
  const list = Array.isArray(input)
    ? input.map(String)
    : String(input ?? "")
        .split("|")
        .map((s) => s.trim())
        .filter(Boolean);
  const picked = [...new Set(list.filter((id) => allowed.has(id as ConnectionReasonId)))];
  return picked.join("|");
}

export function formatConnectionReasons(raw: string): string {
  const map = new Map(CONNECTION_REASONS.map((r) => [r.id, r.label]));
  const parts = (raw || "")
    .split("|")
    .map((s) => s.trim())
    .filter(Boolean)
    .map((id) => map.get(id) ?? id);
  return parts.join(" · ") || "—";
}
