// Generates content/docs/** from ../content/** (the same data the Vite app reads).
// Mirrors the app's own hierarchy and ownership rules exactly, so a concept lands in the
// same one place here as it does in the app: Faculty -> Department -> (Course -> Module)? -> concept tree.
//   node scripts/generate-content.mjs
import { readFileSync, readdirSync, mkdirSync, writeFileSync, rmSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const contentRoot = join(here, "..", "..", "content");
const outRoot = join(here, "..", "content", "docs");

const readJsonDir = (dir) =>
  readdirSync(join(contentRoot, dir))
    .filter((f) => f.endsWith(".json"))
    .sort()
    .map((f) => JSON.parse(readFileSync(join(contentRoot, dir, f), "utf8")));

// ── Load the same content the app loads ────────────────────────────────
const byId = new Map();
for (const file of readJsonDir("concepts")) for (const c of file.concepts ?? []) byId.set(c.id, c);

const depthById = new Map();
for (const file of readJsonDir("depth")) for (const d of file.depth ?? []) depthById.set(d.id, d);

const childrenOf = new Map([...byId.keys()].map((id) => [id, []]));
for (const c of byId.values()) for (const p of c.parents ?? []) childrenOf.get(p)?.push(c.id);

const libraryFiles = readJsonDir("library");
const faculties = libraryFiles.flatMap((f) => f.faculties ?? []);
const courses = libraryFiles.flatMap((f) => f.courses ?? []);
const coursesByDept = new Map();
for (const course of courses) {
  const list = coursesByDept.get(course.departmentId);
  if (list) list.push(course); else coursesByDept.set(course.departmentId, [course]);
}

// ── Registered anchors, and each concept's one true home ──────────────
// Same rule as the app's whereIs(): module entries claim first, then department entries;
// a concept's home is the nearest ancestor-or-self that is a registered anchor.
const entryOf = new Map();
for (const faculty of faculties) {
  for (const department of faculty.departments) {
    for (const course of coursesByDept.get(department.id) ?? []) {
      for (const mod of course.modules) {
        for (const entry of mod.entries) {
          if (!entryOf.has(entry)) entryOf.set(entry, { departmentId: department.id, courseId: course.id, moduleId: mod.id });
        }
      }
    }
    for (const entry of department.entries) {
      if (!entryOf.has(entry)) entryOf.set(entry, { departmentId: department.id, courseId: null, moduleId: null });
    }
  }
}

const homeCache = new Map();
function homeOf(id) {
  if (homeCache.has(id)) return homeCache.get(id);
  const queue = [id];
  const seen = new Set([id]);
  let result = null;
  while (queue.length) {
    const current = queue.shift();
    const hit = entryOf.get(current);
    if (hit) { result = hit; break; }
    for (const parent of byId.get(current)?.parents ?? []) {
      if (!seen.has(parent)) { seen.add(parent); queue.push(parent); }
    }
  }
  homeCache.set(id, result);
  return result;
}
const sameHome = (a, b) => a && b && a.departmentId === b.departmentId && a.courseId === b.courseId && a.moduleId === b.moduleId;

// A concept's children for doc-tree purposes: only the ones that didn't break off to their own,
// closer anchor (departments legitimately overlap in the source tree; each concept still gets one page).
function ownedChildren(id) {
  const home = homeOf(id);
  return (childrenOf.get(id) ?? []).filter((c) => sameHome(homeOf(c), home));
}

// A department with courses hollows itself out into modules (mirrors DepartmentPage showing course
// cards instead of raw entries) — but a raw entry that no module happened to claim (e.g. "algorithms"
// itself, once its children are redistributed into course modules) still needs its own page somewhere.
function looseEntriesOf(department) {
  return department.entries.filter((e) => entryOf.get(e)?.courseId == null);
}

// ── Doc paths (route, no extension) for every reachable concept ───────
const pathById = new Map();
function assignConceptPath(id, parentPath) {
  const path = `${parentPath}/${id}`;
  pathById.set(id, path);
  for (const kid of ownedChildren(id)) assignConceptPath(kid, path);
}
for (const faculty of faculties) {
  for (const department of faculty.departments) {
    const deptPath = `${faculty.id}/${department.id}`;
    const depCourses = coursesByDept.get(department.id) ?? [];
    if (depCourses.length) {
      for (const entry of looseEntriesOf(department)) assignConceptPath(entry, deptPath);
      for (const course of depCourses) {
        for (const mod of course.modules) {
          const modPath = `${deptPath}/${course.id}/${mod.id}`;
          for (const entry of mod.entries) assignConceptPath(entry, modPath);
        }
      }
    } else {
      for (const entry of department.entries) assignConceptPath(entry, deptPath);
    }
  }
}

// MDX parses `{...}` as a JS expression and `<x` as JSX, so free-form prose (math notation like
// `L{f}` or comparisons like `n < 5`) needs escaping before it's dropped into a page body.
const mdxSafe = (s) => String(s ?? "").replace(/[{}]/g, "\\$&").replace(/</g, "&lt;");

// ── Wiki-style cross-linking: turn a mention of another concept's exact title into a link,
// the way Wikipedia auto-links a term the first time it would otherwise just be prose. Done here,
// at generation time, as plain Markdown links, rather than as a live remark plugin at MDX-compile
// time — same visible result, without depending on fumadocs-mdx's fast-moving plugin internals. ──
const escapeRe = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const linkable = [...byId.values()]
  .filter((c) => pathById.has(c.id))
  .map((c) => ({ id: c.id, title: c.title }))
  .sort((a, b) => b.title.length - a.title.length);
const titleToId = new Map(linkable.map((t) => [t.title, t.id]));
const mentionPattern = linkable.length
  ? new RegExp(`(?<![\\w/-])(${linkable.map((t) => escapeRe(t.title)).join("|")})(?![\\w-])`, "g")
  : null;

function wikiLink(text, selfId) {
  const safe = mdxSafe(text);
  if (!safe || !mentionPattern) return safe;
  return safe.replace(mentionPattern, (match) => {
    const id = titleToId.get(match);
    if (!id || id === selfId) return match;
    return `[${match}](/docs/${pathById.get(id)})`;
  });
}

// ── MDX rendering ───────────────────────────────────────────────────────
const yamlStr = (s) => JSON.stringify(String(s ?? "").trim());
const frontmatter = (title, description) => `---\ntitle: ${yamlStr(title)}\ndescription: ${yamlStr(description)}\n---\n`;

function listSection(heading, items) {
  if (!items.length) return "";
  const lines = items.map((i) => `- [${mdxSafe(i.title)}](/docs/${i.path})${i.blurb ? ` — ${mdxSafe(i.blurb)}` : ""}`);
  return [`## ${heading}`, "", ...lines, ""].join("\n");
}

const LAYERS = [["picture", "Picture"], ["mechanism", "Mechanism"], ["detail", "Detail"], ["principles", "Principles"]];

function conceptMdx(id) {
  const c = byId.get(id);
  const depth = depthById.get(id);
  const requires = (depth?.requires ?? []).filter((r) => pathById.has(r));
  const kids = ownedChildren(id);
  const parts = [frontmatter(c.title, c.summary), ""];

  if (depth) {
    for (const [key, heading] of LAYERS) {
      parts.push(`## ${heading}`, "", wikiLink(depth[key], id), "");
      if (key === "detail" && depth.example) parts.push("```", depth.example.code, "```", "");
    }
  } else {
    parts.push(wikiLink(c.summary, id), "", "_The deeper layers (Mechanism, Detail, Principles) haven't been written yet._", "");
    if (c.wiki) parts.push(`Read more on [Wikipedia](https://en.wikipedia.org/wiki/${encodeURIComponent(c.wiki.replace(/ /g, "_"))}).`, "");
  }

  if (requires.length) {
    parts.push(listSection("Built on", requires.map((r) => ({ title: byId.get(r).title, path: pathById.get(r) }))));
  }
  if (kids.length) {
    parts.push(listSection("Underneath", kids.map((k) => ({ title: byId.get(k).title, path: pathById.get(k), blurb: byId.get(k).summary }))));
  }
  return parts.join("\n");
}

function writeConceptFiles(id, parentDir) {
  const kids = ownedChildren(id);
  const body = conceptMdx(id);
  if (kids.length === 0) {
    writeFileSync(join(parentDir, `${id}.mdx`), body);
    return;
  }
  const dir = join(parentDir, id);
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, "index.mdx"), body);
  writeFileSync(join(dir, "meta.json"), `${JSON.stringify({ title: byId.get(id).title, pages: ["index", ...kids] }, null, 2)}\n`);
  for (const kid of kids) writeConceptFiles(kid, dir);
}

