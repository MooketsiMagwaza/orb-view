import type { SourceCard, SourceImage, SourceProvider } from "./types";

const API = "https://images-api.nasa.gov";
const MAX_IMAGES = 4;

type Item = {
  data?: { title?: string; nasa_id?: string; description?: string; center?: string }[];
  links?: { href: string; rel?: string; render?: string }[];
};

/** NASA descriptions can be long and carry markup; keep the first couple of sentences as plain text. */
function plainExcerpt(html: string | undefined, limit = 260): string | undefined {
  if (!html) return undefined;
  const text = html.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
  if (!text) return undefined;
  if (text.length <= limit) return text;
  const cut = text.slice(0, limit);
  const end = Math.max(cut.lastIndexOf(". "), cut.lastIndexOf("? "));
  return end > 80 ? cut.slice(0, end + 1) : `${cut.slice(0, cut.lastIndexOf(" "))}…`;
}

export const nasa: SourceProvider = {
  id: "nasa",
  name: "NASA",
  query: (sources) => sources.nasa,
  async fetch(query, signal) {
    const res = await fetch(`${API}/search?media_type=image&page_size=8&q=${encodeURIComponent(query)}`, { signal });
    if (!res.ok) throw new Error(`NASA responded with ${res.status}`);
    const json = (await res.json()) as { collection?: { items?: Item[] } };
    const items = json.collection?.items ?? [];

    const images: SourceImage[] = [];
    let first: Item["data"] extends (infer T)[] | undefined ? T | undefined : never;
    for (const item of items) {
      const data = item.data?.[0];
      const link = item.links?.find((l) => l.render === "image") ?? item.links?.[0];
      if (!data?.nasa_id || !link?.href) continue;
      first ??= data;
      images.push({
        url: link.href,
        alt: data.title ?? query,
        credit: `NASA${data.center ? ` / ${data.center}` : ""}`,
        creditUrl: `https://images.nasa.gov/details/${encodeURIComponent(data.nasa_id)}`,
      });
      if (images.length >= MAX_IMAGES) break;
    }
    if (!images.length) return null;

    const card: SourceCard = {
      provider: "nasa",
      providerName: "NASA Image and Video Library",
      title: first?.title ?? query,
      extract: plainExcerpt(first?.description),
      images,
      url: `https://images.nasa.gov/search?q=${encodeURIComponent(query)}`,
      linkLabel: "See more at NASA",
      license: { label: "NASA media: generally free to use with credit", url: "https://www.nasa.gov/nasa-brand-center/images-and-media/" },
      fetchedAt: Date.now(),
    };
    return card;
  },
};
