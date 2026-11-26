/**
 * Festival network force-layout (ported from Festival network-graph + radial-band).
 * Same seeding, repulsion, link springs, isolate asteroid belt, and settle loop.
 */
import {
  DEFAULT_PARTICIPANT_MAP_CONFIG,
  connectionLineColor,
  type ParticipantMapConfig,
} from "./network-map-config";

export type MapNode = {
  id: string;
  name: string;
  firstName: string;
  avatarSrc: string;
  interests: string[];
  regions: string;
  sector: string;
  profileType: "steward" | "partner" | string;
  isMe: boolean;
};

export type MapEdge = {
  source: string;
  target: string;
  weight: number;
  reason: string;
};

export type SimNode = MapNode & {
  x: number;
  y: number;
  vx: number;
  vy: number;
  fx: number | null;
  fy: number | null;
  radius: number;
  /** Home seat for unconnected (asteroid-belt) floaters. */
  homeX: number;
  homeY: number;
  isIsolate: boolean;
};

const GOLDEN_ANGLE = Math.PI * (3 - Math.sqrt(5));
const NODE_HALO_PAD = 5;
const EDGE_ATTACH_INSET = 1;
const LEAF_OUTWARD_STRENGTH = 0.35;

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function clamp01(value: number) {
  return Math.min(Math.max(value, 0), 1);
}

