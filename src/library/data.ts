import type { OrbState } from "thinking-orbs";
import type { ConceptNode, ConceptVoice } from "../concepts/types";
import { graph } from "../graph/model";

/** The four layers of a concept, from the picture in your head to the reasons it has to be that way. */
export const LAYERS = [
  { key: "picture", label: "Picture", hint: "What it is" },
  { key: "mechanism", label: "Mechanism", hint: "How it works" },
  { key: "detail", label: "Detail", hint: "How it's done" },
  { key: "principles", label: "Principles", hint: "Why it works" },
] as const;
export type LayerKey = (typeof LAYERS)[number]["key"];

export type Depth = Record<LayerKey, string> & {
  example?: { label: string; code: string };
  /** Concepts this idea is built on. Each has its own card. */
  requires?: string[];
};

export type Department = { id: string; title: string; blurb: string; entries: string[] };
export type Faculty = { id: string; title: string; blurb: string; orb: OrbState; voice: ConceptVoice; departments: Department[] };
/** A module's entries are anchor concept ids, not exhaustive — subtree() still supplies everything beneath one. */
export type Module = { id: string; title: string; blurb: string; entries: string[] };
export type Course = { id: string; title: string; blurb: string; departmentId: string; modules: Module[] };

type DepthFile = { depth?: (Depth & { id: string })[] };
type LibraryFile = { faculties?: Faculty[]; courses?: Course[] };

const depthFiles = import.meta.glob("../../content/depth/*.json", { eager: true, import: "default" }) as Record<string, DepthFile>;
const libraryFiles = import.meta.glob("../../content/library/*.json", { eager: true, import: "default" }) as Record<string, LibraryFile>;

export const depthById = new Map<string, Depth>(
  Object.values(depthFiles).flatMap((file) => (file.depth ?? []).map((entry) => [entry.id, entry] as const)),
);

export const faculties: Faculty[] = Object.entries(libraryFiles)
  .sort(([a], [b]) => a.localeCompare(b))
  .flatMap(([, file]) => file.faculties ?? []);

export const courses: Course[] = Object.entries(libraryFiles)
  .sort(([a], [b]) => a.localeCompare(b))
  .flatMap(([, file]) => file.courses ?? []);

const departmentsById = new Map(faculties.flatMap((f) => f.departments.map((d) => [d.id, { department: d, faculty: f }] as const)));

export const getDepartment = (id: string) => departmentsById.get(id);

const coursesById = new Map(courses.map((c) => [c.id, c] as const));
export const getCourse = (id: string) => coursesById.get(id);

const modulesById = new Map(courses.flatMap((c) => c.modules.map((m) => [m.id, { module: m, course: c }] as const)));
export const getModule = (id: string) => modulesById.get(id);

const coursesByDepartment = new Map<string, Course[]>();
for (const course of courses) {
  const list = coursesByDepartment.get(course.departmentId);
  if (list) list.push(course); else coursesByDepartment.set(course.departmentId, [course]);
}
/** A department's courses, if it has been given a curated Course/Module tier. Empty means the department falls back to its raw entries. */
export function coursesFor(departmentId: string): Course[] {
  return coursesByDepartment.get(departmentId) ?? [];
}

/** Everything below an idea, in its own tree: the size of the deck it opens. */
const subtreeCache = new Map<string, Set<string>>();
export function subtree(id: string): Set<string> {
  let cached = subtreeCache.get(id);
  if (!cached) {
    cached = new Set();
    const stack = [id];
    while (stack.length) {
      const current = stack.pop()!;
      for (const child of [...(graph.layer1.get(current) ?? []), ...(graph.layer2.get(current) ?? [])]) {
        if (!cached.has(child)) { cached.add(child); stack.push(child); }
      }
    }
    subtreeCache.set(id, cached);
  }
  return cached;
}

/** The cards directly beneath an idea. */
export function childrenOf(id: string): ConceptNode[] {
  return [...(graph.layer1.get(id) ?? []), ...(graph.layer2.get(id) ?? [])].map((c) => graph.byId.get(c)!);
}

