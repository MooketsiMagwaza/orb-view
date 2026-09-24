import type { SourceCard, SourceId } from "./types";

/** Source text and image links rarely change; a week keeps the app quick and the providers unbothered. */
const TTL_MS = 7 * 24 * 60 * 60 * 1000;
const PREFIX = "orb-view:sources:v1:";

type Stored = { at: number; card: SourceCard | null };

const memory = new Map<string, Stored>();
const inflight = new Map<string, Promise<SourceCard | null>>();

function readStored(key: string): Stored | null {
  try {
    const raw = window.localStorage.getItem(PREFIX + key);
    return raw ? (JSON.parse(raw) as Stored) : null;
  } catch {
    return null;
  }
}

function writeStored(key: string, value: Stored) {
  try {
    window.localStorage.setItem(PREFIX + key, JSON.stringify(value));
  } catch {
    /* storage may be full or unavailable; the memory cache still works for this session */
  }
}

/**
 * Serve a provider result from memory or localStorage when it is fresh, otherwise load it once
 * (concurrent callers share the same request). Failures are never cached, so a retry really retries.
 */
export function withCache(provider: SourceId, query: string, load: () => Promise<SourceCard | null>): Promise<SourceCard | null> {
  const key = `${provider}:${query.toLowerCase()}`;
  const fresh = (entry: Stored | null | undefined): entry is Stored => !!entry && Date.now() - entry.at < TTL_MS;

  const inMemory = memory.get(key);
  if (fresh(inMemory)) return Promise.resolve(inMemory.card);
  const stored = readStored(key);
  if (fresh(stored)) {
    memory.set(key, stored);
    return Promise.resolve(stored.card);
  }

  const pending = inflight.get(key);
  if (pending) return pending;

  const request = load()
    .then((card) => {
      const entry = { at: Date.now(), card };
      memory.set(key, entry);
      writeStored(key, entry);
      return card;
    })
    .finally(() => inflight.delete(key));
  inflight.set(key, request);
  return request;
}
