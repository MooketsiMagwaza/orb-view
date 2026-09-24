// Turns a depth "source" module into content/depth/<name>.json.
//
//   node tools/build-depth.mjs my-depth.mjs calc-something
//
// Why: code examples inside JSON need every quote and newline escaped, which is miserable to write and to read.
// In a module, the same text is written with backtick strings, so code and paragraphs stay as they look:
//
//   export default {
//     description: "One line on what this file covers.",
//     depth: [
//       { id: "hash-tables",
//         picture: `A cabinet of numbered drawers.`,
//         mechanism: `…`,
//         detail: `First paragraph.
//
//   Second paragraph.`,
//         example: { label: "A tiny table", code: `
//   table = {}
//   table["apple"] = 3
//   ` },
//         principles: `…`,
//         requires: ["arrays"] },
//     ],
//   };
//
// For code that contains backslashes (regular expressions, "\n"), write it as String.raw`…` so they survive.
// Afterwards run `npm run check:content` and `npm run check:examples`.
import { writeFileSync } from "node:fs";
import { pathToFileURL } from "node:url";
import { resolve, join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const [source, name] = process.argv.slice(2);
if (!source || !name) {
  console.error("usage: node tools/build-depth.mjs <source-module.mjs> <output-name>");
  process.exit(1);
}

const { default: data } = await import(pathToFileURL(resolve(source)).href);

const depth = data.depth.map((entry) => {
  const out = {
    id: entry.id,
    picture: entry.picture.trim(),
    mechanism: entry.mechanism.trim(),
    detail: entry.detail.trim().replace(/\n[ \t]+/g, "\n"),
    principles: entry.principles.trim(),
  };
  if (entry.example) out.example = { label: entry.example.label.trim(), code: entry.example.code.replace(/^\n/, "").replace(/\s+$/, "") };
  if (entry.requires?.length) out.requires = entry.requires;
  return out;
});

const target = join(dirname(fileURLToPath(import.meta.url)), "..", "content", "depth", `${name}.json`);
writeFileSync(target, `${JSON.stringify({ $schema: "../depth.schema.json", description: data.description, depth }, null, 2)}\n`);
console.log(`wrote ${depth.length} entries → content/depth/${name}.json`);
