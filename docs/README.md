# Orb View docs

A separate Next.js + [Fumadocs](https://fumadocs.dev) site that publishes the whole concept
library as real, browsable documentation: Faculty → Department → (Course → Module)? → concept
tree, mirroring the Vite app's own hierarchy exactly. It shares nothing at build time with the
Vite/Tauri app one level up except the `../content/**` data — this is not part of the desktop
app's bundle.

## Generating the content

`content/docs/**` is entirely generated from `../content/**` (concepts, depth, faculties,
courses) and is not committed — `npm run dev` and `npm run build` both regenerate it first
(`predev`/`prebuild`). To regenerate by hand:

```bash
npm run generate
```

See `scripts/generate-content.mjs`. Two things worth knowing about it:

- **Ownership.** A concept can be a descendant of more than one department's tree on purpose
  (departments overlap in the source content — see the root `LIBRARY.md`), so the script computes
  each concept's one true "home" with the same nearest-registered-anchor rule the app's `whereIs()`
  uses, and only nests a concept under a parent that shares that home. A department that has
  courses (currently `dsa` and `calculus`) also gets an "Also in this department" section for the
  handful of entries a course/module didn't absorb (e.g. the `algorithms` concept itself, once its
  children are redistributed into course modules) — mirroring that they still have their own page
  in the app, just not a department-grid card.
- **Wiki-style linking.** A concept's prose can mention another concept by its exact title; the
  generator turns that into a Markdown link to that concept's page, the way Wikipedia auto-links a
  term — done at generation time as plain links rather than as a live remark plugin, so it doesn't
  depend on fumadocs-mdx's fast-moving plugin internals.

## Development

```bash
npm run dev
```

Open http://localhost:3000/docs.

## Layout

| Route                     | Description                                    |
| ------------------------- | ----------------------------------------------- |
| `app/(home)`              | Landing page.                                    |
| `app/docs`                | The documentation layout and pages.              |
| `app/api/search/route.ts` | The Route Handler for search.                    |
| `lib/source.ts`           | Fumadocs content source (`loader()`), unmodified from the scaffold. |
| `scripts/generate-content.mjs` | Reads `../content/**`, writes `content/docs/**`. |
