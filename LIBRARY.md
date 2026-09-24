# Library

The library is the home of Orb View: a deck of cards for every subject, organized like a university, where each card opens onto more cards, all the way down. The orb map is one way to look at any of it.

## Three ways to look at the same network

| View | What it is | Route |
| --- | --- | --- |
| **Library** | Faculty squares of decks, with search and filters | `#/` |
| **Page** | One idea, fully explained, with what it's built on above it and what's beneath it below | `#/concept/<id>` |
| **Map** | The orbs, opened on any idea | `#/map/<id>` |

Every card and page has a link, so anything can be bookmarked, shared, and stepped back through.

## How it is organized

```text
Faculty          Engineering & Technology
  Department       Networks & Communications
    Concept deck     Networks
      Concept deck     Physical Layer
        Concept deck     Fiber Optics
        Concept deck     Telephone Network
          Concept page     The First Call
```

- **Faculties and departments** are a small curated layer: `content/library/faculties.json`. They exist to give the library a familiar top: Me, Engineering & Technology, Science, Mathematics & Logic, Humanities, Social Sciences.
- **Everything below a department comes from the concept tree itself.** Any concept with ideas beneath it is a deck, so the library can go as deep as the network does (nine levels today) with no extra structure to maintain.
- A department can shelve several entry concepts, and one concept can be shelved in more than one department. The breadcrumb shows the nearest shelf.

## The depth dial

Each concept can be written in four layers, and the reader chooses how far down to go:

| Layer | Answers | Example for TLS |
| --- | --- | --- |
| **Picture** | What is it? | Two strangers agree on a private language on a public street |
| **Mechanism** | How does it work? | Hello, certificate, key exchange, then everything is scrambled |
| **Detail** | How is it actually done? | The 1.3 handshake, the key exchange, the ciphers, a command to try |
| **Principles** | Why does it work, and why this way? | Slow public keys bootstrap fast shared keys; trust in authorities |

A concept with no depth written yet still has its **picture** (its short note) and links to Wikipedia, and its other layers say so honestly instead of pretending.

### Built on

A concept lists the ideas it assumes (`requires`). curl is built on URLs, DNS, TCP, TLS, HTTP, and HTTPS; TLS is built on public keys, key exchange, certificates, and hashing; and each of those is its own card with its own list. Following "Built on" downward always ends somewhere basic. The validator checks that prerequisites don't loop.

## Search and filters

Search ranks title matches far above matches in the text, and each result shows where it lives. Filters narrow by faculty or to only the concepts written in depth.

## Writing more

The validator's "built on X, which has no depth written yet" warnings are the list of what to write next: the shortest path to a complete branch (`npm run check:content -- --all` prints them all). See [content/README.md](content/README.md) for the file format.

Coverage today: **489 of 900 concepts** are written in all four layers, and every concept has its picture. The finished branches are:

