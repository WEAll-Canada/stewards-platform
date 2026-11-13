/** Interest matching helpers for “Who is interested in X?” */

import { INTERESTS } from "./survey";

export type MatchCandidate = {
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

export type MatchHit = MatchCandidate & {
  score: number;
  reasons: string[];
  shared_interests: string[];
  matched_tags: string[];
};

export function splitInterests(raw: string): string[] {
  return (raw || "")
    .split("|")
    .map((s) => s.trim())
    .filter(Boolean);
}

export function normalizeQuery(q: string): string {
  return q.trim().replace(/\s+/g, " ").slice(0, 80);
}

/** Suggest interest chips that contain the typed query (or popular defaults). */
export function suggestInterestChips(query: string, limit = 8): string[] {
  const q = normalizeQuery(query).toLowerCase();
  const pool = INTERESTS.filter((i) => i !== "Other");
  if (!q) return pool.slice(0, limit);
  return pool.filter((i) => i.toLowerCase().includes(q)).slice(0, limit);
}

function includesLoose(haystack: string, needle: string): boolean {
  if (!haystack || !needle) return false;
  return haystack.toLowerCase().includes(needle.toLowerCase());
}

export function scoreInterestMatch(
  candidate: MatchCandidate,
  query: string,
  viewerInterests: string[],
): MatchHit | null {
  const q = normalizeQuery(query);
  if (q.length < 2) return null;

  const tags = splitInterests(candidate.interests);
  const viewerSet = new Set(viewerInterests.map((i) => i.toLowerCase()));
  const shared = tags.filter((t) => viewerSet.has(t.toLowerCase()));
  const matchedTags: string[] = [];
  const reasons: string[] = [];
  let score = 0;

  for (const tag of tags) {
    if (tag.toLowerCase() === q.toLowerCase()) {
      score += 100;
      matchedTags.push(tag);
      reasons.push(`Listed interest: ${tag}`);
    } else if (includesLoose(tag, q) || includesLoose(q, tag)) {
      score += 70;
      matchedTags.push(tag);
      reasons.push(`Related interest: ${tag}`);
    }
  }

  if (includesLoose(candidate.interest_other, q)) {
    score += 80;
    reasons.push("Mentioned in other interests");
  }
  if (includesLoose(candidate.about, q) || includesLoose(candidate.bio, q)) {
    score += 40;
    reasons.push("Mentioned in bio");
  }
  if (includesLoose(candidate.sector, q) || includesLoose(candidate.partner_org, q)) {
    score += 20;
    reasons.push("Sector / organization match");
  }

  if (shared.length) {
    score += shared.length * 10;
    reasons.push(`Shares ${shared.length} interest${shared.length === 1 ? "" : "s"} with you`);
  }

  if (score <= 0) return null;

  return {
    ...candidate,
    score,
    reasons: [...new Set(reasons)].slice(0, 4),
    shared_interests: shared,
    matched_tags: [...new Set(matchedTags)],
  };
}

export function rankInterestMatches(
  candidates: MatchCandidate[],
  query: string,
  viewerId: number,
  viewerInterests: string[],
): MatchHit[] {
  const hits: MatchHit[] = [];
  for (const c of candidates) {
    if (c.id === viewerId) continue;
    const hit = scoreInterestMatch(c, query, viewerInterests);
    if (hit) hits.push(hit);
  }
  hits.sort((a, b) => b.score - a.score || a.display_name.localeCompare(b.display_name));
  return hits;
}
