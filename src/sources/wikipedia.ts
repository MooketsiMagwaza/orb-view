import type { SourceCard, SourceImage, SourceProvider } from "./types";

const API = "https://en.wikipedia.org/api/rest_v1";
const CC_BY_SA = { label: "Text under CC BY-SA 4.0", url: "https://creativecommons.org/licenses/by-sa/4.0/" };
/** Wikimedia only serves thumbnails at a fixed set of widths; 960 is one of them. */
const LEAD_WIDTH = 960;
const MAX_EXTRA_IMAGES = 3;

type Summary = {
  type: string;
  title: string;
  description?: string;
  extract?: string;
  thumbnail?: { source: string; width: number; height: number };
  originalimage?: { source: string; width: number; height: number };
  content_urls?: { desktop?: { page?: string } };
};

type MediaItem = {
  type: string;
  title?: string;
  showInGallery?: boolean;
  leadImage?: boolean;
  caption?: { text?: string };
  srcset?: { src: string }[];
};

const readableFileName = (name: string) =>
  decodeURIComponent(name).replace(/\.[a-z0-9]+$/i, "").replace(/_/g, " ").trim();

/** Where an image's author and license live: the Commons (or local Wikipedia) file page. */
function filePageFor(url: string): { name: string; page: string } | null {
  const match = /\/wikipedia\/(commons|en)\/(?:thumb\/)?[0-9a-f]\/[0-9a-f]{2}\/([^/]+)/i.exec(url);
  if (!match) return null;
  const host = match[1].toLowerCase() === "commons" ? "https://commons.wikimedia.org" : "https://en.wikipedia.org";
  return { name: match[2], page: `${host}/wiki/File:${match[2]}` };
}

/** A lead image sized for a sheet, without asking for a width larger than the original. */
function leadImageUrl(summary: Summary): string | undefined {
  const thumb = summary.thumbnail?.source;
  const original = summary.originalimage;
  if (!thumb) return original?.source;
  const isSvg = /\.svg\//i.test(thumb);
  if ((original && original.width >= LEAD_WIDTH) || isSvg) return thumb.replace(/\/\d+px-/, `/${LEAD_WIDTH}px-`);
  return original?.source ?? thumb;
}

async function extraImages(slug: string, exclude: string | undefined, signal: AbortSignal): Promise<SourceImage[]> {
  try {
    const res = await fetch(`${API}/page/media-list/${slug}`, { signal });
    if (!res.ok) return [];
    const list = (await res.json()) as { items?: MediaItem[] };
    const images: SourceImage[] = [];
    for (const item of list.items ?? []) {
      if (images.length >= MAX_EXTRA_IMAGES) break;
      if (item.type !== "image" || !item.showInGallery || item.leadImage || !item.title || !item.srcset?.length) continue;
      const fileName = item.title.replace(/^File:/i, "");
      if (exclude && fileName === exclude) continue;
      const src = item.srcset[item.srcset.length - 1].src;
      images.push({
        url: src.startsWith("//") ? `https:${src}` : src,
        alt: item.caption?.text || readableFileName(fileName),
        credit: "Wikimedia Commons",
        creditUrl: `https://commons.wikimedia.org/wiki/${encodeURI(item.title.replace(/ /g, "_"))}`,
      });
    }
    return images;
  } catch (error) {
    if (signal.aborted) throw error;
    return []; // the extra images are a bonus; the summary is what matters
  }
}

/** Summary and lead image only: one request. Used for small previews such as path covers. */
export async function fetchWikipediaSummary(title: string, signal: AbortSignal, withExtraImages = false): Promise<SourceCard | null> {
    const slug = encodeURIComponent(title.replace(/ /g, "_"));
    const res = await fetch(`${API}/page/summary/${slug}`, { signal });
    if (res.status === 404) return null;
    if (!res.ok) throw new Error(`Wikipedia responded with ${res.status}`);
    const summary = (await res.json()) as Summary;
    if (summary.type === "disambiguation") return null;

    const images: SourceImage[] = [];
    const leadUrl = leadImageUrl(summary);
    const file = leadUrl ? filePageFor(leadUrl) : null;
    if (leadUrl) {
      images.push({
        url: leadUrl,
        alt: file ? readableFileName(file.name) : summary.title,
        credit: file?.page.includes("commons.") ? "Wikimedia Commons" : "Wikipedia",
        creditUrl: file?.page ?? summary.content_urls?.desktop?.page ?? `https://en.wikipedia.org/wiki/${slug}`,
      });
    }
    if (withExtraImages) images.push(...(await extraImages(slug, file ? decodeURIComponent(file.name) : undefined, signal)));

    const card: SourceCard = {
      provider: "wikipedia",
      providerName: "Wikipedia",
      title: summary.title,
      description: summary.description,
      extract: summary.extract,
      images,
      url: summary.content_urls?.desktop?.page ?? `https://en.wikipedia.org/wiki/${slug}`,
      linkLabel: "Read on Wikipedia",
      license: CC_BY_SA,
      fetchedAt: Date.now(),
    };
    return card;
}

export const wikipedia: SourceProvider = {
  id: "wikipedia",
  name: "Wikipedia",
  query: (sources) => sources.wikipedia,
  fetch: (title, signal) => fetchWikipediaSummary(title, signal, true),
};
