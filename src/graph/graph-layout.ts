import { graph, ROOT_ID, type Graph } from "./model";

export type Vec = { x: number; y: number };

/** Distance from a node to the children that unfold around it. */
export const RING = 150;
/** Second-layer ideas orbit the root closer in; the first ring recedes outward while they are open. */
export const LENS_RING = 136;
/** Nodes closer than this would tangle their labels. */
const MIN_SEPARATION = 128;
const STAGGER_STEP = 0.6;

/**
 * The entrances around the root, clockwise from the top. Neighbors are ideas that lean on each other, so
 * cross-links between adjacent entrances stay short. Any entrance not listed is appended in data order.
 */
const ROOT_ORDER = ["culture", "humanity", "nature", "cosmos", "mathematics", "silicon", "computing", "machines"];

const rad = (deg: number) => (deg * Math.PI) / 180;

/** Where k children go relative to their parent's outward heading: a compact arc, on one to three radii. */
function fanOffsets(k: number): { angle: number; radius: number }[] {
  const maxSpan = k <= 6 ? rad(170) : rad(200);
  const chord = 2 * Math.asin(Math.min(0.999, MIN_SEPARATION / (2 * RING)));
  const step = k === 1 ? 0 : Math.min(k <= 3 ? chord : STAGGER_STEP, maxSpan / (k - 1));
  const radii = k <= 3 ? [1] : k <= 6 ? [1, 1.42] : [1, 1.4, 1.8];
  return Array.from({ length: k }, (_, i) => ({ angle: (i - (k - 1) / 2) * step, radius: RING * radii[i % radii.length] }));
}

/**
 * Stable world positions for every concept. Nothing here depends on what is
 * currently visible, so focus mode and navigation never make the graph jump.
 */
export function computeLayout(g: Graph = graph): Map<string, Vec> {
  const home = new Map<string, Vec>();
  const outward = new Map<string, number>();
  home.set(ROOT_ID, { x: 0, y: 0 });

  const entrances = [...(g.layer1.get(ROOT_ID) ?? [])].sort((a, b) => {
    const ia = ROOT_ORDER.indexOf(a);
    const ib = ROOT_ORDER.indexOf(b);
    return (ia < 0 ? 99 : ia) - (ib < 0 ? 99 : ib);
  });
  entrances.forEach((id, i) => {
    const angle = rad(-90 + (360 / entrances.length) * i);
    home.set(id, { x: Math.cos(angle) * (RING + 22), y: Math.sin(angle) * (RING + 22) });
    outward.set(id, angle);
  });

  const lens = g.layer2.get(ROOT_ID) ?? [];
  lens.forEach((id, i) => {
    const angle = rad(-60 + (360 / lens.length) * i);
    home.set(id, { x: Math.cos(angle) * LENS_RING, y: Math.sin(angle) * LENS_RING });
    outward.set(id, angle);
  });

  // Fan every remaining node outward from its primary parent.
  const queue = [...entrances];
  const placed = new Set<string>([ROOT_ID, ...entrances, ...lens]);
  while (queue.length) {
    const parentId = queue.shift()!;
    const parent = home.get(parentId)!;
    const kids = (g.layer1.get(parentId) ?? []).filter((id) => g.byId.get(id)!.parentIds[0] === parentId && !placed.has(id));
    if (!kids.length) continue;

    const heading = outward.get(parentId) ?? 0;
    const offsets = fanOffsets(kids.length);
    kids.forEach((id, i) => {
      const angle = heading + offsets[i].angle;
      const x = parent.x + Math.cos(angle) * offsets[i].radius;
      const y = parent.y + Math.sin(angle) * offsets[i].radius;
      home.set(id, { x, y });
      // Every subtree keeps opening away from the root, so nothing curls back through the middle.
      outward.set(id, Math.atan2(y, x));
      placed.add(id);
      queue.push(id);
    });
  }

  relax(g, home, new Set([ROOT_ID, ...lens]));
  return home;
}

/**
 * Only ideas that can be on screen together need room from each other: siblings, a node and the children
 * of anyone on its trail, and the always-visible first ring. Comparing only those pairs keeps a large
 * network from pushing unrelated branches apart.
 */
