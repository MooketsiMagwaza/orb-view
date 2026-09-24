import { useCallback, useEffect, useState } from "react";
import type { ConceptSources } from "../concepts/types";
import { withCache } from "./cache";
import { fetchWikipediaSummary, wikipedia } from "./wikipedia";
import { met } from "./met";
import { nasa } from "./nasa";
import type { SourceCard, SourceProvider } from "./types";

/**
 * Every place more information can come from. Adding one is: implement `SourceProvider`, add it here,
 * and give concepts a query for it (see SOURCES.md).
 */
export const providers: SourceProvider[] = [wikipedia, nasa, met];

/** Shared requests are never cancelled by one consumer leaving; each consumer just ignores late results. */
const NEVER_ABORTED = new AbortController().signal;

export type SourceEntry = {
  provider: SourceProvider;
  status: "loading" | "ready" | "empty" | "error";
  card?: SourceCard;
  message?: string;
};

/**
 * Loads a concept's sources on demand. Nothing is requested until this runs (the info sheet is opened),
 * results are cached for a week, and closing the sheet simply stops listening for late answers.
 */
export function useConceptSources(sources: ConceptSources, key: string) {
  const [entries, setEntries] = useState<SourceEntry[]>([]);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    const active = providers.filter((provider) => provider.query(sources));
    setEntries(active.map((provider) => ({ provider, status: "loading" as const })));
    let cancelled = false;

    const update = (id: string, patch: Partial<SourceEntry>) => {
      if (!cancelled) setEntries((current) => current.map((entry) => (entry.provider.id === id ? { ...entry, ...patch } : entry)));
    };

    for (const provider of active) {
      const query = provider.query(sources)!;
      // Requests are shared and never cancelled: leaving early just means the answer lands in the cache.
      withCache(provider.id, query, () => provider.fetch(query, NEVER_ABORTED))
        .then((card) => update(provider.id, card ? { status: "ready", card } : { status: "empty" }))
        .catch((error: unknown) => update(provider.id, { status: "error", message: error instanceof Error ? error.message : "Could not load" }));
    }
    return () => { cancelled = true; };
    // `key` identifies the concept; `sources` is derived from it and is stable for a given concept.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, attempt]);

  const retry = useCallback(() => setAttempt((n) => n + 1), []);
  return { entries, retry };
}

/** A small Wikipedia preview (title, description, lead image), for path covers. One request, cached. */
export function useWikipediaPreview(title: string | undefined, enabled: boolean) {
  const [card, setCard] = useState<SourceCard | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (!title || !enabled) return;
    let cancelled = false;
    setFailed(false);
    withCache("wikipedia", `preview:${title}`, () => fetchWikipediaSummary(title, NEVER_ABORTED))
      .then((result) => { if (!cancelled) setCard(result); })
      .catch(() => { if (!cancelled) setFailed(true); });
    return () => { cancelled = true; };
  }, [title, enabled]);

  return { card, failed };
}
