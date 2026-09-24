import type { ConceptNode } from "../concepts/types";
import { OrbGlyph } from "../paths/OrbGlyph";
import { useBookmarks } from "./bookmarks";
import {
  courseSize, courseWritten, depthById, departmentSize, departmentWritten, moduleSize, moduleWritten, subtree, whereIs, LAYERS,
  type Course, type Department, type Faculty, type Module,
} from "./data";
import type { Guide } from "./guides";
import { hrefFor } from "./route";
import { getNode } from "../graph/model";

function firstSentence(text: string, limit = 96): string {
  const cut = text.split(/(?<=[.!?])\s/)[0];
  if (cut.length <= limit) return cut;
  return `${cut.slice(0, limit - 1).replace(/\s+\S*$/, "")}…`;
}

function StarIcon({ filled }: { filled: boolean }) {
  return (
    <svg viewBox="0 0 24 24" width="16" height="16" fill={filled ? "currentColor" : "none"} stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" aria-hidden="true">
      <path d="m12 3.5 2.6 5.4 5.9.7-4.3 4.1 1.1 5.9L12 16.7l-5.3 2.9 1.1-5.9-4.3-4.1 5.9-.7Z" />
    </svg>
  );
}

/** A star toggle for bookmarking a concept. Its own click target, so it works inside a card that's itself a link. */
export function BookmarkButton({ id }: { id: string }) {
  const { isBookmarked, toggle } = useBookmarks();
  const bookmarked = isBookmarked(id);
  return (
    <button
      type="button"
      className={`bookmark-toggle${bookmarked ? " is-on" : ""}`}
      aria-pressed={bookmarked}
      aria-label={bookmarked ? "Remove bookmark" : "Bookmark this idea"}
      onClick={(event) => { event.preventDefault(); event.stopPropagation(); toggle(id); }}
    >
      <StarIcon filled={bookmarked} />
    </button>
  );
}

/** Four small dots: one per layer of the concept that has been written. */
export function LayerDots({ id }: { id: string }) {
  const written = depthById.has(id);
  return (
    <span className="dots" role="img" aria-label={written ? "All four layers written" : "Picture written; deeper layers not yet"}>
      {LAYERS.map((layer, index) => <i key={layer.key} className={written || index === 0 ? "is-on" : ""} />)}
    </span>
  );
}

/** A concept as a card. If it has ideas beneath it, it looks like a deck. */
export function ConceptCard({ node, showPlace = false }: { node: ConceptNode; showPlace?: boolean }) {
  const below = subtree(node.id).size;
  const place = showPlace ? whereIs(node.id) : null;
  return (
    <a className={`card${below ? " card--deck" : ""}`} href={hrefFor({ kind: "concept", id: node.id })}>
      <BookmarkButton id={node.id} />
      <OrbGlyph state={node.orb} voice={node.tone.voice} seed={node.id} size={52} />
      <h3 className="card__title">{node.title}</h3>
      <p className="card__blurb">{firstSentence(node.summary)}</p>
      {place && <p className="card__place">{place.faculty.title} › {place.department.title}</p>}
      <span className="card__foot">
        <span>{below ? `${below} below` : "leaf"}</span>
        <LayerDots id={node.id} />
      </span>
    </a>
  );
}

/** A department as a deck: it opens onto the decks of its entry concepts. */
export function DepartmentCard({ department, faculty }: { department: Department; faculty: Faculty }) {
  const lead = getNode(department.entries[0]);
  const size = departmentSize(department);
  const written = departmentWritten(department);
  const single = department.entries.length === 1;
  return (
    <a className="card card--deck card--department" href={hrefFor(single ? { kind: "concept", id: department.entries[0] } : { kind: "department", id: department.id })}>
      <OrbGlyph state={lead.orb} voice={faculty.voice} seed={department.id} size={52} />
      <h3 className="card__title">{department.title}</h3>
      <p className="card__blurb">{department.blurb}</p>
      <span className="card__foot">
        <span>{size} ideas</span>
        <span className="card__written">{written ? `${written} in depth` : ""}</span>
      </span>
    </a>
  );
}

/** A course as a deck: it opens onto the decks of its modules. */
export function CourseCard({ course, faculty }: { course: Course; faculty: Faculty }) {
  const lead = getNode(course.modules[0].entries[0]);
  const size = courseSize(course);
  const written = courseWritten(course);
  return (
    <a className="card card--deck card--department" href={hrefFor({ kind: "course", id: course.id })}>
      <OrbGlyph state={lead.orb} voice={faculty.voice} seed={course.id} size={52} />
      <h3 className="card__title">{course.title}</h3>
      <p className="card__blurb">{course.blurb}</p>
      <span className="card__foot">
        <span>{size} ideas</span>
        <span className="card__written">{written ? `${written} in depth` : ""}</span>
      </span>
    </a>
  );
}

/** A module as a deck: it opens onto the concept cards of its entries. */
export function ModuleCard({ module, faculty }: { module: Module; faculty: Faculty }) {
  const lead = getNode(module.entries[0]);
  const size = moduleSize(module);
  const written = moduleWritten(module);
  return (
    <a className="card card--deck card--department" href={hrefFor({ kind: "module", id: module.id })}>
      <OrbGlyph state={lead.orb} voice={faculty.voice} seed={module.id} size={52} />
      <h3 className="card__title">{module.title}</h3>
      <p className="card__blurb">{module.blurb}</p>
      <span className="card__foot">
        <span>{size} ideas</span>
        <span className="card__written">{written ? `${written} in depth` : ""}</span>
      </span>
    </a>
  );
}

/** A hand-written guide page, shelved like a deck but opening onto a standalone page instead of a concept. */
export function GuideCard({ guide }: { guide: Guide }) {
  return (
    <a className="card card--guide" href={hrefFor(guide.route)}>
      <OrbGlyph state={guide.orb} voice={guide.voice} seed={guide.id} size={52} />
      <h3 className="card__title">{guide.title}</h3>
      <p className="card__blurb">{guide.blurb}</p>
      <span className="card__foot">
        <span className="card__written">Guide</span>
      </span>
    </a>
  );
}
