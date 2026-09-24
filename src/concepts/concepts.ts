import type { OrbState } from "thinking-orbs";
import { toneFor } from "./tone";
import type { ConceptNode, ConceptVoice } from "./types";

/**
 * The concept network is data, not code. Every file under `content/concepts/` is one cluster of ideas
 * (`concepts` plus the `links` that touch them), and every file under `content/links/` is a themed list of
 * extra cross-links. See `content/README.md` for the format and `npm run check:content` to validate it.
 */
export const ROOT_ID = "entropy";

type RawConcept = {
  id: string;
  title: string;
  voice: ConceptVoice;
  orb: OrbState;
  parents: string[];
  /** Exact English Wikipedia article title. */
  wiki: string;
  nasa?: string;
  met?: string;
  summary: string;
  sensitive?: boolean;
  layer?: 2;
};
type Cluster = { cluster: string; concepts?: RawConcept[]; links?: [string, string][] };
type LinkFile = { links?: [string, string][] };

const clusterFiles = import.meta.glob("../../content/concepts/*.json", { eager: true, import: "default" }) as Record<string, Cluster>;
const linkFiles = import.meta.glob("../../content/links/*.json", { eager: true, import: "default" }) as Record<string, LinkFile>;

const sortedByPath = <T>(files: Record<string, T>): T[] =>
  Object.entries(files).sort(([a], [b]) => a.localeCompare(b)).map(([, value]) => value);

export const concepts: ConceptNode[] = (() => {
  const raw = sortedByPath(clusterFiles).flatMap((cluster) => cluster.concepts ?? []);
  const related = new Map<string, Set<string>>(raw.map((c) => [c.id, new Set<string>()]));

  const pairs = [...sortedByPath(clusterFiles), ...sortedByPath(linkFiles)].flatMap((file) => file.links ?? []);
  for (const [a, b] of pairs) {
    const from = related.get(a);
    const to = related.get(b);
    // Static data: a typo should fail loudly instead of quietly dropping a link.
    if (!from || !to) throw new Error(`content/links references an unknown concept: ${a} ↔ ${b}`);
    from.add(b);
    to.add(a);
  }

  return raw.map((c) => ({
    id: c.id,
    title: c.title,
    summary: c.summary,
    parentIds: c.parents,
    relatedIds: [...(related.get(c.id) ?? [])],
    tone: toneFor(c.voice, c.id),
    orb: c.orb,
    sources: { wikipedia: c.wiki, nasa: c.nasa, met: c.met },
    safety: c.sensitive ? "sensitive" : "general",
    layer: c.layer ?? 1,
  }));
})();
