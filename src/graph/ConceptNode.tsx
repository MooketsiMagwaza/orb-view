import { memo, useCallback, type CSSProperties, type KeyboardEvent } from "react";
import type { ConceptNode } from "../concepts/types";
import type { Role } from "./navigation";

type Props = {
  node: ConceptNode;
  role: Role;
  /** Something is held in focus; the whole network steps back. */
  focusOpen: boolean;
  /** This node is the one currently held in focus. */
  isFocused: boolean;
  /** Hands the mounted element to the canvas loop (and takes it back on unmount). */
  register: (id: string, el: HTMLElement | null) => void;
  onKey: (id: string, kind: "tap" | "hold") => void;
  /** Screen-reader activation (no pointer) arrives as a click with detail 0. */
  onClickActivate: (id: string) => void;
};

/**
 * One concept: its orb, a short label, and a generous invisible touch target. Only concepts that are
 * on screen (or still fading) are mounted at all. Position, opacity, and orb pixels are driven by the
 * canvas loop. Enter continues exploring; Space opens the explanation.
 */
export const ConceptNodeView = memo(function ConceptNodeView({ node, role, focusOpen, isFocused, register, onKey, onClickActivate }: Props) {
  const hidden = role === "hidden";
  const style = { "--tone": node.tone.blue } as CSSProperties;
  const setRef = useCallback((el: HTMLDivElement | null) => register(node.id, el), [register, node.id]);

  const handleKeyDown = (event: KeyboardEvent<HTMLButtonElement>) => {
    if (event.key === "Enter") {
      event.preventDefault();
      onKey(node.id, "tap");
    } else if (event.key === " ") {
      event.preventDefault();
    }
  };
  const handleKeyUp = (event: KeyboardEvent<HTMLButtonElement>) => {
    if (event.key === " ") {
      event.preventDefault();
      onKey(node.id, "hold");
    }
  };

  return (
    <div
      ref={setRef}
      className="node"
      data-node-id={node.id}
      data-role={role}
      data-focused={isFocused || undefined}
      style={style}
      inert={hidden || focusOpen}
    >
      <button
        type="button"
        className="node__hit"
        tabIndex={role === "far" ? -1 : 0}
        aria-label={node.title}
        aria-current={role === "center" ? "true" : undefined}
        onKeyDown={handleKeyDown}
        onKeyUp={handleKeyUp}
        onClick={(event) => {
          if (event.detail === 0) onClickActivate(node.id);
        }}
      >
        <span className="node__glow" />
        <svg className="node__halo" viewBox="0 0 100 100" aria-hidden="true">
          <circle cx="50" cy="50" r="46" />
        </svg>
        <span className="node__orb">
          <canvas aria-hidden="true" />
        </span>
        <span className="node__label">{node.title}</span>
      </button>
    </div>
  );
});
