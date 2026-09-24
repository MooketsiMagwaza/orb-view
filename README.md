# Orb View

Orb View is a visual learning app for exploring how ideas connect. Browse a library of concepts, follow guided learning paths, or move through an open map of connected ideas. It is built with React, TypeScript, Vite, and Tauri 2.

## What you can do

- Browse and search a concept library organized into subject areas.
- Open a concept to explore its layers, prerequisites, related ideas, and examples.
- Explore the concept graph by expanding nodes, panning, and zooming.
- Focus on an idea to read a short explanation and open its sources.
- Follow curated learning paths, including a debate guide and a Japan study guide.
- Use keyboard navigation, synthesized interaction sounds, and reduced-motion support.

## Get started

Install Node.js and npm, then run:

```sh
npm install
npm run dev
```

Open the local address printed by Vite (the development server uses port `1420`).

To run the desktop app, install the Rust toolchain and platform prerequisites required by [Tauri 2](https://v2.tauri.app/start/prerequisites/), then run:

```sh
npm run tauri dev
```

## Useful commands

| Command | Purpose |
| --- | --- |
| `npm run dev` | Start the web development server |
| `npm run build` | Type-check and build the web app |
| `npm run preview` | Preview the production web build |
| `npm run tauri dev` | Run the desktop app in development |
| `npm run tauri build` | Package the desktop app |
| `npm run check:content` | Validate concept data, links, and learning paths |
| `npm run check:examples` | Check runnable code examples in the content |

## Content

Concepts, categories, learning paths, and cross-links live in [`content/`](content/README.md) as JSON. The content guide explains the data formats and how to contribute or validate changes. The app fetches source material on demand from Wikipedia, NASA, and The Met; see [SOURCES.md](SOURCES.md) for details and attribution behavior.

## Project docs

- [IDEA.md](IDEA.md) — product idea and guiding principles
- [VISION.md](VISION.md) — intended feeling and direction
- [LIBRARY.md](LIBRARY.md) — library structure and concept pages
- [CONTENT-MAP.md](CONTENT-MAP.md) — concept hierarchy and example paths
- [INTERACTIONS.md](INTERACTIONS.md) — gestures, keyboard, sound, and motion
- [UI.md](UI.md) — visual system and layouts
- [ORBS.md](ORBS.md) — orb forms and their motion
- [ARCHITECTURE.md](ARCHITECTURE.md) — implementation architecture
- [SOURCES.md](SOURCES.md) — external sources and image credits

## Technology

- [React](https://react.dev/) and TypeScript
- [Vite](https://vite.dev/)
- [Tauri 2](https://v2.tauri.app/)
- [`thinking-orbs`](https://github.com/Jakubantalik/thinking-orbs)
- Web Audio API

## Status

Orb View is an actively developed project. The design documents describe the product direction; the running app is the best reference for currently implemented behavior.
