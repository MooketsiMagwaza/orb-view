// Structural checks for the concept network and the categories that enter it.
//   npm run check:content          validate everything
//   npm run check:content -- --balance --fix   also re-pick repeated sibling orbs
//   npm run check:content -- --fix rewrite content files in canonical form, dropping dangling,
//                                  duplicate, self, and parent/child links
import { readFileSync, readdirSync, writeFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..", "content");
const ROOT_ID = "entropy";
const ORBS = ["working", "searching", "solving", "listening", "connecting", "weaving", "composing", "breathing", "shaping"];
const VOICES = ["restless", "precise", "layered", "human", "quiet", "mechanical", "vast", "lucid"];
const FIX = process.argv.includes("--fix");
const BALANCE = process.argv.includes("--balance");

const readDir = (dir) =>
  readdirSync(join(root, dir))
    .filter((name) => name.endsWith(".json"))
    .sort()
    .map((name) => ({ name, path: join(root, dir, name), data: JSON.parse(readFileSync(join(root, dir, name), "utf8")) }));

const clusters = readDir("concepts");
const categoryFiles = readDir("categories");
const linkFiles = readDir("links");
const depthFiles = readDir("depth");
const libraryFiles = readDir("library");

const errors = [];
const warnings = [];
const notes = [];

// ── Concepts ────────────────────────────────────────────────────────────
const byId = new Map();
const fileOf = new Map();
for (const file of clusters) {
  for (const c of file.data.concepts ?? []) {
    if (byId.has(c.id)) errors.push(`${file.name}: duplicate id "${c.id}" (also in ${fileOf.get(c.id)})`);
    byId.set(c.id, c);
    fileOf.set(c.id, file.name);
  }
}

const isParentChild = (a, b) => byId.get(a)?.parents.includes(b) || byId.get(b)?.parents.includes(a);

// Links: collect, normalize, and (with --fix) drop the ones that can't stand.
const links = new Set();
for (const file of [...clusters, ...linkFiles]) {
  const kept = [];
  const seen = new Set();
  for (const [a, b] of file.data.links ?? []) {
    const key = [a, b].sort().join("~");
    const problem = !byId.has(a) || !byId.has(b) ? "unknown id" : a === b ? "self link" : isParentChild(a, b) ? "parent/child" : links.has(key) || seen.has(key) ? "duplicate" : null;
    if (problem) {
      (FIX ? notes : errors).push(`${file.name}: ${FIX ? "dropped" : "bad"} link ${a} ↔ ${b} (${problem})`);
      continue;
    }
    seen.add(key);
    links.add(key);
    kept.push([a, b]);
  }
  file.data.links = kept;
}

const relatedCount = new Map([...byId.keys()].map((id) => [id, 0]));
for (const key of links) for (const id of key.split("~")) relatedCount.set(id, relatedCount.get(id) + 1);

const root_ = byId.get(ROOT_ID);
if (!root_) errors.push(`missing root "${ROOT_ID}"`);
else if (root_.parents.length) errors.push("root must not have parents");

for (const c of byId.values()) {
  const where = fileOf.get(c.id);
  if (c.id !== ROOT_ID && c.parents.length === 0) errors.push(`${where}: "${c.id}" has no parent`);
  for (const p of c.parents) {
    if (!byId.has(p)) errors.push(`${where}: "${c.id}" lists unknown parent "${p}"`);
    if (p === c.id) errors.push(`${where}: "${c.id}" is its own parent`);
  }
  if (c.layer === 2 && c.parents.length !== 1) errors.push(`${where}: layer-2 node "${c.id}" must have exactly one parent`);
  if (c.title.length > 24) errors.push(`${where}: title too long for a label: "${c.title}"`);
  if (!ORBS.includes(c.orb)) errors.push(`${where}: "${c.id}" has an unknown orb form "${c.orb}"`);
  if (!VOICES.includes(c.voice)) errors.push(`${where}: "${c.id}" has an unknown voice "${c.voice}"`);
  if (!c.wiki) errors.push(`${where}: "${c.id}" has no Wikipedia article`);
  const words = c.summary.trim().split(/\s+/).length;
  if (words > 65) errors.push(`${where}: summary for "${c.id}" is ${words} words (max 65)`);
  if (words < 15) errors.push(`${where}: summary for "${c.id}" is ${words} words (min 15)`);
  const n = relatedCount.get(c.id);
  if (n < 3) warnings.push(`"${c.id}" has only ${n} cross-link${n === 1 ? "" : "s"}`);
}

// Reachability and acyclicity over parent links.
const children = new Map([...byId.keys()].map((id) => [id, []]));
for (const c of byId.values()) for (const p of c.parents) children.get(p)?.push(c.id);
const reached = new Set();
const stack = [ROOT_ID];
while (stack.length) {
  const id = stack.pop();
  if (reached.has(id)) continue;
  reached.add(id);
  stack.push(...(children.get(id) ?? []));
}
for (const id of byId.keys()) if (!reached.has(id)) errors.push(`"${id}" is not reachable from the root`);

const visiting = new Set();
const done = new Set();
const depth = new Map([[ROOT_ID, 0]]);
const visit = (id, path) => {
  if (done.has(id)) return;
  if (visiting.has(id)) return void errors.push(`cycle: ${[...path, id].join(" → ")}`);
  visiting.add(id);
  for (const childId of children.get(id) ?? []) {
    depth.set(childId, Math.max(depth.get(childId) ?? 0, (depth.get(id) ?? 0) + 1));
    visit(childId, [...path, id]);
  }
  visiting.delete(id);
  done.add(id);
};
visit(ROOT_ID, []);

// A ring of ideas should be easy to tell apart: siblings should not share an orb form,
// and no fan may hold more children than the layout can place cleanly.
for (const parent of byId.values()) {
  for (const layer of [1, 2]) {
    const ring = [...byId.values()].filter((n) => n.parents[0] === parent.id && (n.layer ?? 1) === layer);
    const seen = new Map();
    for (const n of ring) {
      // Only nine forms exist, so a ring of ten cannot avoid one repeat.
      if (seen.has(n.orb) && ring.length <= ORBS.length) warnings.push(`siblings under "${parent.id}" share the "${n.orb}" orb: ${seen.get(n.orb)}, ${n.id}`);
      else seen.set(n.orb, n.id);
    }
    const limit = parent.id === ROOT_ID && layer === 1 ? 9 : 10;
    if (ring.length > limit) errors.push(`"${parent.id}" has ${ring.length} children in one ring (max ${limit})`);
  }
}

// With --balance, give repeated sibling orbs a form their siblings don't use, keeping the first of each.
if (BALANCE) {
  const rings = new Map();
  for (const c of byId.values()) {
    const key = `${c.parents[0]}|${c.layer ?? 1}`;
    if (!rings.has(key)) rings.set(key, []);
    rings.get(key).push(c);
  }
  for (const ring of rings.values()) {
    if (ring.length > ORBS.length) continue;
    const used = new Set();
    const repeats = [];
    for (const c of ring) (used.has(c.orb) ? repeats : used.add(c.orb) && []).push?.(c);
    for (const c of repeats) {
      const free = ORBS.find((form) => !used.has(form));
      if (!free) break;
      notes.push(`orb: ${c.id} ${c.orb} → ${free}`);
      c.orb = free;
      used.add(free);
    }
  }
}

// ── Categories ──────────────────────────────────────────────────────────
const categoryIds = new Set();
for (const file of categoryFiles) {
  const d = file.data;
  const where = file.name;
  if (categoryIds.has(d.id)) errors.push(`${where}: duplicate category id "${d.id}"`);
  categoryIds.add(d.id);
  for (const field of ["id", "group", "title", "blurb", "orb", "entry", "path"]) if (d[field] === undefined) errors.push(`${where}: missing "${field}"`);
  if (!ORBS.includes(d.orb)) errors.push(`${where}: unknown orb "${d.orb}"`);
  if (!byId.has(d.entry)) errors.push(`${where}: entry "${d.entry}" is not a concept`);
  const ids = d.path ?? [];
  for (const id of ids) if (!byId.has(id)) errors.push(`${where}: path lists unknown concept "${id}"`);
  if (new Set(ids).size !== ids.length) errors.push(`${where}: path repeats a concept`);
  if (ids.length < 3) errors.push(`${where}: a path needs at least 3 steps`);
  if (ids.length && ids[0] !== d.entry) errors.push(`${where}: the path should start at its entry "${d.entry}"`);
  if (d.cover && !d.cover.wikipedia) errors.push(`${where}: "cover" needs a wikipedia title`);
}

// ── Depth ───────────────────────────────────────────────────────────────
const LAYERS = [["picture", 4, 70], ["mechanism", 20, 120], ["detail", 30, 240], ["principles", 20, 130]];
const depthById = new Map();
for (const file of depthFiles) {
  for (const d of file.data.depth ?? []) {
    const where = file.name;
    if (!byId.has(d.id)) { errors.push(`${where}: depth for unknown concept "${d.id}"`); continue; }
    if (depthById.has(d.id)) errors.push(`${where}: duplicate depth for "${d.id}"`);
    depthById.set(d.id, d);
    for (const [layer, min, max] of LAYERS) {
      const words = (d[layer] ?? "").trim().split(/\s+/).filter(Boolean).length;
      if (words < min) errors.push(`${where}: "${d.id}" ${layer} is ${words} words (min ${min})`);
      if (words > max) errors.push(`${where}: "${d.id}" ${layer} is ${words} words (max ${max})`);
    }
    for (const r of d.requires ?? []) {
      if (!byId.has(r)) errors.push(`${where}: "${d.id}" requires unknown concept "${r}"`);
      if (r === d.id) errors.push(`${where}: "${d.id}" requires itself`);
    }
    if (d.example && (!d.example.label || !d.example.code)) errors.push(`${where}: "${d.id}" example needs a label and code`);
  }
}
// What an idea is built on must not loop back on it.
const requiresVisiting = new Set();
const requiresDone = new Set();
const visitRequires = (id, path) => {
  if (requiresDone.has(id)) return;
  if (requiresVisiting.has(id)) return void errors.push(`prerequisite cycle: ${[...path, id].join(" → ")}`);
  requiresVisiting.add(id);
  for (const r of depthById.get(id)?.requires ?? []) visitRequires(r, [...path, id]);
  requiresVisiting.delete(id);
  requiresDone.add(id);
};
for (const id of depthById.keys()) visitRequires(id, []);
for (const d of depthById.values()) {
  for (const r of d.requires ?? []) if (!depthById.has(r)) warnings.push(`"${d.id}" is built on "${r}", which has no depth written yet`);
}

// ── Library ─────────────────────────────────────────────────────────────
const departmentIds = new Set();
const shelved = new Set();
for (const file of libraryFiles) {
  for (const faculty of file.data.faculties ?? []) {
    if (!ORBS.includes(faculty.orb)) errors.push(`${file.name}: faculty "${faculty.id}" has an unknown orb`);
    if (!VOICES.includes(faculty.voice)) errors.push(`${file.name}: faculty "${faculty.id}" has an unknown voice`);
    for (const dept of faculty.departments ?? []) {
      if (departmentIds.has(dept.id)) errors.push(`${file.name}: duplicate department id "${dept.id}"`);
      departmentIds.add(dept.id);
      for (const entry of dept.entries ?? []) {
        if (!byId.has(entry)) errors.push(`${file.name}: department "${dept.id}" lists unknown concept "${entry}"`);
        shelved.add(entry);
      }
    }
  }
}
// Every entrance should be reachable from some department, or it cannot be found from the library home.
const reachableFromLibrary = new Set();
const shelfStack = [...shelved];
while (shelfStack.length) {
  const id = shelfStack.pop();
  if (reachableFromLibrary.has(id)) continue;
  reachableFromLibrary.add(id);
  shelfStack.push(...(children.get(id) ?? []));
}
for (const id of byId.keys()) if (!reachableFromLibrary.has(id)) warnings.push(`"${id}" cannot be reached from any library department`);

// ── Report ──────────────────────────────────────────────────────────────
const all = [...byId.values()];
const entrances = all.filter((n) => n.parents.includes(ROOT_ID) && n.layer !== 2);
const maxDepth = Math.max(...depth.values());
console.log(`${all.length} concepts in ${clusters.length} files · ${all.reduce((s, n) => s + n.parents.length, 0)} parent links · ${links.size} cross-links (avg ${(links.size * 2 / all.length).toFixed(1)} per concept)`);
console.log(`depth: ${maxDepth} levels · entrances (${entrances.length}): ${entrances.map((n) => `${n.id}=${n.orb}`).join(", ")}`);
console.log(`orb forms: ${ORBS.map((form) => `${form} ${all.filter((n) => n.orb === form).length}`).join(" · ")}`);
console.log(`sensitive: ${all.filter((n) => n.safety === "sensitive" || n.sensitive).map((n) => n.id).join(", ")}`);
console.log(`categories: ${categoryFiles.length} · link files: ${linkFiles.length} · departments: ${departmentIds.size}`);
console.log(`written in depth: ${depthById.size} of ${all.length} concepts (${((depthById.size / all.length) * 100).toFixed(1)}%)`);
for (const note of notes) console.log(`fixed: ${note}`);

if (FIX) {
  for (const file of clusters) {
    const d = file.data;
    const head = { $schema: d.$schema ?? "../concept.schema.json", cluster: d.cluster, description: d.description };
    const lines = [
      "{",
      ...Object.entries(head).map(([k, v]) => `  ${JSON.stringify(k)}: ${JSON.stringify(v)},`),
      '  "concepts": [',
      ...d.concepts.map((c, i) => `    ${JSON.stringify(c)}${i < d.concepts.length - 1 ? "," : ""}`),
      "  ],",
      '  "links": [',
    ];
    const chunks = [];
    for (let i = 0; i < d.links.length; i += 5) chunks.push(d.links.slice(i, i + 5).map((l) => JSON.stringify(l).replace(",", ", ")).join(", "));
    lines.push(...chunks.map((chunk, i) => `    ${chunk}${i < chunks.length - 1 ? "," : ""}`), "  ]", "}", "");
    writeFileSync(file.path, lines.join("\n"));
  }
  for (const file of linkFiles) {
    const chunks = [];
    for (let i = 0; i < file.data.links.length; i += 6) chunks.push(file.data.links.slice(i, i + 6).map((l) => JSON.stringify(l).replace(",", ", ")).join(", "));
    const lines = ["{", `  "description": ${JSON.stringify(file.data.description)},`, '  "links": [', ...chunks.map((chunk, i) => `    ${chunk}${i < chunks.length - 1 ? "," : ""}`), "  ]", "}", ""];
    writeFileSync(file.path, lines.join("\n"));
  }
  console.log("content files rewritten in canonical form");
}

const shown = process.argv.includes("--all") ? warnings : warnings.slice(0, 40);
for (const warning of shown) console.warn(`warning: ${warning}`);
if (warnings.length > shown.length) console.warn(`… and ${warnings.length - shown.length} more warnings`);
if (errors.length) {
  for (const error of errors.slice(0, 60)) console.error(`error: ${error}`);
  if (errors.length > 60) console.error(`… and ${errors.length - 60} more errors`);
  process.exit(1);
}
console.log("content OK");
