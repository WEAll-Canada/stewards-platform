/** Steward audience segments for campaigns (Festival segment idea, D1-friendly). */

export type SegmentKind = "all_opted_in" | "circle" | "role" | "interest";

export type CampaignSegment = {
  kind: SegmentKind;
  /** Circle id when kind=circle; role name when kind=role; interest label when kind=interest */
  value?: string;
};

export const MERGE_VARS = [
  { key: "{{display_name}}", label: "Display name" },
  { key: "{{email}}", label: "Email" },
  { key: "{{dashboard_url}}", label: "Dashboard link" },
] as const;

export const HEADER_VARIANTS = [
  { value: "weall_banner", label: "WeAll banner" },
  { value: "plain", label: "Plain (no banner)" },
  { value: "circle_accent", label: "Circle accent" },
] as const;

export function parseSegment(raw: unknown): CampaignSegment {
  if (raw && typeof raw === "object") {
    const obj = raw as Record<string, unknown>;
    const kind = String(obj.kind ?? "all_opted_in") as SegmentKind;
    if (kind === "circle" || kind === "role" || kind === "interest") {
      return { kind, value: String(obj.value ?? "").trim() };
    }
    return { kind: "all_opted_in" };
  }
  const text = String(raw ?? "all_opted_in").trim();
  if (text.startsWith("circle:")) return { kind: "circle", value: text.slice(7) };
  if (text.startsWith("role:")) return { kind: "role", value: text.slice(5) };
  if (text.startsWith("interest:")) return { kind: "interest", value: text.slice(9) };
  return { kind: "all_opted_in" };
}

export function serializeSegment(segment: CampaignSegment): string {
  if (segment.kind === "all_opted_in") return "all_opted_in";
  return `${segment.kind}:${segment.value ?? ""}`;
}

export function applyMergeVars(
  template: string,
  vars: { display_name: string; email: string; dashboard_url?: string },
): string {
  return template
    .replaceAll("{{display_name}}", vars.display_name || "steward")
    .replaceAll("{{first_name}}", (vars.display_name || "steward").split(" ")[0] || "steward")
    .replaceAll("{{email}}", vars.email)
    .replaceAll("{{dashboard_url}}", vars.dashboard_url || "https://weallcanada.org/stewards/dashboard");
}

export function htmlToText(html: string): string {
  return html
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>/gi, "\n\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .trim();
}

export function wrapEmailHtml(bodyHtml: string, headerVariant: string): string {
  const banner =
    headerVariant === "plain"
      ? ""
      : `<div style="padding:16px 20px;background:${headerVariant === "circle_accent" ? "#00a9e0" : "#000"};color:#fff;font-family:Lato,Arial,sans-serif;font-weight:700;">WeAll Canada</div>`;
  return `<!doctype html><html><body style="margin:0;font-family:Lato,Arial,sans-serif;color:#111;">${banner}<div style="padding:20px;line-height:1.5;">${bodyHtml}</div></body></html>`;
}
