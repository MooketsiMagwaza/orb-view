import { useMemo, useState } from "react";
import type { ConceptNode } from "../concepts/types";
import { graph } from "../graph/model";
import { useConceptSources } from "../sources/useConceptSources";
import { Sheet } from "./Sheet";
import { SourceCard } from "./SourceCard";

type Props = {
  concept: ConceptNode;
  onClose: () => void;
  /** Leave the explanation and travel to another idea. */
  onJump: (id: string) => void;
  /** Offer a link to the concept's full page in the library (not needed when already on it). */
  showPageLink?: boolean;
};

const RELATED_PREVIEW = 12;

type Group = { label: string; ids: string[] };

/** Everything this idea touches, grouped by how: where it comes from, where it leads, what it echoes. */
function connectionsOf(concept: ConceptNode): Group[] {
  const parents = concept.parentIds;
  const leads = [...(graph.layer1.get(concept.id) ?? []), ...(graph.layer2.get(concept.id) ?? [])];
  const shown = new Set([concept.id, ...parents, ...leads]);
  const related = concept.relatedIds.filter((id) => !shown.has(id));
  return [
    { label: "Comes from", ids: parents },
    { label: "Leads to", ids: leads },
    { label: "Also connects to", ids: related },
  ].filter((group) => group.ids.length > 0);
}

function ConnectionChips({ group, onJump }: { group: Group; onJump: (id: string) => void }) {
  const [expanded, setExpanded] = useState(false);
  const capped = group.label === "Also connects to" && !expanded && group.ids.length > RELATED_PREVIEW;
  const ids = capped ? group.ids.slice(0, RELATED_PREVIEW) : group.ids;
  return (
    <div className="connections-group">
      <h3 className="connections-group__label">{group.label}</h3>
      <ul className="chips">
        {ids.map((id) => {
          const node = graph.byId.get(id)!;
          return (
            <li key={id}>
              <button type="button" className="chip" onClick={() => onJump(id)} style={{ "--tone": node.tone.blue } as React.CSSProperties}>
                <i className="chip__dot" aria-hidden="true" />
                {node.title}
              </button>
            </li>
          );
        })}
        {capped && (
          <li>
            <button type="button" className="chip chip--more" onClick={() => setExpanded(true)}>
              {group.ids.length - RELATED_PREVIEW} more
            </button>
          </li>
        )}
      </ul>
    </div>
  );
}

/**
 * More about the held idea: what it is according to open sources (with images and credit), and every
 * other idea it connects to, each one a tap away.
 */
export function InfoSheet({ concept, onClose, onJump, showPageLink = true }: Props) {
  const { entries, retry } = useConceptSources(concept.sources, concept.id);
  const groups = useMemo(() => connectionsOf(concept), [concept]);

  return (
    <Sheet eyebrow="More about" title={concept.title} titleId="info-title" onClose={onClose}>
      {showPageLink && (
        <a className="page-link" href={`#/concept/${encodeURIComponent(concept.id)}`}>
          Open the full page: picture, mechanism, detail, principles →
        </a>
      )}
      {entries.map((entry) => (
        <SourceCard key={entry.provider.id} entry={entry} onRetry={retry} />
      ))}

      {groups.length > 0 && (
        <section className="connections" aria-label="Connected ideas">
          <p className="source__provider">Connected ideas</p>
          {groups.map((group) => (
            <ConnectionChips key={group.label} group={group} onJump={onJump} />
          ))}
        </section>
      )}

      <p className="sheet__note">
        Sources are only contacted while this sheet is open, and what they return is kept on this device for a week.
        Text from Wikipedia is shared under CC BY-SA 4.0; image credits link to the original files.
      </p>
    </Sheet>
  );
}