export function hashString(value: string) {
  let hash = 0;
  for (let i = 0; i < value.length; i++) {
    hash = (hash << 5) - hash + value.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

function normalizeWeight(weight: number) {
  return clamp(Math.round(weight), 1, 4);
}

function linkDistanceForWeight(weight: number, canvas: number, config: ParticipantMapConfig) {
  const map: Record<number, number> = {
    1: config.link_distance_1,
    2: config.link_distance_2,
    3: config.link_distance_3,
    4: config.link_distance_4,
  };
  const base = map[normalizeWeight(weight)] ?? config.link_distance_3;
  return base * (canvas / 480);
}

function linkStrengthForWeight(weight: number, config: ParticipantMapConfig) {
  const map: Record<number, number> = {
    1: config.link_strength_1,
    2: config.link_strength_2,
    3: config.link_strength_3,
    4: config.link_strength_4,
  };
  return map[normalizeWeight(weight)] ?? config.link_strength_3;
}

function comfortDistance(a: SimNode, b: SimNode, config: ParticipantMapConfig) {
  return a.radius + b.radius + config.collision_padding + config.label_clearance + 24;
}

function nodeFootprint(radius: number, config: ParticipantMapConfig) {
  return radius * 2 + config.collision_padding + config.label_clearance + 24;
}

function nodeRadius(node: MapNode) {
  return node.isMe ? 28 : 20;
}

function maxUsableRadius(width: number, height: number) {
  return Math.min(width, height) / 2 - 72;
}

function pointInDisk(index: number, count: number, salt: number, cx: number, cy: number, radius: number) {
  const angle = index * GOLDEN_ANGLE + (salt % 29) * 0.07;
  const t = (index + 0.4 + (salt % 17) / 40) / Math.max(count, 1);
  const r = radius * Math.sqrt(Math.min(1, Math.max(0.04, t)));
  return { x: cx + Math.cos(angle) * r, y: cy + Math.sin(angle) * r };
}

function innerOuterLayout(options: {
  extra: number;
  usable: number;
  peripheryCount: number;
  footprint: number;
  emptyZone?: number;
}) {
  const spread = 0.9 + options.extra / 180;
  const emptyZone = Math.max(0, options.emptyZone ?? 0);
  const beltInner = Math.max(options.usable * 0.96, 48) + emptyZone;
  const packing = Math.max(options.footprint * spread, 36);
  const neededArea = Math.max(options.peripheryCount, 1) * packing * packing;
  const beltOuter = Math.sqrt(beltInner * beltInner + neededArea / Math.PI);
  return { beltInner, beltOuter };
}

function layoutAsteroidBelt(
  ids: string[],
  cx: number,
  cy: number,
  innerRadius: number,
  outerRadius: number,
  _footprint?: number,
) {
  const inner = Math.max(8, innerRadius);
  const outer = Math.max(inner + 48, outerRadius);
  const innerSq = inner * inner;
  const spanSq = outer * outer - innerSq;
  const positions = new Map<string, { x: number; y: number; homeRadius: number }>();
  ids.forEach((id, index) => {
    const salt = hashString(id);
    const u = (index + 0.4 + ((salt % 19) - 9) / 40) / Math.max(ids.length, 1);
    const radius = Math.sqrt(innerSq + clamp01(u) * spanSq);
    const angle = index * GOLDEN_ANGLE + ((salt % 23) - 11) * 0.045;
    positions.set(id, {
      x: cx + Math.cos(angle) * radius,
      y: cy + Math.sin(angle) * radius,
      homeRadius: radius,
    });
  });
  return positions;
}

function buildAdjacency(edges: MapEdge[]) {
  const adjacency = new Map<string, Set<string>>();
  for (const edge of edges) {
    if (!adjacency.has(edge.source)) adjacency.set(edge.source, new Set());
    if (!adjacency.has(edge.target)) adjacency.set(edge.target, new Set());
    adjacency.get(edge.source)!.add(edge.target);
    adjacency.get(edge.target)!.add(edge.source);
  }
  return adjacency;
}

function pickHubId(nodes: MapNode[], adjacency: Map<string, Set<string>>) {
  const me = nodes.find((n) => n.isMe);
  if (me) return me.id;
  return nodes.reduce((best, node) => {
    const degree = adjacency.get(node.id)?.size ?? 0;
    const bestDegree = adjacency.get(best.id)?.size ?? 0;
    return degree > bestDegree ? node : best;
  }).id;
}

function isolateIdSet(nodes: MapNode[], edges: MapEdge[]) {
  const connectedIds = new Set<string>();
  for (const edge of edges) {
    connectedIds.add(edge.source);
    connectedIds.add(edge.target);
  }
  const hubId = pickHubId(nodes, buildAdjacency(edges));
  const ids = new Set<string>();
  for (const node of nodes) {
    if (!connectedIds.has(node.id) && node.id !== hubId && !node.isMe) ids.add(node.id);
  }
  return ids;
}

function clusterLinkDistance(weight: number, canvas: number, config: ParticipantMapConfig, edgeKey: string) {
  const raw = linkDistanceForWeight(weight, canvas, config);
  const jitter = 0.9 + (hashString(edgeKey) % 20) / 100;
  return Math.max(40, raw * jitter);
}

export function createSimNodes(
  nodes: MapNode[],
  edges: MapEdge[],
  width: number,
  height: number,
  config: ParticipantMapConfig = DEFAULT_PARTICIPANT_MAP_CONFIG,
): SimNode[] {
  const centerX = width / 2;
  const centerY = height / 2;
  if (nodes.length === 0) return [];
  const adjacency = buildAdjacency(edges);
  const hubId = pickHubId(nodes, adjacency);
  const isolates: MapNode[] = [];
  for (const node of nodes) {
    if (node.id === hubId) continue;
    if ((adjacency.get(node.id)?.size ?? 0) === 0) isolates.push(node);
  }
  isolates.sort((a, b) => {
    const delta = hashString(a.id) - hashString(b.id);
    return delta !== 0 ? delta : a.firstName.localeCompare(b.firstName);
  });

  const positions = new Map<string, { x: number; y: number }>();
  const isolateIds = new Set(isolates.map((n) => n.id));
  const usable = maxUsableRadius(width, height);
  const isolateFootprint = nodeFootprint(20, config);
  const connected = nodes
    .filter((n) => !isolateIds.has(n.id))
    .sort((a, b) => {
      const degA = adjacency.get(a.id)?.size ?? 0;
      const degB = adjacency.get(b.id)?.size ?? 0;
      if (degB !== degA) return degB - degA;
      return a.firstName.localeCompare(b.firstName);
    });
  const canvas = Math.min(width, height);
  const avgLinkDistance =
    ((config.link_distance_1 + config.link_distance_2 + config.link_distance_3 + config.link_distance_4) / 4) *
    (canvas / 480);
  const spacing = Math.max(nodeFootprint(20, config), avgLinkDistance * 0.4);
  const connectedBudget = Math.min(
    usable * 1.25,
    Math.max(96, Math.sqrt(Math.max(connected.length, 1)) * spacing * 0.65),
  );

  connected.forEach((node, index) => {
    const salt = hashString(node.id);
    const point = pointInDisk(index, connected.length, salt, centerX, centerY, connectedBudget * 0.92);
    positions.set(node.id, {
      x: point.x + ((salt % 13) - 6) * 3,
      y: point.y + (((salt >> 4) % 13) - 6) * 3,
    });
  });

  const edgeWeightByPair = new Map<string, number>();
  for (const edge of edges) {
    const key = edge.source < edge.target ? `${edge.source}:${edge.target}` : `${edge.target}:${edge.source}`;
    edgeWeightByPair.set(key, edge.weight);
  }

  const leavesByParent = new Map<string, string[]>();
  for (const node of connected) {
    const neighbors = adjacency.get(node.id);
    if (!neighbors || neighbors.size !== 1) continue;
    const parentId = neighbors.values().next().value as string;
    const siblings = leavesByParent.get(parentId);
    if (siblings) siblings.push(node.id);
    else leavesByParent.set(parentId, [node.id]);
  }

  for (const [parentId, leafIds] of leavesByParent) {
    const parentPos = positions.get(parentId);
    if (!parentPos) continue;
    const fromCenterX = parentPos.x - centerX;
    const fromCenterY = parentPos.y - centerY;
    const baseAngle =
      Math.hypot(fromCenterX, fromCenterY) < 1
        ? (hashString(parentId) % 628) / 100
        : Math.atan2(fromCenterY, fromCenterX);
    leafIds.sort((a, b) => hashString(a) - hashString(b));
    const fanSpan = Math.min(Math.PI * 0.85, Math.max(0, leafIds.length - 1) * 0.45);
    leafIds.forEach((leafId, index) => {
      const pairKey = leafId < parentId ? `${leafId}:${parentId}` : `${parentId}:${leafId}`;
      const weight = edgeWeightByPair.get(pairKey) ?? 1;
      const distance = linkDistanceForWeight(weight, canvas, config);
      const offset = leafIds.length === 1 ? 0 : -fanSpan / 2 + (fanSpan * index) / (leafIds.length - 1);
      const angle = baseAngle + offset;
      positions.set(leafId, {
        x: parentPos.x + Math.cos(angle) * distance,
        y: parentPos.y + Math.sin(angle) * distance,
      });
    });
  }

  const { beltInner, beltOuter } = innerOuterLayout({
    extra: config.disconnected_ring_extra,
    usable,
    peripheryCount: isolates.length,
    footprint: isolateFootprint,
    emptyZone: config.unconnected_empty_zone,
  });
  const belt = layoutAsteroidBelt(
    isolates.map((n) => n.id),
    centerX,
    centerY,
    beltInner,
    beltOuter,
    isolateFootprint,
  );
  for (const [userId, point] of belt) positions.set(userId, { x: point.x, y: point.y });

  return nodes.map((node) => {
    const isIsolate = isolateIds.has(node.id);
    const position = positions.get(node.id) ?? { x: centerX, y: centerY };
    // Festival pins isolates during force settle so the belt keeps its spacing;
    // ambient float (below) adds organic motion on top of that home seat.
    return {
      ...node,
      x: position.x,
      y: position.y,
      vx: 0,
      vy: 0,
      fx: isIsolate ? position.x : null,
      fy: isIsolate ? position.y : null,
      radius: nodeRadius(node),
      homeX: position.x,
      homeY: position.y,
      isIsolate,
    };
  });
}

/** Soft living drift — Festival-style organic float after the force layout settles. */
export function applyAmbientFloat(nodes: SimNode[], timeMs: number) {
  for (const node of nodes) {
    const salt = hashString(node.id);
    const phase = (salt % 628) / 100;
    if (node.isIsolate) {
      // Outer-belt floaters: slow orbital bob around their home seat.
      const orbit = 5 + (salt % 7);
      const speed = 0.00035 + (salt % 5) * 0.00004;
      node.x = node.homeX + Math.cos(timeMs * speed + phase) * orbit;
      node.y = node.homeY + Math.sin(timeMs * speed * 0.85 + phase) * orbit;
      node.fx = node.x;
      node.fy = node.y;
      continue;
    }
    // Connected cluster: tiny breathing drift so the graph feels alive.
    const amp = 1.6 + (salt % 4) * 0.35;
    const speed = 0.00022 + (salt % 6) * 0.00003;
    node.x = node.homeX + Math.cos(timeMs * speed + phase) * amp;
    node.y = node.homeY + Math.sin(timeMs * speed * 1.1 + phase * 0.7) * amp;
  }
}

/** Capture settled seats as homes before ambient float begins. */
export function captureHomes(nodes: SimNode[]) {
  for (const node of nodes) {
    node.homeX = node.x;
    node.homeY = node.y;
  }
}

function totalVelocity(nodes: SimNode[]) {
  let energy = 0;
  for (const node of nodes) {
    if (node.fx !== null) continue;
    energy += node.vx * node.vx + node.vy * node.vy;
  }
  return energy;
}

export function simulateStep(
  nodes: SimNode[],
  edges: MapEdge[],
  width: number,
  height: number,
  alpha: number,
  config: ParticipantMapConfig = DEFAULT_PARTICIPANT_MAP_CONFIG,
) {
  const canvas = Math.min(width, height);
  const padding = 48;
  const repulsion = config.repulsion_strength * alpha;
  const damping = 1 - config.velocity_decay * alpha;
  const nodeById = new Map(nodes.map((n) => [n.id, n]));
  const isolateIds = isolateIdSet(nodes, edges);
  const adjacency = buildAdjacency(edges);
  const centerX = width / 2;
  const centerY = height / 2;

  for (let i = 0; i < nodes.length; i++) {
    for (let j = i + 1; j < nodes.length; j++) {
      const a = nodes[i];
      const b = nodes[j];
      if (isolateIds.has(a.id) && isolateIds.has(b.id)) continue;
      let dx = b.x - a.x;
      let dy = b.y - a.y;
      let distance = Math.hypot(dx, dy);
      const comfort = comfortDistance(a, b, config);
      if (distance >= comfort) continue;
      if (distance < 0.01) {
        const angle = (hashString(a.id + b.id) % 628) / 100;
        dx = Math.cos(angle);
        dy = Math.sin(angle);
        distance = 1;
      }
      const push = ((comfort - distance) / distance) * repulsion;
      const fx = dx * push;
      const fy = dy * push;
      if (a.fx === null) {
        a.vx -= fx;
        a.vy -= fy;
      }
      if (b.fx === null) {
        b.vx += fx;
        b.vy += fy;
      }
    }
  }

  for (const edge of edges) {
    const source = nodeById.get(edge.source);
    const target = nodeById.get(edge.target);
    if (!source || !target) continue;
    const dx = target.x - source.x;
    const dy = target.y - source.y;
    const distance = Math.hypot(dx, dy) || 1;
    const targetDistance = Math.max(
      clusterLinkDistance(edge.weight, canvas, config, `${edge.source}:${edge.target}`),
      comfortDistance(source, target, config) * 0.85,
    );
    const stiffness = linkStrengthForWeight(edge.weight, config) * alpha;
    const displacement = (distance - targetDistance) * stiffness;
    const fx = (dx / distance) * displacement;
    const fy = (dy / distance) * displacement;
    if (source.fx === null) {
      source.vx += fx;
      source.vy += fy;
    }
    if (target.fx === null) {
      target.vx -= fx;
      target.vy -= fy;
    }
  }

  const leafPush = LEAF_OUTWARD_STRENGTH * alpha;
  for (const node of nodes) {
    if (node.fx !== null || isolateIds.has(node.id)) continue;
    if ((adjacency.get(node.id)?.size ?? 0) !== 1) continue;
    const dx = node.x - centerX;
    const dy = node.y - centerY;
    const dist = Math.hypot(dx, dy) || 1;
    node.vx += (dx / dist) * leafPush;
    node.vy += (dy / dist) * leafPush;
  }

  for (const node of nodes) {
    if (node.fx !== null) continue;
    const labelBottom = node.y + node.radius + config.label_clearance;
    if (node.x - node.radius < padding) node.vx += (padding - (node.x - node.radius)) * 0.05 * alpha;
    if (node.x + node.radius > width - padding)
      node.vx -= (node.x + node.radius - (width - padding)) * 0.05 * alpha;
    if (node.y - node.radius < padding) node.vy += (padding - (node.y - node.radius)) * 0.05 * alpha;
    if (labelBottom > height - padding) node.vy -= (labelBottom - (height - padding)) * 0.05 * alpha;
  }

  for (const node of nodes) {
    if (node.fx !== null) {
      node.x = node.fx;
      node.y = node.fy ?? node.y;
      node.vx = 0;
      node.vy = 0;
      continue;
    }
    node.vx *= damping;
    node.vy *= damping;
    node.x += node.vx;
    node.y += node.vy;
  }

  for (let i = 0; i < nodes.length; i++) {
    for (let j = i + 1; j < nodes.length; j++) {
      const a = nodes[i];
      const b = nodes[j];
      if (isolateIds.has(a.id) && isolateIds.has(b.id)) continue;
      let dx = b.x - a.x;
      let dy = b.y - a.y;
      let distance = Math.hypot(dx, dy);
      const minDistance = comfortDistance(a, b, config);
      if (distance >= minDistance) continue;
      if (distance < 0.01) {
        const angle = (hashString(a.id + b.id) % 628) / 100;
        dx = Math.cos(angle);
        dy = Math.sin(angle);
        distance = 1;
      }
      const overlap = ((minDistance - distance) / 2) * alpha;
      const nx = dx / distance;
      const ny = dy / distance;
      if (a.fx === null) {
        a.x -= nx * overlap;
        a.y -= ny * overlap;
      }
      if (b.fx === null) {
        b.x += nx * overlap;
        b.y += ny * overlap;
      }
    }
  }
}

export function settleLayout(
  nodes: SimNode[],
  edges: MapEdge[],
  width: number,
  height: number,
  config: ParticipantMapConfig = DEFAULT_PARTICIPANT_MAP_CONFIG,
) {
  let alpha = 1;
  for (let tick = 0; tick < config.max_ticks; tick++) {
    simulateStep(nodes, edges, width, height, alpha, config);
    alpha *= 1 - config.alpha_decay;
    if (alpha < config.alpha_min && totalVelocity(nodes) < config.settle_velocity) break;
  }
  for (const node of nodes) {
    node.vx = 0;
    node.vy = 0;
  }
}

function edgeAttachRadius(nodeRadiusValue: number) {
  return Math.max(2, nodeRadiusValue + NODE_HALO_PAD - EDGE_ATTACH_INSET);
}

export function curvedPath(x1: number, y1: number, x2: number, y2: number, edgeKey: string): string {
  const midX = (x1 + x2) / 2;
  const midY = (y1 + y2) / 2;
  const dx = x2 - x1;
  const dy = y2 - y1;
  const length = Math.hypot(dx, dy) || 1;
  const sign = hashString(edgeKey) % 2 === 0 ? 1 : -1;
  // Stronger per-edge bend so parallel ties fan apart (Kumu-like readability).
  const bend = length * (0.18 + (hashString(edgeKey) % 7) * 0.03) * sign;
  const controlX = midX - (dy / length) * bend;
  const controlY = midY + (dx / length) * bend;
  return `M ${x1} ${y1} Q ${controlX} ${controlY} ${x2} ${y2}`;
}

export function edgeEndpoints(
  sourceX: number,
  sourceY: number,
  sourceRadius: number,
  targetX: number,
  targetY: number,
  targetRadius: number,
) {
  const dx = targetX - sourceX;
  const dy = targetY - sourceY;
  const distance = Math.hypot(dx, dy) || 1;
  const ux = dx / distance;
  const uy = dy / distance;
  const sourceAttach = edgeAttachRadius(sourceRadius);
  const targetAttach = edgeAttachRadius(targetRadius);
  return {
    x1: sourceX + ux * sourceAttach,
    y1: sourceY + uy * sourceAttach,
    x2: targetX - ux * targetAttach,
    y2: targetY - uy * targetAttach,
  };
}

export function edgeColor(reason: string) {
  return connectionLineColor(reason);
}

export function wheelZoomFactor(deltaY: number) {
  const abs = Math.abs(deltaY);
  const step = abs >= 40 ? 0.012 : 0.025 + (Math.min(abs, 80) / 80) * 0.02;
  return deltaY > 0 ? 1 - step : 1 + step;
}

export { DEFAULT_PARTICIPANT_MAP_CONFIG };
