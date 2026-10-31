import type { LayoutOptions } from './types';

export interface LayoutNodeInput {
  id: string;
}

export interface LayoutEdgeInput {
  from: string;
  to: string;
}

export interface Position {
  x: number;
  y: number;
}

// In-memory cache keyed by canonical graph structure signature
const layoutCache = new Map<string, Record<string, Position>>();

/**
 * Computes a deterministic 2D force-directed layout for graph nodes and edges.
 * Results are cached so layout is computed only once per unique graph topology.
 */
export function computeForceLayout(
  nodes: LayoutNodeInput[],
  edges: LayoutEdgeInput[],
  options: LayoutOptions,
): Record<string, Position> {
  if (nodes.length === 0) {
    return {};
  }

  const { width, height, iterations = 60, padding = 60 } = options;

  // Build a stable cache key
  const sortedNodeIds = nodes.map((n) => n.id).sort().join(',');
  const sortedEdgeKeys = edges
    .map((e) => (e.from < e.to ? `${e.from}--${e.to}` : `${e.to}--${e.from}`))
    .sort()
    .join(';');
  const cacheKey = `${width}x${height}_${sortedNodeIds}_${sortedEdgeKeys}`;

  const cached = layoutCache.get(cacheKey);
  if (cached) {
    return cached;
  }

  // Initialize positions deterministically in concentric rings around center
  const centerX = width / 2;
  const centerY = height / 2;
  const positions: Record<string, Position> = {};
  const velocities: Record<string, Position> = {};

  const count = nodes.length;
  nodes.forEach((node, index) => {
    if (count === 1) {
      positions[node.id] = { x: centerX, y: centerY };
    } else {
      const angle = (index / count) * 2 * Math.PI;
      const radius = Math.min(width, height) * 0.35 * (0.6 + 0.4 * ((index % 3) / 2));
      positions[node.id] = {
        x: centerX + Math.cos(angle) * radius,
        y: centerY + Math.sin(angle) * radius,
      };
    }
    velocities[node.id] = { x: 0, y: 0 };
  });

  if (count <= 1) {
    layoutCache.set(cacheKey, positions);
    return positions;
  }

  // Force simulation parameters
  const area = (width - padding * 2) * (height - padding * 2);
  const k = Math.sqrt(area / count) * 0.85; // Ideal distance
  const kSq = k * k;

  let temperature = width / 10;
  const coolingFactor = Math.pow(0.01 / temperature, 1 / iterations);

  for (let iter = 0; iter < iterations; iter++) {
    // 1. Repulsion between all pairs of nodes
    for (let i = 0; i < count; i++) {
      const n1 = nodes[i]!;
      const p1 = positions[n1.id]!;
      for (let j = i + 1; j < count; j++) {
        const n2 = nodes[j]!;
        const p2 = positions[n2.id]!;

        let dx = p1.x - p2.x;
        let dy = p1.y - p2.y;
        let dist = Math.hypot(dx, dy);
        if (dist === 0) {
          dx = (Math.random() - 0.5) || 1;
          dy = (Math.random() - 0.5) || 1;
          dist = Math.hypot(dx, dy);
        }

        if (dist < k * 4) {
          const force = kSq / dist;
          const fx = (dx / dist) * force;
          const fy = (dy / dist) * force;

          velocities[n1.id]!.x += fx;
          velocities[n1.id]!.y += fy;
          velocities[n2.id]!.x -= fx;
          velocities[n2.id]!.y -= fy;
        }
      }
    }

    // 2. Attraction along edges
    for (const edge of edges) {
      const p1 = positions[edge.from];
      const p2 = positions[edge.to];
      if (!p1 || !p2) continue;

      const dx = p1.x - p2.x;
      const dy = p1.y - p2.y;
      let dist = Math.hypot(dx, dy);
      if (dist === 0) dist = 1;

      const force = (dist * dist) / k;
      const fx = (dx / dist) * force;
      const fy = (dy / dist) * force;

      velocities[edge.from]!.x -= fx;
      velocities[edge.from]!.y -= fy;
      velocities[edge.to]!.x += fx;
      velocities[edge.to]!.y += fy;
    }

    // 3. Central gravity (pull gently toward center)
    const gravityCoeff = 0.05;
    for (const node of nodes) {
      const p = positions[node.id]!;
      velocities[node.id]!.x += (centerX - p.x) * gravityCoeff;
      velocities[node.id]!.y += (centerY - p.y) * gravityCoeff;
    }

    // 4. Apply displacement damped by temperature
    for (const node of nodes) {
      const v = velocities[node.id]!;
      const disp = Math.hypot(v.x, v.y);
      if (disp > 0) {
        const cappedDisp = Math.min(disp, temperature);
        const p = positions[node.id]!;
        p.x += (v.x / disp) * cappedDisp;
        p.y += (v.y / disp) * cappedDisp;

        // Bounded boundaries
        p.x = Math.max(padding, Math.min(width - padding, p.x));
        p.y = Math.max(padding, Math.min(height - padding, p.y));
      }
      v.x = 0;
      v.y = 0;
    }

    temperature *= coolingFactor;
  }

  // Cache results
  layoutCache.set(cacheKey, positions);
  return positions;
}

/**
 * Clears the layout cache (useful for tests).
 */
export function clearLayoutCache(): void {
  layoutCache.clear();
}