/** How many of the four layers are written for a concept. Every concept has a picture from its summary. */
export function layersWritten(id: string): number {
  return depthById.has(id) ? LAYERS.length : 1;
}

/** Every concept a list of anchor entries opens onto: the entries and everything beneath them, counted once. */
function idsFor(entries: string[]): Set<string> {
  const all = new Set<string>();
  for (const entry of entries) {
    all.add(entry);
    for (const id of subtree(entry)) all.add(id);
  }
  return all;
}

export function departmentSize(department: Department): number {
  return idsFor(department.entries).size;
}

/** How many of a department's concepts have all four layers written. */
export function departmentWritten(department: Department): number {
  let written = 0;
  for (const id of idsFor(department.entries)) if (depthById.has(id)) written++;
  return written;
}

export function moduleSize(mod: Module): number {
  return idsFor(mod.entries).size;
}

export function moduleWritten(mod: Module): number {
  let written = 0;
  for (const id of idsFor(mod.entries)) if (depthById.has(id)) written++;
  return written;
}

export function courseSize(course: Course): number {
  return idsFor(course.modules.flatMap((m) => m.entries)).size;
}

export function courseWritten(course: Course): number {
  let written = 0;
  for (const id of idsFor(course.modules.flatMap((m) => m.entries))) if (depthById.has(id)) written++;
  return written;
}

/** The nearest department (by ancestry) that shelves this concept, with the trail from its entry down to it. */
export function whereIs(
  id: string,
): { faculty: Faculty; department: Department; course: Course | null; module: Module | null; trail: string[] } | null {
  const entryOf = new Map<string, { faculty: Faculty; department: Department; course: Course | null; module: Module | null }>();
  for (const faculty of faculties) {
    for (const department of faculty.departments) {
      for (const course of coursesFor(department.id)) {
        for (const mod of course.modules) {
          for (const entry of mod.entries) {
            if (!entryOf.has(entry)) entryOf.set(entry, { faculty, department, course, module: mod });
          }
        }
      }
      for (const entry of department.entries) {
        if (!entryOf.has(entry)) entryOf.set(entry, { faculty, department, course: null, module: null });
      }
    }
  }
  // Breadth-first up the parents, so the closest shelf wins.
  const queue: { id: string; trail: string[] }[] = [{ id, trail: [id] }];
  const seen = new Set([id]);
  while (queue.length) {
    const { id: current, trail } = queue.shift()!;
    const shelf = entryOf.get(current);
    if (shelf) return { ...shelf, trail };
    for (const parent of graph.byId.get(current)?.parentIds ?? []) {
      if (!seen.has(parent)) { seen.add(parent); queue.push({ id: parent, trail: [parent, ...trail] }); }
    }
  }
  return null;
}

/** Ranked title-and-summary search. Titles count for far more than the body. */
export function searchConcepts(query: string, limit = 40): ConceptNode[] {
  const terms = query.toLowerCase().split(/\s+/).filter(Boolean);
  if (!terms.length) return [];
  const scored: { node: ConceptNode; score: number }[] = [];
  for (const node of graph.nodes) {
    const title = node.title.toLowerCase();
    const id = node.id.replace(/-/g, " ");
    const body = node.summary.toLowerCase();
    let score = 0;
    let matched = 0;
    for (const term of terms) {
      let s = 0;
      if (title === term) s = 100;
      else if (title.startsWith(term)) s = 60;
      else if (title.includes(term) || id.includes(term)) s = 40;
      else if (body.includes(term)) s = 8;
      if (s) matched++;
      score += s;
    }
    if (matched === terms.length) scored.push({ node, score: score + (depthById.has(node.id) ? 3 : 0) });
  }
  return scored.sort((a, b) => b.score - a.score || a.node.title.localeCompare(b.node.title)).slice(0, limit).map((s) => s.node);
}
