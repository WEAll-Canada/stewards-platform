/** Festival-aligned participant map config (d3-force layout). */

export type IsolatePosition = { nx: number; ny: number };

export type ParticipantMapConfig = {
  /** Base many-body charge (negative = repel). Scaled by sqrt(degree + 1). */
  charge_strength: number;
  /** Many-body cutoff distance (scaled by canvas/480). */
  charge_distance_max: number;
  /** forceX / forceY strength toward canvas center. */
  gravity: number;
  /** Legacy short-range repulsion (unused by the people-map d3 layout). */
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
  /** Added to node radius for forceCollide. */
  collision_padding: number;
  label_clearance: number;
  disconnected_ring_extra: number;
  unconnected_empty_zone: number;
  /** Max strongest edges per node kept in the layout backbone. */
  backbone_k: number;
  /** Edges at or above this weight always join the layout backbone. */
  backbone_min_weight: number;
  /** When true, high-degree hubs are kept out of the force sim and placed after. */
  exclude_hubs: boolean;
  /**
   * Hub if degree > hub_threshold × (count of nodes with degree > 0).
   * Default 0.35 = more than 35% of connected people.
   */
  hub_threshold: number;
  /**
   * Pull each node toward its Louvain community centroid.
   * 0 disables community detection and the cluster force.
   */
  cluster_strength: number;
  isolate_positions: Record<string, IsolatePosition>;
};

/**
 * Kumu-style people-map defaults (ported from Festival Stages A–D):
 * long-range charge, short strong ties, backbone layout, hub exclusion,
 * Louvain cluster pull.
 */
export const DEFAULT_PARTICIPANT_MAP_CONFIG: ParticipantMapConfig = {
  charge_strength: -250,
  charge_distance_max: 500,
  gravity: 0.04,
  repulsion_strength: 1.2,
  alpha_decay: 0.02,
  alpha_min: 0.001,
  velocity_decay: 0.4,
  settle_velocity: 0.06,
  max_ticks: 400,
  link_distance_1: 160,
  link_distance_2: 130,
  link_distance_3: 100,
  link_distance_4: 75,
  link_strength_1: 0.15,
  link_strength_2: 0.3,
  link_strength_3: 0.5,
  link_strength_4: 0.7,
  collision_padding: 14,
  label_clearance: 28,
  disconnected_ring_extra: 160,
  unconnected_empty_zone: 120,
  backbone_k: 4,
  backbone_min_weight: 3,
  exclude_hubs: true,
  hub_threshold: 0.35,
  cluster_strength: 0.12,
  isolate_positions: {},
};

/** Ring colors for person type (WeAll palette). */
export const NODE_RING = {
  you: "#000000",
  steward: "#00a9e0",
  partner: "#ff8200",
  highlight: "#0c4da2",
  muted: "#e2e8f0",
} as const;

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
