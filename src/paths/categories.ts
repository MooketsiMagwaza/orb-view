import type { OrbState } from "thinking-orbs";
import type { ConceptVoice } from "../concepts/types";

/**
 * A category is a way in: a place to start and a short trail of ideas to follow one at a time.
 * Each lives in its own file under `content/categories/` (see `content/README.md`).
 */
export type Category = {
  id: string;
  group: string;
  /** Position within its group; lower comes first. */
  order?: number;
  title: string;
  blurb: string;
  orb: OrbState;
  /** The concept the network opens on. Always the first step of `path`. */
  entry: string;
  path: string[];
  /** Wikipedia article for the cover image; defaults to the entry concept's article. */
  cover?: { wikipedia: string };
};

const files = import.meta.glob("../../content/categories/*.json", { eager: true, import: "default" }) as Record<string, Category>;

/** Groups appear in this order; anything unlisted follows alphabetically. */
export const GROUP_ORDER = ["Me", "Tech", "People", "Science", "Culture", "Abstract"];

/** Each group borrows a voice so its orbs share a blue. */
export const GROUP_VOICE: Record<string, ConceptVoice> = {
  Me: "restless",
  Tech: "precise",
  People: "human",
  Science: "vast",
  Culture: "layered",
  Abstract: "lucid",
};

export const categories: Category[] = Object.values(files).sort(
  (a, b) => (a.order ?? 99) - (b.order ?? 99) || a.title.localeCompare(b.title),
);

export const categoriesById = new Map(categories.map((c) => [c.id, c]));

export const categoryGroups: { group: string; items: Category[] }[] = (() => {
  const groups = [...new Set(categories.map((c) => c.group))].sort((a, b) => {
    const ia = GROUP_ORDER.indexOf(a);
    const ib = GROUP_ORDER.indexOf(b);
    return (ia < 0 ? 99 : ia) - (ib < 0 ? 99 : ib) || a.localeCompare(b);
  });
  return groups.map((group) => ({ group, items: categories.filter((c) => c.group === group) }));
})();
