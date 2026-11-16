/** Festival participant map config — same defaults/parameters as Festival. */

export type IsolatePosition = { nx: number; ny: number };

export type ParticipantMapConfig = {
  repulsion_strength: number;
  alpha_decay: number;
  alpha_min: number;
  velocity_decay: number;
  settle_velocity: number;
  max_ticks: number;
  link_distance_1: number;
  link_distance_2: number;
  link_distance_3: number;
  link_distance_4: number;
  link_strength_1: number;
  link_strength_2: number;
  link_strength_3: number;
  link_strength_4: number;
  collision_padding: number;
  label_clearance: number;
  disconnected_ring_extra: number;
  unconnected_empty_zone: number;
  isolate_positions: Record<string, IsolatePosition>;
};

/** Copied from Festival `DEFAULT_PARTICIPANT_MAP_CONFIG`. */
export const DEFAULT_PARTICIPANT_MAP_CONFIG: ParticipantMapConfig = {
  repulsion_strength: 1.2,
  alpha_decay: 0.028,
  alpha_min: 0.001,
  velocity_decay: 0.6,
  settle_velocity: 0.06,
  max_ticks: 280,
  link_distance_1: 240,
  link_distance_2: 200,
  link_distance_3: 170,
  link_distance_4: 145,
  link_strength_1: 0.08,
  link_strength_2: 0.07,
  link_strength_3: 0.09,
  link_strength_4: 0.12,
  collision_padding: 18,
  label_clearance: 28,
  disconnected_ring_extra: 120,
  unconnected_empty_zone: 0,
  isolate_positions: {},
};

export const CONNECTION_REASON_COLORS = {
  work: "#2563EB",
  social: "#DC2626",
  learning: "#16A34A",
  work_social: "#EAB308",
  work_learning: "#06B6D4",
  social_learning: "#D946EF",
  all: "#92400E",
  default: "#1E293B",
} as const;

export const CONNECTION_REASON_LEGEND = [
  { id: "work", label: "Work & Action", color: CONNECTION_REASON_COLORS.work },
  { id: "social", label: "Social & Feeling", color: CONNECTION_REASON_COLORS.social },
  { id: "learning", label: "Learning & Inquiry", color: CONNECTION_REASON_COLORS.learning },
  { id: "work_social", label: "Work + Social", color: CONNECTION_REASON_COLORS.work_social },
  { id: "work_learning", label: "Work + Learning", color: CONNECTION_REASON_COLORS.work_learning },
  { id: "social_learning", label: "Social + Learning", color: CONNECTION_REASON_COLORS.social_learning },
  { id: "all", label: "All three", color: CONNECTION_REASON_COLORS.all },
] as const;

export function connectionLineColor(reasonPipe: string): string {
  const parts = new Set(
    (reasonPipe || "")
      .split("|")
      .map((s) => s.trim())
      .filter(Boolean),
  );
  const work = parts.has("work");
  const social = parts.has("social");
  const learning = parts.has("learning");
  const count = Number(work) + Number(social) + Number(learning);
  if (count === 0) return CONNECTION_REASON_COLORS.default;
  if (count === 3) return CONNECTION_REASON_COLORS.all;
  if (work && social) return CONNECTION_REASON_COLORS.work_social;
  if (work && learning) return CONNECTION_REASON_COLORS.work_learning;
  if (social && learning) return CONNECTION_REASON_COLORS.social_learning;
  if (work) return CONNECTION_REASON_COLORS.work;
  if (social) return CONNECTION_REASON_COLORS.social;
  return CONNECTION_REASON_COLORS.learning;
}
