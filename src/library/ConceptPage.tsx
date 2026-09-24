import { useEffect, useMemo, useState, type KeyboardEvent } from "react";
import { getNode, graph } from "../graph/model";
import { OrbGlyph } from "../paths/OrbGlyph";
import { InfoSheet } from "../sheet/InfoSheet";
import { ConceptCard, CourseCard, LayerDots, ModuleCard } from "./Cards";
import { LAYERS, childrenOf, coursesFor, depthById, getCourse, getDepartment, getModule, whereIs, type LayerKey } from "./data";
import { hrefFor, type Route } from "./route";

function Breadcrumbs({ id }: { id: string }) {
  const place = whereIs(id);
  return (
    <nav className="crumbs" aria-label="Where this idea lives">
      <a href={hrefFor({ kind: "library" })}>Library</a>
      {place && (
        <>
          <span aria-hidden="true">›</span>
          <a href={hrefFor({ kind: "library" })}>{place.faculty.title}</a>
          <span aria-hidden="true">›</span>
          <a href={hrefFor({ kind: "department", id: place.department.id })}>{place.department.title}</a>
          {place.course && (
            <>
              <span aria-hidden="true">›</span>
              <a href={hrefFor({ kind: "course", id: place.course.id })}>{place.course.title}</a>
            </>
          )}
          {place.module && (
            <>
              <span aria-hidden="true">›</span>
              <a href={hrefFor({ kind: "module", id: place.module.id })}>{place.module.title}</a>
            </>
          )}
          {place.trail.map((step, index) => {
            const last = index === place.trail.length - 1;
            return (
              <span key={step} className="crumbs__step">
                <span aria-hidden="true">›</span>
                {last ? <strong aria-current="page">{getNode(step).title}</strong> : <a href={hrefFor({ kind: "concept", id: step })}>{getNode(step).title}</a>}
              </span>
            );
          })}
        </>
      )}
    </nav>
  );
}

function Chips({ label, ids }: { label: string; ids: string[] }) {
  const [all, setAll] = useState(false);
  if (!ids.length) return null;
  const shown = all ? ids : ids.slice(0, 12);
  return (
    <div className="page__chips">
      <h3>{label}</h3>
      <ul className="chips">
        {shown.map((id) => {
          const node = graph.byId.get(id)!;
          return (
            <li key={id}>
              <a className="chip" href={hrefFor({ kind: "concept", id })} style={{ "--tone": node.tone.blue } as React.CSSProperties}>
                <i className="chip__dot" aria-hidden="true" />{node.title}
              </a>
            </li>
          );
        })}
        {!all && ids.length > shown.length && (
          <li><button type="button" className="chip chip--more" onClick={() => setAll(true)}>{ids.length - shown.length} more</button></li>
        )}
      </ul>
    </div>
  );
}

function Example({ label, code }: { label: string; code: string }) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1400);
    } catch {
      /* clipboard may be blocked; the code is still selectable */
    }
  };
  return (
    <figure className="example">
      <figcaption>{label}</figcaption>
      <pre><code>{code}</code></pre>
      <button type="button" onClick={copy}>{copied ? "Copied" : "Copy"}</button>
    </figure>
  );
}

/**
 * One idea, fully explained: a picture, the mechanism, the detail, and the principles, with everything it is built on
 * above and everything beneath it below. Each of those is a card that opens the same kind of page.
 */