| Branch | Concepts | What it covers |
| --- | --- | --- |
| Data Structures & Algorithms | 140 | Arrays, lists, stacks, queues, hash tables, trees (search trees, B-trees, tries, heaps), graphs; Big O, P vs NP, sorting, searching, recursion, dynamic programming, greedy methods, graph algorithms, backtracking, randomized algorithms, computability, number theory, FFT, streaming sketches, computational geometry |
| Calculus & Analysis | 110 | Functions, limits, derivatives, integrals, series, differential equations (heat, wave, fluids, quantum, light), multivariable and vector calculus, and how calculus was made |
| Linear Algebra | 25 | Vectors, matrices, determinants, eigenvalues, SVD, PCA — the geometry behind graphics, search, and machine learning |
| Reasoning & Debate | 78 | Arguments, evidence, rhetoric; every family of fallacy (formal, relevance, appeals, presumption, causation, evidence) and the cognitive biases beneath them — see the [dedicated debate guide](#a-dedicated-guide-how-to-argue-well) below |
| Probability & Statistics | 60 | Bayes, distributions, the central limit theorem, counting, Markov chains, sampling, regression, hypothesis testing and how it goes wrong, experiments and causal inference |
| Networks (slice) | 10 | From glass and copper up to `curl` |
| Foundations | 40 | Logic, proof, sets, numbers, binary, memory, processes, operating systems, caching, encoding, hashing, cryptography, certificates |
| Philosophy, Economics, Relationships, Taoism | 32 | Four small departments finished end to end: truth/knowledge/reality/existence; trade/money/markets/scarcity; love/attachment/friendship/family; the personal Taoism-and-care thread |

Each Python example in those branches is executed by `npm run check:examples`, so the code on the page runs and prints what the comments say it does (301 examples, 0 failing).

### A dedicated guide: how to argue well

`#/debate` is a standalone page, not a concept card: it pulls together the Reasoning & Debate content into a guide for building a sound argument, debating in good faith, and a field guide to every fallacy family, plus a shuffled 31-question "spot the fallacy" quiz. It's linked from the Reasoning & Debate department page. See `src/debate/`.

### Three things worth knowing

- **Departments overlap on purpose.** A department's count is everything beneath its entry concepts, and decks nest: Pure Mathematics contains Calculus, Probability, and Logic because they hang beneath Mathematics in the tree. The breadcrumb on a page shows its *nearest* shelf.
- **The prose is drafted and spot-checked, not exhaustively reviewed.** Over 60 dated, named, or numeric claims (historical attributions, publication years, study results) have been individually verified against sources so far, turning up one small error (now fixed). That is a sample, not full coverage — a subject expert should still read a layer before treating it as settled, especially outside what has been checked.
- **The Taoism, Care & Letting Go department is written differently on purpose.** It's first-person reflection tied to the user's own relationship with the Tao Te Ching, not the encyclopedic voice used everywhere else — see `content/depth/tao-foundations.json`.

## Not built yet

- Progress: which layers you've read, and a "continue where I left off".
- A guided order through a deck ("read this branch from the bottom up") derived from the prerequisites.
- A pipeline for drafting layers at scale, with review and sources for each claim.

## Work orders (queued, not started)

Requested 2026-09-22, deliberately deferred — do this next, in this order, without re-asking scope questions unless something below is genuinely ambiguous once you're in the code.

### 1. Courses and modules — a fourth tier between Department and the concept tree

Today the hierarchy is only Faculty → Department → (raw concept tree, "any concept with children is a deck"). Add two curated tiers in between so browsing reads like a real university: Faculty → Department → Course → Module → concept decks.

- New file `content/library/courses.json` (new top-level key `"courses"`, sibling to `faculties.json`'s `"faculties"` key — extend `LibraryFile` in `src/library/data.ts` to read both keys from the same glob). Shape:
  ```ts
  type Module = { id: string; title: string; blurb: string; entries: string[] }; // same shape/semantics as Department.entries: anchor concept ids, not exhaustive — subtree() still supplies everything beneath an anchor
  type Course = { id: string; title: string; blurb: string; departmentId: string; modules: Module[] };
  ```
  Give every course and module a globally-unique id (like departments) so routes don't need to be compound.
- New routes in `src/library/route.ts`: `{ kind: "course"; id }`, `{ kind: "module"; id }`.
- New page components in `ConceptPage.tsx` (or a new file): `CoursePage` (breadcrumb Faculty›Department›Course, header, its modules as cards) and `ModulePage` (breadcrumb …›Course›Module, header, its entries as concept cards — same body as today's `DepartmentPage`). New `CourseCard`/`ModuleCard` in `Cards.tsx`, styled like `DepartmentCard`.
- `DepartmentPage`: if `coursesFor(department.id)` is non-empty, render Course cards instead of the raw `department.entries` cards; otherwise keep today's fallback exactly as is. This makes the feature additive — the other ~29 departments are untouched until someone writes courses for them.
- `whereIs()` in `data.ts`: extend to check module-level entries first (most specific), falling back to department-level entries exactly as today. Return shape becomes `{ faculty, department, course: Course | null, module: Module | null, trail }`. Update `Breadcrumbs` in `ConceptPage.tsx` to render the Course/Module links when present.
- Add `moduleSize`/`moduleWritten`/`courseSize`/`courseWritten` (mirror `departmentSize`/`departmentWritten`, unioning `idsFor(entries)` — factor the existing `departmentIds` helper into a shared `idsFor(entries: string[])` used by all four).
- **Do not touch `department.entries` in `faculties.json`.** Courses/modules are a pure additive layer over the same anchors; `departmentSize`/`departmentWritten` keep working unchanged.
- Scope of population: don't try to retrofit all 31 departments. Do the two richest, best-suited departments first as the working demonstration, then stop and let the next request pick which others matter:
  - **Data Structures & Algorithms** (`dsa`, 140 concepts). Already-confirmed children (`node -e` against `content/concepts/*.json`, filtering by `parents`):
    - `data-structures` → `streaming-algorithms, arrays, linked-lists, stacks, queues, hash-tables, trees, graphs, abstract-data-types`
    - `algorithms` → `big-o, sorting, searching, recursion, dynamic-programming, greedy-algorithms, graph-algorithms, backtracking, randomized-algorithms, computability`
    - `modular-arithmetic` → `euclid, sieve, modular-exponentiation`; `computational-geometry` → `convex-hull, closest-pair`; `fft` has no children.
    - Suggested breakdown — Course "Data Structures": modules Foundations (`abstract-data-types`), Linear Structures (`arrays, linked-lists, stacks, queues`), Hashing (`hash-tables`), Trees (`trees`), Graphs (`graphs`). Course "Algorithms": modules Complexity & Limits (`big-o, computability`), Sorting & Searching (`sorting, searching`), Recursion & DP (`recursion, dynamic-programming`), Greedy & Graph Algorithms (`greedy-algorithms, graph-algorithms`), Backtracking & Randomization (`backtracking, randomized-algorithms`). Course "Number Theory & Extras": modules Number Theory (`modular-arithmetic`), Transforms (`fft`), Geometry & Streams (`computational-geometry, streaming-algorithms`).
  - **Calculus & Analysis** (`calculus`, 110 concepts) — confirm its children the same way before drafting; last known shape (from `content/library/faculties.json`'s single `calculus` entry) covers functions/limits, derivatives, integrals, series, differential equations, multivariable/vector calculus, and history. A natural split: Course "Single-Variable Calculus" (Functions & Limits, Derivatives, Integrals, Series), Course "Differential Equations", Course "Multivariable & Vector Calculus", Course "History".
- Update `content/library.schema.json` (add a sibling `courses.schema.json` or extend the existing one) and `tools/validate-content.mjs` if it walks `faculties.json` structurally — check whether it needs to learn about the new file/shape so `npm run check:content` doesn't silently ignore or choke on it.

### 2. Bookmark functionality

- New `src/library/bookmarks.ts`: a small hook, e.g. `useBookmarks()`, backed by `localStorage` (key like `orb-view:bookmarks`, JSON array of concept ids). Wrap every read/write in try/catch (private-mode / blocked storage shouldn't crash the app). Expose `isBookmarked(id)`, `toggle(id)`.
- UI: a star/bookmark toggle button in `ConceptPage`'s `.page__actions` header row, next to Map/Sources. Also worth a small toggle affordance on `ConceptCard` itself (the whole card is an `<a>`, so the star button needs its own `onClick` with `preventDefault`/`stopPropagation`).
- `LibraryHome`: add a `chip-filter` alongside the existing "Written in depth" one — "Bookmarked" — reusing the same `flat`/`results` filtering path that already exists for search and `writtenOnly`.
- This is per-viewer local state (this is a Tauri desktop app, not shared), so `localStorage` is the right call — no backend needed.

### 3. "Liquid Glass" UI pass

Distinct from (and further than) the flatter frosted-glass Apple redesign already shipped this session (`app.css`, `library.css`, `sheets.css` — near-black ink, `backdrop-filter: saturate(180%) blur(20px)` on sticky/floating surfaces, solid blue pills). Apple's *Liquid Glass* material (2025+) is more pronounced: heavier blur+saturation, a specular top-highlight rim simulating light catching a glass edge, and floating capsule/segmented controls where the *container* is glass and the *active* segment is a solid pill floating inside it.

Targets, once picked back up:
- `--shadow-float` and `.control` (the circular floating buttons in map view: back/sound/paths/more): bump to `blur(24px) saturate(200%)`, layer in an inset highlight (`inset 0 1px 1px rgba(255,255,255,0.5), inset 0 -1px 1px rgba(0,0,0,0.04)`) plus a thin edge border (`1px solid rgba(255,255,255,0.3)`), on top of the existing outer shadow.
- `.library__tools` and `.pathbar` (sticky/floating glass panels): same enhanced treatment.
- `.dial` (the depth-dial tabs in `ConceptPage`): restyle as a real segmented control — the `.dial` container becomes a glass capsule (padding + rounded), inactive `.dial__tab`s go transparent so the glass shows through, and `.dial__tab.is-on` becomes a solid rounded pill floating inside with its own soft shadow (mirrors iOS's segmented-control indicator). This is the best-fit surface in the whole app for genuine Liquid Glass, more so than flat content cards.
- `.pill` (solid CTA buttons): keep the solid fill (Apple keeps prominent actions solid, not glass) but consider a subtle top-highlight gloss overlay (`background-image: linear-gradient(180deg, rgba(255,255,255,0.25), transparent 40%)`) for a touch of glass sheen without hurting legibility.
- `.sheet` itself stays solid white (readability over material purism — this matches Apple's own use of Liquid Glass for chrome/navigation, not for body content); only `.sheet__close` and `.sheet-scrim` get the heavier glass/blur treatment.
- Verify `-webkit-backdrop-filter` prefix stays paired with every new `backdrop-filter`, and re-run the mobile-width + reduced-motion checks done for the previous redesign pass.

### 4. Fumadocs integration — a proper documentation site over the whole library

Requested 2026-09-24. Fumadocs (`fumadocs-ui`/`fumadocs-core`/`fumadocs-mdx`) is built around the Next.js App Router; Orb View itself is Vite + React 19 + Tauri, so this is **not** a drop-in addition to the existing app — it's a separate Next.js project that publishes the content as real documentation, not a Tauri-bundled feature.

- New top-level Next.js app (e.g. `docs/`) scaffolded with Fumadocs, sharing nothing at build time with the Vite app except the `content/` data.
- Generate one MDX page per concept from `content/concepts/*.json` + `content/depth/*.json` (all four layers — Picture/Mechanism/Detail/Principles — where written; an honest stub where not, matching the main app's "no depth written yet" pattern rather than hiding the gap).
- Mirror the Faculty → Department → (Course → Module, once work order #1 lands) → concept hierarchy as Fumadocs' page tree, so the sidebar navigation matches the app's own breadcrumb structure in `content/library/faculties.json`.
- Wiki-style cross-linking ("Wikipedia plugin view"): a concept's prose and its `requires` list should render as clickable in-page links to the other concept pages it mentions or depends on, the way Wikipedia links between articles — most likely a remark/rehype plugin (in the spirit of `remark-wiki-link`) that resolves concept ids/titles to the generated Fumadocs routes, rather than plain unlinked text.
- Needs a decision, once picked up, on whether this becomes the canonical way to read the library (eventually superseding `ConceptPage`) or a separate public documentation mirror that lives alongside the desktop app — flagged here rather than guessed at, since it changes how much of this is throwaway vs. long-lived.

Files already read and understood for this queued work (don't re-read from scratch): `src/library/data.ts`, `src/library/route.ts`, `src/library/Cards.tsx`, `src/library/ConceptPage.tsx`, `src/library/LibraryHome.tsx`, `src/app/Root.tsx`, `content/library.schema.json`, `content/library/faculties.json`, `src/styles/app.css`, `src/styles/library.css`, `src/styles/sheets.css`.
