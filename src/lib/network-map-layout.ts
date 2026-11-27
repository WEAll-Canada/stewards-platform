/**
 * Network map layout engine for CHSF Platform.
 * 
 * Ported from Festival's d3-force network layout (lib/participants/network-layout.ts).
 * Uses backbone edges, hub exclusion, and Louvain community clustering.
 */

import {
  forceCollide,
  forceLink,
  forceManyBody,
  forceSimulation,
  forceX,
  forceY,
  type Force,
  type Simulation,
  type SimulationLinkDatum,
} from 'd3-force'
import Graph from 'graphology'
import louvain from 'graphology-communities-louvain'
import {
  DEFAULT_PARTICIPANT_MAP_CONFIG,
  connectionLineColor,
  type ParticipantMapConfig,
  type IsolatePosition,
} from './network-map-config'

// ============================================================================
// TYPES
// ============================================================================

export type MapNode = {
  id: string
  name: string
  firstName: string
  avatarSrc: string
  interests: string[]
  regions: string
  sector: string
  profileType: 'steward' | 'partner' | string
  isMe: boolean
}

export type MapEdge = {
  source: string
  target: string
  weight: number
  reason: string
}

export type SimNode = MapNode & {
  x: number
  y: number
  vx: number
  vy: number
  fx: number | null
  fy: number | null
  radius: number
  homeX: number
  homeY: number
  isIsolate: boolean
  index?: number
}

type LayoutLink = SimulationLinkDatum<SimNode> & {
  weight: number
}

export type NetworkLayoutResult = {
  nodes: SimNode[]
  simulation: Simulation<SimNode, LayoutLink>
  backboneEdges: MapEdge[]
  hubIds: Set<string>
  /** Louvain community id per node id (active nodes only; empty when clustering off). */
  communities: Map<string, number>
}

// ============================================================================
// RADIAL POSITIONING HELPERS (inlined from Festival radial-band.ts)
// ============================================================================

const GOLDEN_ANGLE = Math.PI * (3 - Math.sqrt(5))

function clamp01(value: number) {
  return Math.min(Math.max(value, 0), 1)
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max)
}

export function pointInDisk(
  index: number,
  count: number,
  salt: number,
  cx: number,
  cy: number,
  radius: number
) {
  const angle = index * GOLDEN_ANGLE + (salt % 29) * 0.07
  const t = (index + 0.4 + ((salt % 17) / 40)) / Math.max(count, 1)
  const r = radius * Math.sqrt(Math.min(1, Math.max(0.04, t)))
  return { x: cx + Math.cos(angle) * r, y: cy + Math.sin(angle) * r }
}

export function innerOuterLayout(options: {
  extra: number
  usable: number
  peripheryCount: number
  footprint: number
  emptyZone?: number
}) {
  const spread = 0.9 + options.extra / 180
  const emptyZone = Math.max(0, options.emptyZone ?? 0)
  const beltInner = Math.max(options.usable * 0.96, 48) + emptyZone
  const packing = Math.max(options.footprint * spread, 36)
  const neededArea = Math.max(options.peripheryCount, 1) * packing * packing
  const beltOuter = Math.sqrt(beltInner * beltInner + neededArea / Math.PI)
  return { beltInner, beltOuter, spread }
}

