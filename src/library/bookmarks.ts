import { useCallback, useEffect, useState } from "react";

const KEY = "orb-view:bookmarks";
const listeners = new Set<() => void>();

function read(): string[] {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function write(ids: string[]) {
  try {
    localStorage.setItem(KEY, JSON.stringify(ids));
  } catch {
    /* private mode or blocked storage: bookmarks just won't persist */
  }
}

/** Bookmarked concept ids, kept in localStorage and shared live across every component that calls this hook. */
export function useBookmarks() {
  const [ids, setIds] = useState<string[]>(() => read());

  useEffect(() => {
    const onChange = () => setIds(read());
    listeners.add(onChange);
    return () => { listeners.delete(onChange); };
  }, []);

  const toggle = useCallback((id: string) => {
    const current = read();
    const next = current.includes(id) ? current.filter((x) => x !== id) : [...current, id];
    write(next);
    for (const listener of listeners) listener();
  }, []);

  const isBookmarked = useCallback((id: string) => ids.includes(id), [ids]);

  return { ids, isBookmarked, toggle };
}