export function ConceptPage({ id, go }: { id: string; go: (route: Route) => void }) {
  const node = graph.byId.get(id);
  const [layer, setLayer] = useState<LayerKey>("picture");
  const [sources, setSources] = useState(false);

  useEffect(() => {
    setLayer("picture");
    setSources(false);
  }, [id]);

  const depth = node ? depthById.get(node.id) : undefined;
  const children = useMemo(() => (node ? childrenOf(node.id) : []), [node]);
  const requires = depth?.requires ?? [];
  const parents = node?.parentIds ?? [];
  const related = useMemo(() => {
    if (!node) return [];
    const taken = new Set([node.id, ...requires, ...parents, ...children.map((c) => c.id)]);
    return node.relatedIds.filter((r) => !taken.has(r));
  }, [node, requires, parents, children]);

  if (!node) {
    return (
      <article className="page">
        <Breadcrumbs id={id} />
        <h1 className="page__title">Not in the library</h1>
        <p className="page__lede">There is no idea called “{id}”. <a href={hrefFor({ kind: "library" })}>Back to the library</a>.</p>
      </article>
    );
  }

  const place = whereIs(node.id);
  const text = layer === "picture" ? depth?.picture ?? node.summary : depth?.[layer];
  const onTabKey = (event: KeyboardEvent) => {
    const index = LAYERS.findIndex((l) => l.key === layer);
    if (event.key === "ArrowRight") setLayer(LAYERS[(index + 1) % LAYERS.length].key);
    else if (event.key === "ArrowLeft") setLayer(LAYERS[(index + LAYERS.length - 1) % LAYERS.length].key);
    else return;
    event.preventDefault();
  };

  return (
    <article className="page">
      <Breadcrumbs id={node.id} />

      <header className="page__head">
        <OrbGlyph state={node.orb} voice={node.tone.voice} seed={node.id} size={72} />
        <div className="page__heading">
          <p className="eyebrow">{place ? place.department.title : "Idea"}</p>
          <h1 className="page__title">{node.title}</h1>
        </div>
        <div className="page__actions">
          <a className="pill" href={hrefFor({ kind: "map", id: node.id })}>Map</a>
          <button type="button" className="pill" onClick={() => setSources(true)}>Sources</button>
        </div>
      </header>

      <div className="dial" role="tablist" aria-label="How deep to go" onKeyDown={onTabKey}>
        {LAYERS.map((l, index) => {
          const written = index === 0 || !!depth;
          return (
            <button
              key={l.key}
              type="button"
              role="tab"
              id={`tab-${l.key}`}
              aria-selected={layer === l.key}
              aria-controls="layer-panel"
              tabIndex={layer === l.key ? 0 : -1}
              className={`dial__tab${layer === l.key ? " is-on" : ""}${written ? "" : " is-unwritten"}`}
              onClick={() => setLayer(l.key)}
            >
              <span className="dial__n">{index + 1}</span>
              <span className="dial__label">{l.label}</span>
              <span className="dial__hint">{l.hint}</span>
            </button>
          );
        })}
      </div>

      <section id="layer-panel" role="tabpanel" aria-labelledby={`tab-${layer}`} className="layer" key={`${node.id}-${layer}`}>
        {text ? (
          <>
            {text.split(/\n\n+/).map((paragraph, index) => <p key={index} className="layer__text">{paragraph}</p>)}
            {layer === "detail" && depth?.example && <Example label={depth.example.label} code={depth.example.code} />}
          </>
        ) : (
          <div className="layer__empty">
            <p>This layer hasn't been written yet.</p>
            <button type="button" className="pill" onClick={() => setSources(true)}>Read it on Wikipedia meanwhile</button>
          </div>
        )}
        <p className="layer__meta"><LayerDots id={node.id} /> {depth ? "All four layers written" : "Picture written; the deeper layers are still to come"}</p>
      </section>

      {requires.length > 0 && (
        <section className="page__section" aria-labelledby="built-on">
          <h2 id="built-on">Built on</h2>
          <p className="page__note">To follow this all the way down, these are the ideas it assumes.</p>
          <div className="cards cards--row">{requires.map((r) => <ConceptCard key={r} node={getNode(r)} />)}</div>
        </section>
      )}

      {children.length > 0 && (
        <section className="page__section" aria-labelledby="underneath">
          <h2 id="underneath">Underneath</h2>
          <p className="page__note">{children.length} {children.length === 1 ? "idea opens" : "ideas open"} from here.</p>
          <div className="cards">{children.map((c) => <ConceptCard key={c.id} node={c} />)}</div>
        </section>
      )}

      <Chips label="Part of" ids={parents} />
      <Chips label="Connected to" ids={related} />

      {sources && (
        <InfoSheet
          concept={node}
          onClose={() => setSources(false)}
          onJump={(to) => { setSources(false); go({ kind: "concept", id: to }); }}
          showPageLink={false}
        />
      )}
    </article>
  );
}

