// Shared welcome-survey options (language aligned with weallcanada.org/connect).
// Runtime lists preferably come from the database (admin-editable); these are fallbacks.

export const PROFILE_TYPES = [
  { value: "steward", label: "Steward (individual)" },
  { value: "partner", label: "Partner (organization)" },
] as const;

export const SECTORS = [
  "Academic",
  "Business/Enterprise",
  "Co-op",
  "Faith",
  "Government",
  "Investment Fund",
  "Labour",
  "Media",
  "Network",
  "NGO",
  "Philanthropy",
  "Other",
] as const;

export const INTERESTS = [
  "Basic Income",
  "Basic Needs",
  "Business",
  "Changemaking",
  "Climate",
  "Community Economics",
  "Democracy & Governance",
  "Education & Childcare",
  "Energy",
  "Finance",
  "Food & Agriculture",
  "Health",
  "Housing",
  "Indigenous Economies",
  "Justice & Equity",
  "Labour & Work",
  "Leadership",
  "Measurement & Goals",
  "Movements & Visions",
  "Nature",
  "Policy & Regulation",
  "Social Enterprise",
  "Sustainable Communities",
  "Systemic Innovation",
  "Technology",
  "Trade & Localization",
  "Transit",
  "Other",
] as const;

export const DEFAULT_CHARTER = {
  title: "Living Charter",
  body: "As a WeAll Canada steward I will act with care for people and planet, share learning openly, honour consent and privacy in the directory, and help the alliance stay purposeful, hospitable, and accountable.",
  version: "2026.1",
};

export const DEFAULT_ABOUT = {
  prompt: "What else would you like to share about yourself?",
  hint: "A free space to share as much or as little as you’d like — your work, keywords, or even a favourite poem.",
};

export type SurveyPayload = {
  profile_type: "steward" | "partner";
  contact_links: string;
  regions: string;
  map_address: string;
  sector: string;
  sector_other: string;
  interests: string[];
  interest_other: string;
  about: string;
  charter_agreed: boolean;
};

export function withFallbackLabels(dbLabels: string[], fallback: readonly string[]): string[] {
  return dbLabels.length > 0 ? dbLabels : [...fallback];
}
