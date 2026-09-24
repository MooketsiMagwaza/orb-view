import type { SourceCard, SourceImage, SourceProvider } from "./types";

const API = "https://collectionapi.metmuseum.org/public/collection/v1";
const CANDIDATES = 8;
const MAX_IMAGES = 4;

type MetObject = {
  title?: string;
  artistDisplayName?: string;
  culture?: string;
  objectDate?: string;
  department?: string;
  primaryImageSmall?: string;
  objectURL?: string;
  isPublicDomain?: boolean;
};

async function loadObject(id: number, signal: AbortSignal): Promise<MetObject | null> {
  try {
    const res = await fetch(`${API}/objects/${id}`, { signal });
    return res.ok ? ((await res.json()) as MetObject) : null;
  } catch (error) {
    if (signal.aborted) throw error;
    return null;
  }
}

/** Public-domain artworks from The Met's open-access collection. */
export const met: SourceProvider = {
  id: "met",
  name: "The Met",
  query: (sources) => sources.met,
  async fetch(query, signal) {
    const res = await fetch(`${API}/search?hasImages=true&isPublicDomain=true&q=${encodeURIComponent(query)}`, { signal });
    if (!res.ok) throw new Error(`The Met responded with ${res.status}`);
    const found = (await res.json()) as { objectIDs?: number[] | null };
    const ids = (found.objectIDs ?? []).slice(0, CANDIDATES);
    if (!ids.length) return null;

    const objects = (await Promise.all(ids.map((id) => loadObject(id, signal)))).filter(
      (o): o is MetObject => !!o && !!o.isPublicDomain && !!o.primaryImageSmall && !!o.objectURL,
    );
    if (!objects.length) return null;

    const images: SourceImage[] = objects.slice(0, MAX_IMAGES).map((o) => ({
      url: o.primaryImageSmall!,
      alt: o.title || query,
      credit: [o.title, o.artistDisplayName || o.culture, o.objectDate].filter(Boolean).join(" · "),
      creditUrl: o.objectURL!,
    }));

    const lead = objects[0];
    const card: SourceCard = {
      provider: "met",
      providerName: "The Metropolitan Museum of Art",
      title: lead.title || query,
      description: [lead.department, lead.objectDate].filter(Boolean).join(" · ") || undefined,
      images,
      url: `https://www.metmuseum.org/art/collection/search?q=${encodeURIComponent(query)}&showOnly=openAccess`,
      linkLabel: "Browse The Met's collection",
      license: { label: "Public domain (The Met Open Access, CC0)", url: "https://www.metmuseum.org/about-the-met/policies-and-documents/open-access" },
      fetchedAt: Date.now(),
    };
    return card;
  },
};
