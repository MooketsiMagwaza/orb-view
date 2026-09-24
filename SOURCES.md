# Sources

The short explanation you get on hold is written by hand and always works offline. Behind it, the info sheet (the chevron beside the back control while an explanation is held) pulls more from open sources: article text, images, and credits. This document explains how, and how to add more.

## What is pulled today

| Provider | What it returns | Used for | Licence |
| --- | --- | --- | --- |
| **Wikipedia** (REST API) | Title, one-line description, the lead-section summary, a lead image, up to three more images from the article | Every concept (`wiki` is an exact article title) | Text CC BY-SA 4.0; each image has its own licence on its file page, linked as its credit |
| **NASA Image and Video Library** | Up to four images with titles and a short description | Space and Earth concepts (`nasa` is a search phrase) | NASA media is generally free to use with credit, and each image links to its archive entry |
| **The Met Open Access** | Up to four public-domain artworks with title, artist, and date | Art and culture concepts (`met` is a search phrase) | Public domain (CC0), each linked to its museum object page |

All three send browser-friendly CORS headers, so the app calls them directly. No key or account is involved, and no personal data is sent: only the article title or search phrase.

## When and how it loads

1. **Only on request.** Nothing is fetched until the info sheet or a path's cover is opened. Holding an orb, exploring, and reading the note never touch the network.
2. **Cached for a week** in memory and `localStorage`, keyed by provider and query, so reopening is instant and the providers are not asked twice. Failures are never cached, so *Try again* really retries.
3. **Shared requests.** Two openings of the same concept share one request. Requests are not cancelled when the sheet closes; the answer simply lands in the cache.
4. **Fails quietly.** If a provider is unreachable the card says so and offers a retry. The written note is always still there.
5. **Attribution is part of the data.** Every card carries its licence and a link back to the source page, and every image carries a credit link, so no component can forget them.

## Structure

```text
src/sources/
├── types.ts               SourceCard, SourceImage, SourceProvider
├── cache.ts               memory + localStorage cache with a one-week lifetime, shared in-flight requests
├── wikipedia.ts           summary, lead image, gallery images (fetchWikipediaSummary is reused for path covers)
├── nasa.ts
├── met.ts
└── useConceptSources.ts   the provider list, the loading hook, and the small Wikipedia preview hook
```

## Adding a source

A provider is one small object:

```ts
export const openLibrary: SourceProvider = {
  id: "openlibrary",
  name: "Open Library",
  query: (sources) => sources.openlibrary,            // which concept field holds this provider's query
  async fetch(query, signal) {
    // return a SourceCard, null when nothing relevant was found, or throw when the source can't be reached
  },
};
```

Then: add its id to `SourceId` in `types.ts`, add it to `providers` in `useConceptSources.ts`, add the optional query field to `ConceptSources` and the concept schema, and give some concepts a query. The sheet renders every provider's card the same way.

Good candidates: **Wikidata** (structured facts and dates), **Wikimedia Commons** (per-image licence and author), **Open Library** (books to read next), **Internet Archive**, **Stanford Encyclopedia of Philosophy** for the abstract concepts, and a hand-picked **curated links** provider for reading lists that a search can't find.

## Wikipedia's rules of the road

- Text is CC BY-SA 4.0: attribute it and link to the article. The card does both.
- Image licences vary; always link to the file page. The credit under each image does.
- Wikimedia asks automated clients to identify themselves and stay polite. Browsers can't set a `User-Agent`, which is one reason to move fetching into the Tauri shell (below). Requests here are on-demand and cached, well within normal use.
- Thumbnails are only served at fixed widths, so the code asks for 960 px and never for a width larger than the original.

## Tauri

The desktop app fetches from the webview the same way the web build does; `csp` is unset, so requests go through. Two follow-ups make the desktop build a better citizen:

1. **Open links in the default browser.** Add `@tauri-apps/plugin-opener`, register it in `src-tauri/src/lib.rs`, and grant `opener:default` in the capability file. Source and credit links are ordinary `<a target="_blank">` elements today, which is right for the web and needs the plugin inside the app.
2. **Move fetching into a Rust command** with a proper `User-Agent`, a disk cache, and offline behavior. The React layer would call `invoke("fetch_source", { provider, query })` and receive the same `SourceCard`, so nothing else changes. That is also where credentials for any future keyed source or a model-generated explanation would live, never in the frontend.

## Not built yet

Per-image licence lookup from Commons, Wikidata facts, a curated reading list per concept, a way for someone to add their own notes and sources, and model-generated connections within curated boundaries.