// ── Faculty / Department / Course / Module overview pages ─────────────
function rootIndexMdx() {
  const body = [
    frontmatter("Orb View", "A deck of cards for every subject, organized like a university."),
    "",
    "Orb View is a concept library: pick a faculty below, and follow “Built on” and “Underneath” links to explore the whole network the way you would follow links on Wikipedia.",
    "",
    listSection("Faculties", faculties.map((f) => ({ title: f.title, path: f.id, blurb: f.blurb }))),
  ];
  return body.join("\n");
}

function facultyMdx(faculty) {
  return [
    frontmatter(faculty.title, faculty.blurb),
    "",
    listSection("Departments", faculty.departments.map((d) => ({ title: d.title, path: `${faculty.id}/${d.id}`, blurb: d.blurb }))),
  ].join("\n");
}

function departmentMdx(department, faculty, depCourses) {
  if (!depCourses.length) {
    const items = department.entries.filter((e) => byId.has(e)).map((e) => ({ title: byId.get(e).title, path: pathById.get(e), blurb: byId.get(e).summary }));
    return [frontmatter(department.title, department.blurb), "", listSection("Concepts", items)].join("\n");
  }
  const courseItems = depCourses.map((c) => ({ title: c.title, path: `${faculty.id}/${department.id}/${c.id}`, blurb: c.blurb }));
  const loose = looseEntriesOf(department).filter((e) => byId.has(e)).map((e) => ({ title: byId.get(e).title, path: pathById.get(e), blurb: byId.get(e).summary }));
  return [
    frontmatter(department.title, department.blurb),
    "",
    listSection("Courses", courseItems),
    listSection("Also in this department", loose),
  ].join("\n");
}

