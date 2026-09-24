import { graph, ROOT_ID } from "./model";
import type { Vec } from "./graph-layout";

/**
 * Navigation is a trail through the network. What is visible is derived from
 * it, so going back simply un-derives the previous depth.
 */
export type NavState = {
  stack: string[];
  /** The top node's second-layer ideas are open (only Entropy has any). */
  deep: boolean;
};

export type NavAction = { type: "tap"; id: string } | { type: "back" } | { type: "set"; stack: string[] };

export const initialNav: NavState = { stack: [ROOT_ID], deep: false };

/** Related nodes farther than this from the center stay hidden; they would sit off-screen. */
const RELATED_REACH = 380;
const MAX_RELATED_SHOWN = 5;
/** A revealed cross-link must sit at least this far from every other visible node. */
const RELATED_CLEARANCE = 112;

export type Role = "center" | "child" | "related" | "trail" | "far" | "hidden";

export const topOf = (nav: NavState) => nav.stack[nav.stack.length - 1];

/** The trail from the root down to a concept, following each idea's first parent. Going back retraces it. */
export function trailTo(id: string): string[] {
  const chain: string[] = [];
  for (let node = graph.byId.get(id); node; node = node.parentIds[0] ? graph.byId.get(node.parentIds[0]) : undefined) chain.unshift(node.id);
  return chain;
}

export function navReducer(state: NavState, action: NavAction): NavState {
  if (action.type === "set") return { stack: action.stack.length ? action.stack : [ROOT_ID], deep: false };
  if (action.type === "back") {
    return state.stack.length > 1 ? { stack: state.stack.slice(0, -1), deep: false } : state;
  }

  const { id } = action;
  const top = topOf(state);

  if (id === top) {
    const hasLens = (graph.layer2.get(id)?.length ?? 0) > 0;
    return hasLens && !state.deep ? { ...state, deep: true } : state;
  }

  const inTrail = state.stack.indexOf(id);
  if (inTrail >= 0) return { stack: state.stack.slice(0, inTrail + 1), deep: false };

  if (graph.layer1.get(top)?.includes(id)) return { stack: [...state.stack, id], deep: false };

  // A sibling or cousin: branch off from the deepest trail member that leads to it.
  const node = graph.byId.get(id);
  if (node) {
    for (let i = state.stack.length - 1; i >= 0; i--) {
      if (node.parentIds.includes(state.stack[i]) && graph.layer1.get(state.stack[i])?.includes(id)) {
        return { stack: [...state.stack.slice(0, i + 1), id], deep: false };
      }
    }
  }

  // A cross-link: the trail simply continues sideways.
  return { stack: [...state.stack, id], deep: false };
}

export function shownChildren(nav: NavState): string[] {
  const top = topOf(nav);
  return nav.deep ? [...(graph.layer2.get(top) ?? [])] : [...(graph.layer1.get(top) ?? [])];
}

export function nearRelated(nav: NavState, layout: Map<string, Vec>): string[] {
  // The opening view is just Entropy and its first ring; cross-links appear once someone starts exploring.
  if (nav.stack.length <= 1) return [];
  const top = topOf(nav);
  const at = layout.get(top);
  const node = graph.byId.get(top);
  if (!at || !node) return [];
  // Ideas are densely linked, so only a few are drawn: the closest ones that do not land on top of anything
  // already on screen. Every link stays reachable from the info sheet.
  const taken: Vec[] = [top, ...shownChildren(nav), ...nav.stack].map((id) => layout.get(id)).filter((p): p is Vec => !!p);
  const picked: string[] = [];
  const candidates = node.relatedIds
    .map((id) => ({ id, p: layout.get(id) }))
    .filter((r): r is { id: string; p: Vec } => !!r.p)
    .map((r) => ({ ...r, d: Math.hypot(r.p.x - at.x, r.p.y - at.y) }))
    .filter((r) => r.d <= RELATED_REACH)
    .sort((a, b) => a.d - b.d);
  for (const c of candidates) {
    if (picked.length >= MAX_RELATED_SHOWN) break;
    if (taken.some((t) => Math.hypot(t.x - c.p.x, t.y - c.p.y) < RELATED_CLEARANCE)) continue;
    picked.push(c.id);
    taken.push(c.p);
  }
  return picked;
}

export function deriveRoles(nav: NavState, layout: Map<string, Vec>, showAll = false): Map<string, Role> {
  const roles = new Map<string, Role>();
  for (const node of graph.nodes) roles.set(node.id, showAll ? "child" : "hidden");
  if (showAll) return roles;

  const top = topOf(nav);
  const children = new Set(shownChildren(nav));

  // The whole trail keeps its first ring of children visible for context.
  for (const id of nav.stack) {
    for (const childId of graph.layer1.get(id) ?? []) roles.set(childId, "far");
  }
  for (const id of nav.stack) roles.set(id, "trail");
  for (const id of nearRelated(nav, layout)) roles.set(id, "related");
  for (const id of children) roles.set(id, "child");
  roles.set(top, "center");
  return roles;
}