/** A department with more than one entry: a small shelf of decks. */
export function DepartmentPage({ id }: { id: string }) {
  const found = getDepartment(id);
  if (!found) {
    return <article className="page"><h1 className="page__title">Not in the library</h1><p><a href={hrefFor({ kind: "library" })}>Back to the library</a></p></article>;
  }
  const { department, faculty } = found;
  const courses = coursesFor(department.id);
  return (
    <article className="page">
      <nav className="crumbs" aria-label="Where this lives">
        <a href={hrefFor({ kind: "library" })}>Library</a><span aria-hidden="true">›</span>
        <a href={hrefFor({ kind: "library" })}>{faculty.title}</a><span aria-hidden="true">›</span>
        <strong aria-current="page">{department.title}</strong>
      </nav>
      <header className="page__head">
        <OrbGlyph state={getNode(department.entries[0]).orb} voice={faculty.voice} seed={department.id} size={72} />
        <div className="page__heading">
          <p className="eyebrow">{faculty.title}</p>
          <h1 className="page__title">{department.title}</h1>
        </div>
        {department.id === "reasoning" && <div className="page__actions"><a className="pill" href={hrefFor({ kind: "debate" })}>How to Argue Well</a></div>}
        {department.id === "study-in-japan" && <div className="page__actions"><a className="pill" href={hrefFor({ kind: "study-japan" })}>Read the Full Guide</a></div>}
      </header>
      <p className="page__lede">{department.blurb}</p>
      {department.id === "reasoning" && (
        <a className="page-link" href={hrefFor({ kind: "debate" })}>
          A dedicated guide: build a sound case, debate in good faith, a field guide to every fallacy family below, and a quiz for spotting them live →
        </a>
      )}
      {department.id === "study-in-japan" && (
        <a className="page-link" href={hrefFor({ kind: "study-japan" })}>
          This deck is the journey as a chain. The detailed reference, MEXT's seven categories, prerequisites, and Botswana-specific notes, lives in the dedicated guide →
        </a>
      )}
      {courses.length > 0 ? (
        <div className="cards">{courses.map((course) => <CourseCard key={course.id} course={course} faculty={faculty} />)}</div>
      ) : (
        <div className="cards">{department.entries.map((entry) => <ConceptCard key={entry} node={getNode(entry)} />)}</div>
      )}
    </article>
  );
}

/** A course: a shelf of the modules it's broken into. */
export function CoursePage({ id }: { id: string }) {
  const course = getCourse(id);
  if (!course) {
    return <article className="page"><h1 className="page__title">Not in the library</h1><p><a href={hrefFor({ kind: "library" })}>Back to the library</a></p></article>;
  }
  const found = getDepartment(course.departmentId);
  if (!found) {
    return <article className="page"><h1 className="page__title">Not in the library</h1><p><a href={hrefFor({ kind: "library" })}>Back to the library</a></p></article>;
  }
  const { department, faculty } = found;
  return (
    <article className="page">
      <nav className="crumbs" aria-label="Where this lives">
        <a href={hrefFor({ kind: "library" })}>Library</a><span aria-hidden="true">›</span>
        <a href={hrefFor({ kind: "library" })}>{faculty.title}</a><span aria-hidden="true">›</span>
        <a href={hrefFor({ kind: "department", id: department.id })}>{department.title}</a><span aria-hidden="true">›</span>
        <strong aria-current="page">{course.title}</strong>
      </nav>
      <header className="page__head">
        <OrbGlyph state={getNode(course.modules[0].entries[0]).orb} voice={faculty.voice} seed={course.id} size={72} />
        <div className="page__heading">
          <p className="eyebrow">{department.title}</p>
          <h1 className="page__title">{course.title}</h1>
        </div>
      </header>
      <p className="page__lede">{course.blurb}</p>
      <div className="cards">{course.modules.map((mod) => <ModuleCard key={mod.id} module={mod} faculty={faculty} />)}</div>
    </article>
  );
}

/** A module: a small shelf of the concept decks it opens onto. */
export function ModulePage({ id }: { id: string }) {
  const found = getModule(id);
  if (!found) {
    return <article className="page"><h1 className="page__title">Not in the library</h1><p><a href={hrefFor({ kind: "library" })}>Back to the library</a></p></article>;
  }
  const { module: mod, course } = found;
  const departmentEntry = getDepartment(course.departmentId);
  if (!departmentEntry) {
    return <article className="page"><h1 className="page__title">Not in the library</h1><p><a href={hrefFor({ kind: "library" })}>Back to the library</a></p></article>;
  }
  const { department, faculty } = departmentEntry;
  return (
    <article className="page">
      <nav className="crumbs" aria-label="Where this lives">
        <a href={hrefFor({ kind: "library" })}>Library</a><span aria-hidden="true">›</span>
        <a href={hrefFor({ kind: "library" })}>{faculty.title}</a><span aria-hidden="true">›</span>
        <a href={hrefFor({ kind: "department", id: department.id })}>{department.title}</a><span aria-hidden="true">›</span>
        <a href={hrefFor({ kind: "course", id: course.id })}>{course.title}</a><span aria-hidden="true">›</span>
        <strong aria-current="page">{mod.title}</strong>
      </nav>
      <header className="page__head">
        <OrbGlyph state={getNode(mod.entries[0]).orb} voice={faculty.voice} seed={mod.id} size={72} />
        <div className="page__heading">
          <p className="eyebrow">{course.title}</p>
          <h1 className="page__title">{mod.title}</h1>
        </div>
      </header>
      <p className="page__lede">{mod.blurb}</p>
      <div className="cards">{mod.entries.map((entry) => <ConceptCard key={entry} node={getNode(entry)} />)}</div>
    </article>
  );
}