function coVisiblePairs(g: Graph, ids: string[]): [string, string][] {
  const primary = (id: string) => g.byId.get(id)?.parentIds[0];
  const cache = new Map<string, Set<string>>();
  const ancestors = (id: string): Set<string> => {
    let set = cache.get(id);
    if (!set) {
      set = new Set([id]);
      for (let p = primary(id); p; p = primary(p)) set.add(p);
      cache.set(id, set);
    }
    return set;
  };
  const comparable = (u: string, v: string) => ancestors(v).has(u) || ancestors(u).has(v);

  const pairs: [string, string][] = [];
  for (let a = 0; a < ids.length; a++) {
    for (let b = a + 1; b < ids.length; b++) {
      const u = ids[a];
      const v = ids[b];
      const pu = primary(u);
      const pv = primary(v);
      // A second parent puts a node beside its other parent's children, so those relationships count too.
      const parentsU = g.byId.get(u)!.parentIds;
      const parentsV = g.byId.get(v)!.parentIds;
      const related = parentsU.includes(v) || parentsV.includes(u) || parentsU.some((p) => parentsV.includes(p));
      if (related || comparable(u, v) || (pv && comparable(u, pv)) || (pu && comparable(pu, v)) || (pu && pv && comparable(pu, pv))) pairs.push([u, v]);
    }
  }
  return pairs;
}

/** A short force pass: keep labels apart, keep edges near their sketched length, stay close to the radial sketch. */
function relax(g: Graph, home: Map<string, Vec>, pinned: Set<string>) {
  const ids = g.nodes.map((n) => n.id).filter((id) => !pinned.has(id));
  const start = new Map(ids.map((id) => [id, { ...home.get(id)! }]));
  const entrances = new Set(g.layer1.get(ROOT_ID) ?? []);
  const pairs = coVisiblePairs(g, ids);

  // Edges keep the lengths of the radial sketch; the pass only nudges nodes apart.
  const restLength = new Map<string, number>();
  for (const edge of g.edges) {
    const a = home.get(edge.from);
    const b = home.get(edge.to);
    if (edge.kind === "tree" && a && b) restLength.set(edge.id, Math.hypot(b.x - a.x, b.y - a.y));
  }

  const iterations = 200;
  // Only pairs that are actually near each other can push; the list is refreshed as nodes settle.
  let active = pairs;
  for (let iteration = 0; iteration < iterations; iteration++) {
    const cool = 1 - iteration / (iterations * 1.1);
    if (iteration % 25 === 0) {
      active = pairs.filter(([u, v]) => {
        const a = home.get(u)!;
        const b = home.get(v)!;
        return Math.hypot(a.x - b.x, a.y - b.y) < MIN_SEPARATION * 2.4;
      });
    }

    for (const [u, v] of active) {
      const pa = home.get(u)!;
      const pb = home.get(v)!;
      let dx = pb.x - pa.x;
      let dy = pb.y - pa.y;
      let d = Math.hypot(dx, dy);
      if (d >= MIN_SEPARATION) continue;
      if (d < 0.01) { dx = 1; dy = 0.5; d = Math.hypot(dx, dy); }
      const push = ((MIN_SEPARATION - d) / 2) * 0.5 * cool;
      pa.x -= (dx / d) * push; pa.y -= (dy / d) * push;
      pb.x += (dx / d) * push; pb.y += (dy / d) * push;
    }

    for (const edge of g.edges) {
      if (edge.kind !== "tree") continue;
      const to = g.byId.get(edge.to)!;
      if (pinned.has(edge.to) && pinned.has(edge.from)) continue;
      const primary = to.parentIds[0] === edge.from;
      const rest = restLength.get(edge.id) ?? RING;
      const strength = (primary ? 0.05 : 0.015) * cool;
      const pa = home.get(edge.from)!;
      const pb = home.get(edge.to)!;
      const dx = pb.x - pa.x;
      const dy = pb.y - pa.y;
      const d = Math.hypot(dx, dy) || 1;
      const pull = (d - rest) * strength;
      if (!pinned.has(edge.from)) { pa.x += (dx / d) * pull * 0.5; pa.y += (dy / d) * pull * 0.5; }
      if (!pinned.has(edge.to)) { pb.x -= (dx / d) * pull * 0.5; pb.y -= (dy / d) * pull * 0.5; }
    }

    for (const id of ids) {
      const p = home.get(id)!;
      const s = start.get(id)!;
      const anchor = entrances.has(id) ? 0.22 : 0.025;
      p.x += (s.x - p.x) * anchor;
      p.y += (s.y - p.y) * anchor;
    }
  }
}

export function boundsOf(points: Vec[]): { minX: number; minY: number; maxX: number; maxY: number } {
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const p of points) {
    minX = Math.min(minX, p.x); maxX = Math.max(maxX, p.x);
    minY = Math.min(minY, p.y); maxY = Math.max(maxY, p.y);
  }
  return { minX, minY, maxX, maxY };
}
