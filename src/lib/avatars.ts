/** Compact steward photo thumbs (~96px). Presets avoid large binary blobs. */

export const AVATAR_PRESETS: {
  id: string;
  label: string;
  initials: string;
  bg: string;
}[] = [
  { id: "admin", label: "Platform Admin", initials: "PA", bg: "#0c4da2" },
  { id: "alex", label: "Alex", initials: "AS", bg: "#00a9e0" },
  { id: "kai", label: "Kai", initials: "KC", bg: "#10b726" },
  { id: "jordan", label: "Jordan", initials: "JL", bg: "#ff8200" },
  { id: "priya", label: "Priya", initials: "PN", bg: "#84bd00" },
  { id: "naryan", label: "Naryan", initials: "NS", bg: "#fa4616" },
  { id: "warm", label: "Warm abstract", initials: "WE", bg: "#fdda24" },
  { id: "deep", label: "Deep abstract", initials: "WE", bg: "#050707" },
];

const PRESET_MAP = new Map(AVATAR_PRESETS.map((p) => [p.id, p]));

/** Hard cap so directory grids stay fast (data URLs only). */
export const AVATAR_DATA_URL_MAX = 24_000;

export function initialsFromName(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "WE";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0] ?? ""}${parts[1][0] ?? ""}`.toUpperCase() || "WE";
}

export function svgThumb(initials: string, bg: string): string {
  const safe = initials.replace(/[^A-Za-z0-9]/g, "").slice(0, 2).toUpperCase() || "WE";
  const fill = /^#[0-9a-fA-F]{6}$/.test(bg) ? bg : "#00a9e0";
  const text = fill === "#fdda24" || fill === "#84bd00" ? "#000000" : "#ffffff";
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="96" height="96" viewBox="0 0 96 96"><rect width="96" height="96" rx="48" fill="${fill}"/><text x="48" y="58" text-anchor="middle" font-family="Lato,Arial,sans-serif" font-size="32" font-weight="700" fill="${text}">${safe}</text></svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

export function resolveAvatarSrc(avatarUrl: string | null | undefined, displayName: string): string {
  const raw = (avatarUrl || "").trim();
  if (raw.startsWith("data:image/")) return raw;
  if (raw.startsWith("preset:")) {
    const preset = PRESET_MAP.get(raw.slice("preset:".length));
    if (preset) return svgThumb(preset.initials, preset.bg);
  }
  if (raw.startsWith("http://") || raw.startsWith("https://") || raw.startsWith("/")) return raw;
  return svgThumb(initialsFromName(displayName), "#00a9e0");
}

export function normalizeAvatarInput(value: string): { ok: true; value: string } | { ok: false; error: string } {
  const raw = value.trim();
  if (!raw) return { ok: true, value: "" };
  if (raw.startsWith("preset:")) {
    const id = raw.slice("preset:".length);
    if (!PRESET_MAP.has(id)) return { ok: false, error: "Unknown photo preset." };
    return { ok: true, value: raw };
  }
  if (raw.startsWith("data:image/jpeg;base64,") || raw.startsWith("data:image/webp;base64,")) {
    if (raw.length > AVATAR_DATA_URL_MAX) {
      return { ok: false, error: "Photo is too large. Use a small square thumbnail." };
    }
    return { ok: true, value: raw };
  }
  return { ok: false, error: "Use a preset or a small JPEG/WebP thumbnail." };
}