function courseMdx(course, department, faculty) {
  const items = course.modules.map((m) => ({ title: m.title, path: `${faculty.id}/${department.id}/${course.id}/${m.id}`, blurb: m.blurb }));
  return [frontmatter(course.title, course.blurb), "", listSection("Modules", items)].join("\n");
}

function moduleMdx(mod) {
  const items = mod.entries.filter((e) => byId.has(e)).map((e) => ({ title: byId.get(e).title, path: pathById.get(e), blurb: byId.get(e).summary }));
  return [frontmatter(mod.title, mod.blurb), "", listSection("Concepts", items)].join("\n");
}

// ── Write everything ────────────────────────────────────────────────────
rmSync(outRoot, { recursive: true, force: true });
mkdirSync(outRoot, { recursive: true });
writeFileSync(join(outRoot, "index.mdx"), rootIndexMdx());
writeFileSync(join(outRoot, "meta.json"), `${JSON.stringify({ title: "Orb View", pages: faculties.map((f) => f.id) }, null, 2)}\n`);

let conceptPageCount = 0;
for (const faculty of faculties) {
  const facultyDir = join(outRoot, faculty.id);
  mkdirSync(facultyDir, { recursive: true });
  writeFileSync(join(facultyDir, "index.mdx"), facultyMdx(faculty));
  writeFileSync(join(facultyDir, "meta.json"), `${JSON.stringify({ title: faculty.title, pages: ["index", ...faculty.departments.map((d) => d.id)] }, null, 2)}\n`);

  for (const department of faculty.departments) {
    const deptDir = join(facultyDir, department.id);
    mkdirSync(deptDir, { recursive: true });
    const depCourses = coursesByDept.get(department.id) ?? [];
    writeFileSync(join(deptDir, "index.mdx"), departmentMdx(department, faculty, depCourses));

    if (depCourses.length) {
      const loose = looseEntriesOf(department);
      writeFileSync(join(deptDir, "meta.json"), `${JSON.stringify({ title: department.title, pages: ["index", ...depCourses.map((c) => c.id), ...loose] }, null, 2)}\n`);
      for (const entry of loose) { writeConceptFiles(entry, deptDir); conceptPageCount++; }
      for (const course of depCourses) {
        const courseDir = join(deptDir, course.id);
        mkdirSync(courseDir, { recursive: true });
        writeFileSync(join(courseDir, "index.mdx"), courseMdx(course, department, faculty));
        writeFileSync(join(courseDir, "meta.json"), `${JSON.stringify({ title: course.title, pages: ["index", ...course.modules.map((m) => m.id)] }, null, 2)}\n`);
        for (const mod of course.modules) {
          const modDir = join(courseDir, mod.id);
          mkdirSync(modDir, { recursive: true });
          writeFileSync(join(modDir, "index.mdx"), moduleMdx(mod));
          writeFileSync(join(modDir, "meta.json"), `${JSON.stringify({ title: mod.title, pages: ["index", ...mod.entries] }, null, 2)}\n`);
          for (const entry of mod.entries) { writeConceptFiles(entry, modDir); conceptPageCount++; }
        }
      }
    } else {
      writeFileSync(join(deptDir, "meta.json"), `${JSON.stringify({ title: department.title, pages: ["index", ...department.entries] }, null, 2)}\n`);
      for (const entry of department.entries) { writeConceptFiles(entry, deptDir); conceptPageCount++; }
    }
  }
}

console.log(`generated docs for ${pathById.size} concepts (${conceptPageCount} top-level anchors) across ${faculties.length} faculties`);
