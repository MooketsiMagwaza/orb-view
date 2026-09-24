import { useMemo, useState } from "react";
import { getNode, graph } from "../graph/model";
import { OrbGlyph } from "../paths/OrbGlyph";
import { useBookmarks } from "./bookmarks";
import { ConceptCard, DepartmentCard, GuideCard } from "./Cards";
import { depthById, faculties, searchConcepts, whereIs } from "./data";
import { guides } from "./guides";
import { hrefFor } from "./route";

/**
 * The library home: every faculty laid out as its own square of decks, with search and filters on top.
 * Cards open onto pages, and any page can be viewed as a map.
 */
export function LibraryHome() {
  const [query, setQuery] = useState("");
  const [facultyId, setFacultyId] = useState<string | null>(null);
  const [writtenOnly, setWrittenOnly] = useState(false);
  const [bookmarkedOnly, setBookmarkedOnly] = useState(false);
  const { ids: bookmarkIds } = useBookmarks();

  const flat = query.trim().length > 0 || writtenOnly || bookmarkedOnly;
  const results = useMemo(() => {
    if (!flat) return [];
    const base = query.trim() ? searchConcepts(query, 60) : bookmarkedOnly ? bookmarkIds.filter((id) => graph.byId.has(id)).map(getNode) : [...depthById.keys()].map(getNode);
    return base
      .filter((node) => !writtenOnly || depthById.has(node.id))
      .filter((node) => !bookmarkedOnly || bookmarkIds.includes(node.id))
      .filter((node) => !facultyId || whereIs(node.id)?.faculty.id === facultyId);
  }, [flat, query, writtenOnly, bookmarkedOnly, bookmarkIds, facultyId]);

  const shown = faculties.filter((f) => !facultyId || f.id === facultyId);

  return (
    <div className="library">
      <header className="library__head">
        <div>
          <p className="eyebrow">Orb View</p>
          <h1 className="library__title">Library</h1>
          <p className="library__count">{graph.nodes.length} ideas · {depthById.size} written in depth</p>
        </div>
        <a className="pill" href={hrefFor({ kind: "map", id: "entropy" })}>
          <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><circle cx="6" cy="6" r="2.2" /><circle cx="18" cy="12" r="2.2" /><circle cx="7" cy="18" r="2.2" /><path d="M8 6.8c5 0 6 2.4 8 4.4M9 17.4c3.4-.6 5.4-2.6 7-4.6" /></svg>
          Map
        </a>
      </header>

      <div className="library__tools">
        <label className="search">
          <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true"><circle cx="11" cy="11" r="6.5" /><path d="m16 16 4.5 4.5" /></svg>
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search every idea"
            aria-label="Search every idea"
            autoComplete="off"
            spellCheck={false}
          />
        </label>
        <div className="chips-row" role="group" aria-label="Filters">
          <button type="button" className={`chip-filter${!facultyId ? " is-on" : ""}`} onClick={() => setFacultyId(null)}>All</button>
          {faculties.map((faculty) => (
            <button
              key={faculty.id}
              type="button"
              className={`chip-filter${facultyId === faculty.id ? " is-on" : ""}`}
              onClick={() => setFacultyId(facultyId === faculty.id ? null : faculty.id)}
            >
              {faculty.title}
            </button>
          ))}
          <button type="button" className={`chip-filter chip-filter--written${writtenOnly ? " is-on" : ""}`} aria-pressed={writtenOnly} onClick={() => setWrittenOnly(!writtenOnly)}>
            Written in depth
          </button>
          <button type="button" className={`chip-filter chip-filter--written${bookmarkedOnly ? " is-on" : ""}`} aria-pressed={bookmarkedOnly} onClick={() => setBookmarkedOnly(!bookmarkedOnly)}>
            Bookmarked
          </button>
        </div>
      </div>

      {flat ? (
        <section aria-live="polite">
          <p className="library__result-count">
            {results.length
              ? `${results.length} ${results.length === 1 ? "idea" : "ideas"}`
              : bookmarkedOnly && !query.trim() ? "No bookmarks yet. Star an idea to save it here." : "Nothing matches. Try a shorter word."}
          </p>
          <div className="cards">
            {results.map((node) => <ConceptCard key={node.id} node={node} showPlace />)}
          </div>
        </section>
      ) : (
        <div className="faculties">
          {shown.map((faculty) => (
            <section key={faculty.id} className="faculty" aria-labelledby={`faculty-${faculty.id}`}>
              <header className="faculty__head">
                <OrbGlyph state={faculty.orb} voice={faculty.voice} seed={faculty.id} size={44} />
                <div>
                  <h2 id={`faculty-${faculty.id}`} className="faculty__title">{faculty.title}</h2>
                  <p className="faculty__blurb">{faculty.blurb}</p>
                </div>
              </header>
              <div className="cards">
                {faculty.departments.map((department) => <DepartmentCard key={department.id} department={department} faculty={faculty} />)}
                {guides.filter((guide) => guide.facultyId === faculty.id).map((guide) => <GuideCard key={guide.id} guide={guide} />)}
              </div>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
