// Shared welcome-survey options (language aligned with weallcanada.org/connect).

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
