import type { ConceptSources } from "../concepts/types";

export type SourceId = "wikipedia" | "nasa" | "met";

export type SourceImage = {
  url: string;
  alt: string;
  /** Who or what to credit, shown under the image. */
  credit: string;
  /** Where that credit points: the file page, the museum object, or the archive item. */
  creditUrl: string;
};

/**
 * Everything the info sheet shows for one provider. Cards always carry their license and a link back to
 * the original page, so attribution can't be forgotten by whichever component renders them.
 */
export type SourceCard = {
  provider: SourceId;
  providerName: string;
  title: string;
  description?: string;
  extract?: string;
  images: SourceImage[];
  /** The page to read more on. */
  url: string;
  linkLabel: string;
  license: { label: string; url: string };
  fetchedAt: number;
};

/**
 * A place to pull more information from. Adding one means: pick the concept field that holds its query,
 * write `fetch`, and register it in `providers`. `fetch` returns `null` when there is nothing relevant
 * (that is not an error) and throws when the source could not be reached.
 */
export type SourceProvider = {
  id: SourceId;
  name: string;
  query: (sources: ConceptSources) => string | undefined;
  fetch: (query: string, signal: AbortSignal) => Promise<SourceCard | null>;
};
