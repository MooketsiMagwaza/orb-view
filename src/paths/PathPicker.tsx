import { useState } from "react";
import { getNode } from "../graph/model";
import { Sheet } from "../sheet/Sheet";
import { useWikipediaPreview } from "../sources/useConceptSources";
import { categoryGroups, GROUP_VOICE, type Category } from "./categories";
import { OrbGlyph } from "./OrbGlyph";

type Props = {
  activeId: string | null;
  onBegin: (category: Category) => void;
  onClose: () => void;
};

/** The opened category: a cover image from Wikipedia, the steps in order, and a way in. */
function CategoryDetail({ category, onBegin }: { category: Category; onBegin: (category: Category) => void }) {
  const cover = category.cover?.wikipedia ?? getNode(category.entry).sources.wikipedia;
  const { card } = useWikipediaPreview(cover, true);
  const image = card?.images[0];

  return (
    <div className="category__detail">
      {image && (
        <figure className="figure figure--lead figure--cover is-loaded">
          <div className="figure__frame"><img src={image.url} alt={image.alt} loading="lazy" decoding="async" referrerPolicy="no-referrer" /></div>
          <figcaption><a href={image.creditUrl} target="_blank" rel="noopener noreferrer">{image.credit}</a></figcaption>
        </figure>
      )}
      <ol className="steps">
        {category.path.map((id, index) => (
          <li key={id}><span className="steps__n">{index + 1}</span>{getNode(id).title}</li>
        ))}
      </ol>
      <button type="button" className="begin" onClick={() => onBegin(category)}>Begin this path</button>
    </div>
  );
}

/**
 * The list of ways in, grouped: Me, Tech, People, Science, Culture, Abstract. Each is a short trail through
 * the network, one idea at a time. Opening a row shows its cover image and steps.
 */
export function PathPicker({ activeId, onBegin, onClose }: Props) {
  const [openId, setOpenId] = useState<string | null>(null);

  return (
    <Sheet eyebrow="Learn bit by bit" title="Paths" titleId="paths-title" onClose={onClose}>
      <p className="picker__lead">
        Pick somewhere to begin. Each path walks through a few ideas in order, and you can wander off it at any point.
      </p>
      {categoryGroups.map(({ group, items }) => (
        <section key={group} className="picker__group" aria-labelledby={`group-${group}`}>
          <h3 id={`group-${group}`} className="picker__group-title">{group}</h3>
          <ul className="picker__list">
            {items.map((category) => {
              const open = openId === category.id;
              return (
                <li key={category.id} className={`category${open ? " is-open" : ""}${activeId === category.id ? " is-active" : ""}`}>
                  <button
                    type="button"
                    className="category__row"
                    aria-expanded={open}
                    onClick={() => setOpenId(open ? null : category.id)}
                  >
                    <OrbGlyph state={category.orb} voice={GROUP_VOICE[group] ?? "human"} seed={category.id} />
                    <span className="category__text">
                      <span className="category__title">{category.title}</span>
                      <span className="category__blurb">{category.blurb}</span>
                    </span>
                    <span className="category__count">{category.path.length}</span>
                  </button>
                  {open && <CategoryDetail category={category} onBegin={onBegin} />}
                </li>
              );
            })}
          </ul>
        </section>
      ))}
    </Sheet>
  );
}