export function layoutAsteroidBelt(
  ids: string[],
  cx: number,
  cy: number,
  innerRadius: number,
  outerRadius: number,
  _footprint: number,
  saltFor: (id: string) => number
) {
  const inner = Math.max(8, innerRadius)
  const outer = Math.max(inner + 48, outerRadius)
  const innerSq = inner * inner
  const spanSq = outer * outer - innerSq
  const positions = new Map<string, { x: number; y: number; homeRadius: number }>()

  ids.forEach((id, index) => {
    const salt = saltFor(id)
    const u = (index + 0.4 + (((salt % 19) - 9) / 40)) / Math.max(ids.length, 1)
    const radius = Math.sqrt(innerSq + clamp01(u) * spanSq)
    const angle = index * GOLDEN_ANGLE + (((salt % 23) - 11) * 0.045)
    positions.set(id, {
      x: cx + Math.cos(angle) * radius,
      y: cy + Math.sin(angle) * radius,
      homeRadius: radius,
    })
  })

  return positions
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

export function hashString(value: string) {
  let hash = 0
  for (let index = 0; index < value.length; index += 1) {
    hash = ((hash << 5) - hash + value.charCodeAt(index)) | 0
  }
  return Math.abs(hash)
}

/** Mulberry32 — deterministic [0, 1) stream from a 32-bit seed. */
function mulberry32(seed: number) {
  let state = seed >>> 0
  return () => {
    state = (state + 0x6d2b79f5) >>> 0
    let t = state
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

function layoutSeed(nodes: MapNode[], edges: MapEdge[]) {
  const nodePart = [...nodes.map((node) => node.id)].sort().join('|')
  const edgePart = [
    ...edges.map((edge) => {
      const a = edge.source
      const b = edge.target
      return a < b ? `${a}:${b}:${edge.weight}` : `${b}:${a}:${edge.weight}`
    }),
  ]
    .sort()
    .join('|')
  return hashString(`${nodePart}#${edgePart}`)
}

function layoutScale(width: number, height: number) {
  return Math.min(width, height) / 2
}

function fromIsolatePosition(
  position: IsolatePosition,
  width: number,
  height: number
): { x: number; y: number } {
  const scale = layoutScale(width, height)
  return {
    x: width / 2 + position.nx * scale,
    y: height / 2 + position.ny * scale,
  }
}

function normalizeWeight(weight: number) {
  return clamp(Math.round(weight), 1, 4)
}

function linkDistanceByWeight(config: ParticipantMapConfig): Record<number, number> {
  return {
    1: config.link_distance_1,
    2: config.link_distance_2,
    3: config.link_distance_3,
    4: config.link_distance_4,
  }
}

function linkStrengthByWeight(config: ParticipantMapConfig): Record<number, number> {
  return {
    1: config.link_strength_1,
    2: config.link_strength_2,
    3: config.link_strength_3,
    4: config.link_strength_4,
  }
}

function linkDistanceForWeight(weight: number, canvas: number, config: ParticipantMapConfig) {
  const base = linkDistanceByWeight(config)[normalizeWeight(weight)] ?? config.link_distance_3
  return base * (canvas / 480)
}

function linkStrengthForWeight(weight: number, config: ParticipantMapConfig) {
  return linkStrengthByWeight(config)[normalizeWeight(weight)] ?? config.link_strength_3
}

export function nodeRadius(node: MapNode | SimNode) {
  return node.isMe ? 28 : 20
}

function nodeFootprint(radius: number, config: ParticipantMapConfig) {
  return radius * 2 + config.collision_padding + config.label_clearance + 24
}

function maxUsableRadius(width: number, height: number) {
  return Math.min(width, height) / 2 - 72
}

function dedupeNodes(nodes: MapNode[]): MapNode[] {
  const seen = new Map<string, MapNode>()
  for (const node of nodes) {
    if (!seen.has(node.id)) {
      seen.set(node.id, node)
    }
  }
  return Array.from(seen.values())
}

function edgePairKey(sourceId: string, targetId: string) {
  return sourceId < targetId ? `${sourceId}:${targetId}` : `${targetId}:${sourceId}`
}

// ============================================================================
// GRAPH ANALYSIS
// ============================================================================

export function buildAdjacency(edges: MapEdge[]) {
  const adjacency = new Map<string, Set<string>>()
  for (const edge of edges) {
    if (!adjacency.has(edge.source)) adjacency.set(edge.source, new Set())
    if (!adjacency.has(edge.target)) adjacency.set(edge.target, new Set())
    adjacency.get(edge.source)!.add(edge.target)
    adjacency.get(edge.target)!.add(edge.source)
  }
  return adjacency
}

function pickHubId(nodes: MapNode[], adjacency: Map<string, Set<string>>) {
  const me = nodes.find((node) => node.isMe)
  if (me) return me.id

  return nodes.reduce((best, node) => {
    const degree = adjacency.get(node.id)?.size ?? 0
    const bestDegree = adjacency.get(best.id)?.size ?? 0
    return degree > bestDegree ? node : best
  }).id
}

export function isolateIdSet(nodes: MapNode[], edges: MapEdge[]) {
  const connectedIds = new Set<string>()
  for (const edge of edges) {
    connectedIds.add(edge.source)
    connectedIds.add(edge.target)
  }
  const hubId = pickHubId(nodes, buildAdjacency(edges))
  const ids = new Set<string>()
  for (const node of nodes) {
    if (!connectedIds.has(node.id) && node.id !== hubId && !node.isMe) {
      ids.add(node.id)
    }
  }
  return ids
}

/**
 * Layout-only edge set: each node's top K edges by weight, plus every edge
 * with weight >= minWeight. Ties break by weight desc, then stable pair id.
 */
export function buildBackboneEdges(
  edges: MapEdge[],
  k: number,
  minWeight: number
): MapEdge[] {
  if (edges.length === 0) return []

  const byPair = new Map<string, MapEdge>()
  for (const edge of edges) {
    const key = edgePairKey(edge.source, edge.target)
    const existing = byPair.get(key)
    if (!existing || edge.weight > existing.weight) {
      byPair.set(key, edge)
    }
  }
  const unique = Array.from(byPair.values())

  const selected = new Set<string>()

  for (const edge of unique) {
    if (edge.weight >= minWeight) {
      selected.add(edgePairKey(edge.source, edge.target))
    }
  }

  const byNode = new Map<string, MapEdge[]>()
  for (const edge of unique) {
    const push = (id: string) => {
      const list = byNode.get(id)
      if (list) list.push(edge)
      else byNode.set(id, [edge])
    }
    push(edge.source)
    push(edge.target)
  }

  const limit = Math.max(0, Math.floor(k))
  for (const [, list] of byNode) {
    list.sort((a, b) => {
      if (b.weight !== a.weight) return b.weight - a.weight
      const keyA = edgePairKey(a.source, a.target)
      const keyB = edgePairKey(b.source, b.target)
      return keyA.localeCompare(keyB)
    })
    for (const edge of list.slice(0, limit)) {
      selected.add(edgePairKey(edge.source, edge.target))
    }
  }

  return unique.filter((edge) => selected.has(edgePairKey(edge.source, edge.target)))
}

function buildDegreeMap(edges: MapEdge[]) {
  const degree = new Map<string, number>()
  for (const edge of edges) {
    degree.set(edge.source, (degree.get(edge.source) ?? 0) + 1)
    degree.set(edge.target, (degree.get(edge.target) ?? 0) + 1)
  }
  return degree
}

/**
 * Hubs: degree > hub_threshold × (number of nodes with degree > 0).
 * Independent of isMe. Empty when exclude_hubs is off.
 */
export function findHubIds(
  nodes: MapNode[],
  edges: MapEdge[],
  config: ParticipantMapConfig
): Set<string> {
  if (!config.exclude_hubs) return new Set()

  const degree = buildDegreeMap(edges)
  let connectedCount = 0
  for (const node of nodes) {
    if ((degree.get(node.id) ?? 0) > 0) connectedCount += 1
  }
  if (connectedCount === 0) return new Set()

  const cutoff = config.hub_threshold * connectedCount
  const hubs = new Set<string>()
  for (const node of nodes) {
    if ((degree.get(node.id) ?? 0) > cutoff) {
      hubs.add(node.id)
    }
  }
  return hubs
}

/**
 * Louvain communities on the backbone graph, excluding hubs.
 * Returns empty map when clustering is off or the graph is empty.
 */
export function detectCommunities(
  nodeIds: string[],
  backboneEdges: MapEdge[],
  hubIds: Set<string>,
  rng: () => number
): Map<string, number> {
  const communities = new Map<string, number>()
  if (nodeIds.length === 0) return communities

  const graph = new Graph({ type: 'undirected', multi: false, allowSelfLoops: false })
  for (const id of nodeIds) {
    if (!hubIds.has(id) && !graph.hasNode(id)) graph.addNode(id)
  }

  for (const edge of backboneEdges) {
    if (hubIds.has(edge.source) || hubIds.has(edge.target)) continue
    if (!graph.hasNode(edge.source) || !graph.hasNode(edge.target)) continue
    if (edge.source === edge.target) continue

    if (graph.hasEdge(edge.source, edge.target)) {
      const existing = graph.getEdgeAttribute(edge.source, edge.target, 'weight')
      const nextWeight = typeof existing === 'number' ? Math.max(existing, edge.weight) : edge.weight
      graph.setEdgeAttribute(edge.source, edge.target, 'weight', nextWeight)
    } else {
      graph.addEdge(edge.source, edge.target, { weight: edge.weight })
    }
  }

  if (graph.order === 0) return communities

  try {
    const mapping = louvain(graph, {
      getEdgeWeight: 'weight',
      rng,
    })
    for (const [nodeId, communityId] of Object.entries(mapping)) {
      communities.set(nodeId, communityId)
    }
  } catch {
    // Degenerate graphs (no edges, etc.): each node is its own community.
    let index = 0
    for (const id of graph.nodes()) {
      communities.set(id, index)
      index += 1
    }
  }

  return communities
}

// ============================================================================
// INITIAL POSITIONING
// ============================================================================

function createInitialNodes(
  nodes: MapNode[],
  edges: MapEdge[],
  width: number,
  height: number,
  config: ParticipantMapConfig,
  isolatePositions: Record<string, IsolatePosition> = {}
): SimNode[] {
  const centerX = width / 2
  const centerY = height / 2
  const uniqueNodes = dedupeNodes(nodes)
  if (uniqueNodes.length === 0) return []

  const adjacency = buildAdjacency(edges)
  const hubId = pickHubId(uniqueNodes, adjacency)
  const isolates: MapNode[] = []

  for (const node of uniqueNodes) {
    if (node.id === hubId) continue
    const degree = adjacency.get(node.id)?.size ?? 0
    if (degree === 0) isolates.push(node)
  }

  isolates.sort((a, b) => {
    const delta = hashString(a.id) - hashString(b.id)
    return delta !== 0 ? delta : a.firstName.localeCompare(b.firstName)
  })

  const positions = new Map<string, { x: number; y: number }>()
  const isolateIds = new Set(isolates.map((node) => node.id))
  const usable = maxUsableRadius(width, height)
  const isolateFootprint = nodeFootprint(20, config)
  const connected = uniqueNodes
    .filter((node) => !isolateIds.has(node.id))
    .sort((a, b) => {
      const degA = adjacency.get(a.id)?.size ?? 0
      const degB = adjacency.get(b.id)?.size ?? 0
      if (degB !== degA) return degB - degA
      return a.firstName.localeCompare(b.firstName)
    })
  const canvas = Math.min(width, height)
  const avgLinkDistance =
    ((config.link_distance_1 +
      config.link_distance_2 +
      config.link_distance_3 +
      config.link_distance_4) /
      4) *
    (canvas / 480)
  const spacing = Math.max(nodeFootprint(20, config), avgLinkDistance * 0.4)
  const connectedBudget = Math.min(
    usable * 1.25,
    Math.max(96, Math.sqrt(Math.max(connected.length, 1)) * spacing * 0.65)
  )

  connected.forEach((node, index) => {
    const salt = hashString(node.id)
    const point = pointInDisk(index, connected.length, salt, centerX, centerY, connectedBudget * 0.92)
    positions.set(node.id, {
      x: point.x + ((salt % 13) - 6) * 3,
      y: point.y + (((salt >> 4) % 13) - 6) * 3,
    })
  })

  const edgeWeightByPair = new Map<string, number>()
  for (const edge of edges) {
    edgeWeightByPair.set(edgePairKey(edge.source, edge.target), edge.weight)
  }

  const leavesByParent = new Map<string, string[]>()
  for (const node of connected) {
    const neighbors = adjacency.get(node.id)
    if (!neighbors || neighbors.size !== 1) continue
    const parentId = neighbors.values().next().value as string
    const siblings = leavesByParent.get(parentId)
    if (siblings) siblings.push(node.id)
    else leavesByParent.set(parentId, [node.id])
  }

  for (const [parentId, leafIds] of leavesByParent) {
    const parentPos = positions.get(parentId)
    if (!parentPos) continue

    const fromCenterX = parentPos.x - centerX
    const fromCenterY = parentPos.y - centerY
    const baseAngle =
      Math.hypot(fromCenterX, fromCenterY) < 1
        ? ((hashString(parentId) % 628) / 100)
        : Math.atan2(fromCenterY, fromCenterX)

    leafIds.sort((a, b) => hashString(a) - hashString(b))
    const fanSpan = Math.min(Math.PI * 0.85, Math.max(0, leafIds.length - 1) * 0.45)

    leafIds.forEach((leafId, index) => {
      const weight = edgeWeightByPair.get(edgePairKey(leafId, parentId)) ?? 1
      const distance = linkDistanceForWeight(weight, canvas, config)
      const offset = leafIds.length === 1 ? 0 : -fanSpan / 2 + (fanSpan * index) / (leafIds.length - 1)
      const angle = baseAngle + offset
      positions.set(leafId, {
        x: parentPos.x + Math.cos(angle) * distance,
        y: parentPos.y + Math.sin(angle) * distance,
      })
    })
  }

  const { beltInner, beltOuter } = innerOuterLayout({
    extra: config.disconnected_ring_extra,
    usable,
    peripheryCount: isolates.length,
    footprint: isolateFootprint,
    emptyZone: config.unconnected_empty_zone,
  })
  const belt = layoutAsteroidBelt(
    isolates.map((node) => node.id),
    centerX,
    centerY,
    beltInner,
    beltOuter,
    isolateFootprint,
    hashString
  )
  for (const [userId, point] of belt) {
    const pinned = isolatePositions[userId]
    if (pinned) {
      positions.set(userId, fromIsolatePosition(pinned, width, height))
    } else {
      positions.set(userId, { x: point.x, y: point.y })
    }
  }

  return uniqueNodes.map((node) => {
    const isIsolate = isolateIds.has(node.id)
    const position = positions.get(node.id) ?? { x: centerX, y: centerY }

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
    }
  })
}

// ============================================================================
// HUB PLACEMENT
// ============================================================================

function placeHubsAtNeighborCentroids(
  simNodes: SimNode[],
  edges: MapEdge[],
  hubIds: Set<string>,
  width: number,
  height: number
) {
  if (hubIds.size === 0) return

  const nodeById = new Map(simNodes.map((node) => [node.id, node]))
  const adjacency = buildAdjacency(edges)
  const centerX = width / 2
  const centerY = height / 2

  // First pass: centroid of non-hub neighbors only.
  for (const hubId of hubIds) {
    const hub = nodeById.get(hubId)
    if (!hub) continue

    const neighbors = adjacency.get(hubId)
    let sumX = 0
    let sumY = 0
    let count = 0
    if (neighbors) {
      for (const neighborId of neighbors) {
        if (hubIds.has(neighborId)) continue
        const neighbor = nodeById.get(neighborId)
        if (!neighbor) continue
        sumX += neighbor.x
        sumY += neighbor.y
        count += 1
      }
    }

    if (count > 0) {
      hub.x = sumX / count
      hub.y = sumY / count
    } else {
      hub.x = centerX
      hub.y = centerY
    }
    hub.vx = 0
    hub.vy = 0
    hub.fx = hub.x
    hub.fy = hub.y
  }

  // Second pass: hubs with only hub neighbors use whatever neighbor positions exist now.
  for (const hubId of hubIds) {
    const hub = nodeById.get(hubId)
    if (!hub) continue
    const neighbors = adjacency.get(hubId)
    if (!neighbors || neighbors.size === 0) continue

    let hadNonHub = false
    for (const neighborId of neighbors) {
      if (!hubIds.has(neighborId) && nodeById.has(neighborId)) {
        hadNonHub = true
        break
      }
    }
    if (hadNonHub) continue

    let sumX = 0
    let sumY = 0
    let count = 0
    for (const neighborId of neighbors) {
      const neighbor = nodeById.get(neighborId)
      if (!neighbor) continue
      sumX += neighbor.x
      sumY += neighbor.y
      count += 1
    }
    if (count > 0) {
      hub.x = sumX / count
      hub.y = sumY / count
      hub.fx = hub.x
      hub.fy = hub.y
    }
  }
}

// ============================================================================
// COMMUNITY CLUSTERING
// ============================================================================

function communityAnchorPoints(
  communityIds: number[],
  width: number,
  height: number
): Map<number, { x: number; y: number }> {
  const anchors = new Map<number, { x: number; y: number }>()
  const count = communityIds.length
  if (count === 0) return anchors

  const cx = width / 2
  const cy = height / 2
  const radius = Math.min(width, height) * 0.28

  const sorted = [...communityIds].sort((a, b) => a - b)
  sorted.forEach((communityId, index) => {
    if (count === 1) {
      anchors.set(communityId, { x: cx, y: cy })
      return
    }
    const angle = index * GOLDEN_ANGLE - Math.PI / 2
    const r = radius * Math.sqrt((index + 0.5) / count)
    anchors.set(communityId, {
      x: cx + Math.cos(angle) * r,
      y: cy + Math.sin(angle) * r,
    })
  })

  return anchors
}

/** Bias active nodes toward their community's spiral anchor before the sim runs. */
function seedNodesNearCommunityAnchors(
  nodes: SimNode[],
  communities: Map<string, number>,
  anchors: Map<number, { x: number; y: number }>
) {
  const blend = 0.72
  for (const node of nodes) {
    if (node.fx !== null) continue
    const communityId = communities.get(node.id)
    if (communityId === undefined) continue
    const anchor = anchors.get(communityId)
    if (!anchor) continue
    const salt = hashString(node.id)
    const jitter = 12 + (salt % 18)
    const angle = (salt % 628) / 100
    node.x = anchor.x * blend + node.x * (1 - blend) + Math.cos(angle) * jitter
    node.y = anchor.y * blend + node.y * (1 - blend) + Math.sin(angle) * jitter
  }
}

/**
 * Custom force: pull each node toward the live centroid of its community.
 * Strength 0 is a no-op.
 */
function forceCluster(
  strength: number,
  communities: Map<string, number>
): Force<SimNode, LayoutLink> {
  let nodes: SimNode[] = []

  const force = ((alpha: number) => {
    if (strength <= 0 || nodes.length === 0 || communities.size === 0) return

    const sumX = new Map<number, number>()
    const sumY = new Map<number, number>()
    const counts = new Map<number, number>()

    for (const node of nodes) {
      const communityId = communities.get(node.id)
      if (communityId === undefined) continue
      sumX.set(communityId, (sumX.get(communityId) ?? 0) + node.x)
      sumY.set(communityId, (sumY.get(communityId) ?? 0) + node.y)
      counts.set(communityId, (counts.get(communityId) ?? 0) + 1)
    }

    for (const node of nodes) {
      if (node.fx != null) continue
      const communityId = communities.get(node.id)
      if (communityId === undefined) continue
      const count = counts.get(communityId) ?? 0
      if (count < 2) continue
      const cx = (sumX.get(communityId) ?? node.x) / count
      const cy = (sumY.get(communityId) ?? node.y) / count
      node.vx += (cx - node.x) * strength * alpha
      node.vy += (cy - node.y) * strength * alpha
    }
  }) as Force<SimNode, LayoutLink>

  force.initialize = (initNodes) => {
    nodes = initNodes
  }

  return force
}

// ============================================================================
// MAIN LAYOUT COMPUTATION
// ============================================================================

/**
 * Builds initial positions, runs a d3-force simulation to completion, and
 * returns the settled nodes plus a stopped simulation (for drag reheat).
 */
export function computeLayout(
  nodes: MapNode[],
  edges: MapEdge[],
  width: number,
  height: number,
  config: ParticipantMapConfig,
  isolatePositions: Record<string, IsolatePosition> = {}
): NetworkLayoutResult {
  const simNodes = createInitialNodes(nodes, edges, width, height, config, isolatePositions)

  const backboneEdges = buildBackboneEdges(edges, config.backbone_k, config.backbone_min_weight)
  const degree = buildDegreeMap(edges)
  const hubIds = findHubIds(simNodes, edges, config)
  const canvas = Math.min(width, height)
  const scale = canvas / 480
  const seed = layoutSeed(nodes, edges)
  const rng = mulberry32(seed)

  // Isolates are already pinned; hubs are left out of the moving set entirely.
  const activeNodes = simNodes.filter((node) => node.fx === null && !hubIds.has(node.id))

  const layoutBackbone = backboneEdges.filter(
    (edge) => !hubIds.has(edge.source) && !hubIds.has(edge.target)
  )

  const links: LayoutLink[] = layoutBackbone.map((edge) => ({
    source: edge.source,
    target: edge.target,
    weight: edge.weight,
  }))

  let communities = new Map<string, number>()
  if (config.cluster_strength > 0) {
    communities = detectCommunities(
      activeNodes.map((node) => node.id),
      layoutBackbone,
      hubIds,
      rng
    )
    const uniqueCommunities = [...new Set(communities.values())]
    const anchors = communityAnchorPoints(uniqueCommunities, width, height)
    seedNodesNearCommunityAnchors(activeNodes, communities, anchors)
  }

  const simulation = forceSimulation<SimNode, LayoutLink>(activeNodes)
    .force(
      'charge',
      forceManyBody<SimNode>()
        .strength((node) => {
          const d = degree.get(node.id) ?? 0
          return config.charge_strength * Math.sqrt(d + 1)
        })
        .distanceMax(config.charge_distance_max * scale)
    )
    .force(
      'link',
      forceLink<SimNode, LayoutLink>(links)
        .id((node) => node.id)
        .distance((link) => linkDistanceForWeight(link.weight, canvas, config))
        .strength((link) => linkStrengthForWeight(link.weight, config))
    )
    .force(
      'collide',
      forceCollide<SimNode>()
        .radius((node) => node.radius + config.collision_padding)
        .iterations(3)
    )
    .force('x', forceX<SimNode>(width / 2).strength(config.gravity))
    .force('y', forceY<SimNode>(height / 2).strength(config.gravity))
    .force('cluster', forceCluster(config.cluster_strength, communities))
    .alphaDecay(config.alpha_decay)
    .velocityDecay(config.velocity_decay)
    .randomSource(mulberry32(seed ^ 0x9e3779b9))
    .stop()

  const ticks = Math.max(1, Math.floor(config.max_ticks))
  for (let tick = 0; tick < ticks; tick += 1) {
    simulation.tick()
  }

  placeHubsAtNeighborCentroids(simNodes, edges, hubIds, width, height)

  // After settle, capture home positions and zero velocities
  for (const node of simNodes) {
    node.homeX = node.x
    node.homeY = node.y
    node.vx = 0
    node.vy = 0
  }

  return { nodes: simNodes, simulation, backboneEdges, hubIds, communities }
}

// ============================================================================
// RENDERING HELPERS (ported from Festival network-graph.tsx)
// ============================================================================

/** Capture current positions as home for ambient float. */
export function captureHomes(nodes: SimNode[]) {
  for (const node of nodes) {
    node.homeX = node.x
    node.homeY = node.y
  }
}

/**
 * Ambient float animation: gentle sway around home positions.
 * Call in requestAnimationFrame loop, passing current time in ms.
 */
export function applyAmbientFloat(nodes: SimNode[], timeMs: number) {
  for (const node of nodes) {
    if (node.fx !== null) continue // Skip pinned nodes
    const seed = hashString(node.id)
    const phase = (timeMs / 3000 + seed * 0.001) % (Math.PI * 2)
    const phase2 = (timeMs / 4200 + seed * 0.0013) % (Math.PI * 2)
    const amplitude = 1.5
    node.x = node.homeX + Math.sin(phase) * amplitude
    node.y = node.homeY + Math.cos(phase2) * amplitude
  }
}

const NODE_HALO_PAD = 5
const EDGE_ATTACH_INSET = 1

function edgeAttachRadius(nodeRadius: number) {
  return Math.max(2, nodeRadius + NODE_HALO_PAD - EDGE_ATTACH_INSET)
}

export function edgeEndpoints(
  sourceX: number,
  sourceY: number,
  sourceRadius: number,
  targetX: number,
  targetY: number,
  targetRadius: number
) {
  const dx = targetX - sourceX
  const dy = targetY - sourceY
  const distance = Math.hypot(dx, dy) || 1
  const ux = dx / distance
  const uy = dy / distance
  const sourceAttach = edgeAttachRadius(sourceRadius)
  const targetAttach = edgeAttachRadius(targetRadius)

  return {
    x1: sourceX + ux * sourceAttach,
    y1: sourceY + uy * sourceAttach,
    x2: targetX - ux * targetAttach,
    y2: targetY - uy * targetAttach,
  }
}

export function curvedPath(
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  edgeKey: string
): string {
  const midX = (x1 + x2) / 2
  const midY = (y1 + y2) / 2
  const dx = x2 - x1
  const dy = y2 - y1
  const length = Math.hypot(dx, dy) || 1
  const sign = hashString(edgeKey) % 2 === 0 ? 1 : -1
  const bend = length * (0.12 + ((hashString(edgeKey) % 5) * 0.02)) * sign
  const controlX = midX - (dy / length) * bend
  const controlY = midY + (dx / length) * bend
  return `M ${x1} ${y1} Q ${controlX} ${controlY} ${x2} ${y2}`
}

export function edgeColor(reasonPipe: string): string {
  return connectionLineColor(reasonPipe)
}

/** Mouse notches (~100) get a fixed small step; trackpad keeps proportional deltas. */
export function wheelZoomFactor(deltaY: number) {
  const abs = Math.abs(deltaY)
  const step = abs >= 40 ? 0.012 : 0.025 + (Math.min(abs, 80) / 80) * 0.02
  return deltaY > 0 ? 1 - step : 1 + step
}

// Re-export config default
export { DEFAULT_PARTICIPANT_MAP_CONFIG }
