import { getNode } from "../graph/model";
import type { Category } from "./categories";

type Props = {
  category: Category;
  /** Index into `category.path` of where the reader currently is. */
  index: number;
  onStep: (index: number) => void;
  onClose: () => void;
};

/**
 * A quiet strip while a path is active: where you are in it and one tap to the next idea. The network
 * stays free to explore; the strip just remembers the way.
 */
export function PathBar({ category, index, onStep, onClose }: Props) {
  const last = category.path.length - 1;
  const next = index < last ? getNode(category.path[index + 1]) : null;
  const previous = index > 0 ? getNode(category.path[index - 1]) : null;

  return (
    <div className="pathbar" role="group" aria-label={`Path: ${category.title}`}>
      <div className="pathbar__progress" aria-hidden="true">
        <i style={{ width: `${((index + 1) / category.path.length) * 100}%` }} />
      </div>
      <button
        type="button"
        className="pathbar__step"
        onClick={() => onStep(index - 1)}
        disabled={!previous}
        aria-label={previous ? `Previous: ${previous.title}` : "No previous step"}
      >
        <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M14.5 5.5 8 12l6.5 6.5" /></svg>
      </button>
      <button type="button" className="pathbar__next" onClick={() => next && onStep(index + 1)} disabled={!next}>
        <span className="pathbar__meta">{category.title} · {index + 1} of {category.path.length}</span>
        <span className="pathbar__title">{next ? `Next: ${next.title}` : "End of the path"}</span>
      </button>
      <button type="button" className="pathbar__close" onClick={onClose} aria-label="Leave this path">
        <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true"><path d="m7 7 10 10M17 7 7 17" /></svg>
      </button>
    </div>
  );
}
