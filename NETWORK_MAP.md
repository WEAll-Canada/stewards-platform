# Network Map

The WEAll Stewards Platform network map (`/stewards/network`) visualizes connections between directory stewards and partner organizations using a force-directed graph layout.

## Layout algorithm

The layout engine is in `src/lib/network-map-layout.ts` and is ported from Festival's `lib/participants/network-layout.ts`. It uses **d3-force** with several specialized techniques to create an organic, readable network visualization.

### Key stages

1. **Initial positioning**
   - Connected nodes are placed in a central disk using golden-angle spiral packing
   - Leaf nodes (degree 1) fan out from their parent in radial arcs
   - Isolated nodes (degree 0) are arranged in an outer "asteroid belt" ring

2. **Backbone edge selection**
   - Only the strongest connections are used in the force simulation
   - Each node keeps its top K edges by weight (default K=4)
   - Edges with weight ≥ `backbone_min_weight` are always included
   - Reduces visual clutter and improves simulation performance

3. **Hub detection and exclusion**
   - Nodes with degree > `hub_threshold` × (connected node count) are considered hubs
   - Hubs are excluded from the force simulation (they would dominate the layout)
   - After the simulation settles, hubs are placed at the centroid of their neighbors

4. **Community detection (Louvain)**
   - When `cluster_strength` > 0, Louvain community detection groups related nodes
   - A custom cluster force pulls each node gently toward its community centroid
   - Creates visible clusters without hard boundaries

5. **Force simulation**
   - **Charge**: Long-range repulsion (scaled by sqrt(degree+1) to prevent hubs from pushing too hard)
   - **Link**: Attractive springs between backbone edges (distance and strength vary by edge weight 1–4)
   - **Collide**: Prevents node overlap (radius = node size + padding + label clearance)
   - **Gravity**: Weak pull toward canvas center (keeps disconnected pieces from drifting away)
   - **Cluster**: Pull toward community centroid (when clustering is enabled)
   - Runs for `max_ticks` iterations (default 400), then stops

6. **Post-settle**
   - Hub positions are calculated from neighbor centroids
   - Home positions (`homeX`, `homeY`) are captured for all nodes
   - Velocities are zeroed out

7. **Ambient float**
   - After layout, nodes gently sway around their home positions
   - Deterministic sinusoidal motion (seeded by node ID)
   - Creates a living, organic feel without disrupting readability

## Configuration

All layout parameters are in `src/lib/network-map-config.ts` → `DEFAULT_PARTICIPANT_MAP_CONFIG`:

| Parameter | Default | Description |
| --- | --- | --- |
| `charge_strength` | -250 | Many-body repulsion strength (negative = repel) |
| `charge_distance_max` | 500 | Charge force cutoff distance (scaled by canvas size) |
| `gravity` | 0.04 | Pull toward canvas center (forceX / forceY) |
| `link_distance_1..4` | 160, 130, 100, 75 | Edge rest length by weight (scaled by canvas size) |
| `link_strength_1..4` | 0.15, 0.3, 0.5, 0.7 | Edge spring strength by weight |
| `collision_padding` | 14 | Added to node radius for collision detection |
| `backbone_k` | 4 | Max edges per node in layout backbone |
| `backbone_min_weight` | 3 | Edges ≥ this weight always included in backbone |
| `exclude_hubs` | true | Whether to exclude high-degree hubs from simulation |
| `hub_threshold` | 0.35 | Hub if degree > this × connected node count |
| `cluster_strength` | 0.12 | Pull toward Louvain community centroid (0 = off) |
| `alpha_decay` | 0.02 | Simulation cooling rate per tick |
| `velocity_decay` | 0.4 | Velocity damping (friction) |
| `max_ticks` | 400 | Simulation ticks before stopping |

Stronger connections (weight 4) pull harder and sit closer than weak ties (weight 1).

## Interaction

- **Drag a node**: Temporarily pin it; on release, isolates/hubs stay pinned, connected nodes reheat the simulation and settle into new positions
- **Click a node**: Open detail panel
- **Drag empty space**: Pan the view
- **Scroll / pinch**: Zoom in/out
- **Filters**: Show/hide steward/partner types, filter by province, highlight interests

## Rendering

The map is rendered as inline SVG in the page (no Canvas or WebGL). Edge paths are quadratic bezier curves with deterministic bend direction and curvature (seeded by edge key). Node images are clipped circles with colored halos indicating steward/partner type or interest highlight.

Edge colors encode connection reason (work/social/learning or combinations), matching the legend at the bottom of the page.

## Data

Network edges come from `getNetworkGraph()` in `src/lib/db.ts`. Edge weights (1–4) are computed server-side from mutual interests, shared regions, and self-reported connection strengths.

## Performance

- Typical networks (50–200 nodes, 200–800 edges) settle in <1 second
- Backbone filtering keeps simulation size manageable even with dense graphs
- Isolate belt pre-positioning avoids expensive collision resolution for unconnected nodes
- Stopped simulation can be reheated on drag (only affected nodes move)

## Comparison to Festival

This is a direct port of Festival's layout algorithm with field name mappings:

- `user_id` → `id`
- `is_me` → `isMe`
- `first_name` → `firstName`
- `source_user_id` → `source`
- `target_user_id` → `target`

WEAll adds ambient float animation (Festival only animates during simulation/reheat) and keeps home positions for smooth transitions.
