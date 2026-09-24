import { useCallback, useEffect, useState } from "react";

/** The library is addressed by hash, so every card and page has a link that can be shared, bookmarked, and stepped back through. */
export type Route =
  | { kind: "library" }
  | { kind: "department"; id: string }
  | { kind: "course"; id: string }
  | { kind: "module"; id: string }
  | { kind: "concept"; id: string }
  | { kind: "map"; id: string }
  | { kind: "debate" }
  | { kind: "study-japan" };

export function parseRoute(hash: string): Route {
  const [, kind, id] = hash.replace(/^#/, "").split("/");
  if (kind === "debate") return { kind: "debate" };
  if (kind === "study-japan") return { kind: "study-japan" };
  if (id && (kind === "department" || kind === "course" || kind === "module" || kind === "concept" || kind === "map")) {
    return { kind, id: decodeURIComponent(id) };
  }
  return { kind: "library" };
}

export function hrefFor(route: Route): string {
  if (route.kind === "library") return "#/";
  if (route.kind === "debate") return "#/debate";
  if (route.kind === "study-japan") return "#/study-japan";
  return `#/${route.kind}/${encodeURIComponent(route.id)}`;
}

export function useRoute(): [Route, (route: Route) => void] {
  const [route, setRoute] = useState<Route>(() => parseRoute(window.location.hash));

  useEffect(() => {
    const onChange = () => setRoute(parseRoute(window.location.hash));
    window.addEventListener("hashchange", onChange);
    return () => window.removeEventListener("hashchange", onChange);
  }, []);

  const go = useCallback((next: Route) => {
    window.location.hash = hrefFor(next);
  }, []);

  return [route, go];
}
