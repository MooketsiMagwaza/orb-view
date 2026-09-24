import { useCallback, useEffect, useReducer, useRef, useState } from "react";
import { FocusView } from "../focus/FocusView";
import { FOCUS_ORB_RADIUS, ConceptCanvas } from "../graph/ConceptCanvas";
import { getNode } from "../graph/model";
import { navReducer, shownChildren, topOf, trailTo } from "../graph/navigation";
import { useInteractionSound } from "../interaction/useInteractionSound";
import { useReducedMotion } from "../interaction/useReducedMotion";
import { categoriesById, type Category } from "../paths/categories";
import { PathBar } from "../paths/PathBar";
import { PathPicker } from "../paths/PathPicker";
import { InfoSheet } from "../sheet/InfoSheet";

const HINT_KEY = "orb-view:hint-seen";
/** Keep the focus text mounted long enough to fade out while the network returns. */
const LEAVE_MS = 320;

function readHintSeen(): boolean {
  try {
    return window.localStorage.getItem(HINT_KEY) === "1";
  } catch {
    return false;
  }
}

const stroke = { fill: "none", stroke: "currentColor", strokeWidth: 1.8, strokeLinecap: "round", strokeLinejoin: "round" } as const;

function BackIcon() {
  return <svg viewBox="0 0 24 24" width="22" height="22" {...stroke} aria-hidden="true"><path d="M14.5 5.5 8 12l6.5 6.5" /></svg>;
}
function MoreIcon() {
  return <svg viewBox="0 0 24 24" width="22" height="22" {...stroke} aria-hidden="true"><path d="M6 14.5 12 8.5l6 6" /></svg>;
}
function PathsIcon() {
  return <svg viewBox="0 0 24 24" width="18" height="18" {...stroke} aria-hidden="true"><circle cx="6" cy="6" r="2.2" /><circle cx="18" cy="12" r="2.2" /><circle cx="7" cy="18" r="2.2" /><path d="M8 6.8c5 0 6 2.4 8 4.4M9 17.4c3.4-.6 5.4-2.6 7-4.6" /></svg>;
}
function SoundIcon({ muted }: { muted: boolean }) {
  return (
    <svg viewBox="0 0 24 24" width="20" height="20" {...stroke} aria-hidden="true">
      <path d="M4 9.5v5h3.5L12 18.5v-13L7.5 9.5H4Z" />
      {muted ? <path d="m16 9.5 4 5m0-5-4 5" /> : <path d="M15.5 9a4 4 0 0 1 0 6M17.8 6.5a7.5 7.5 0 0 1 0 11" />}
    </svg>
  );
}

function LibraryIcon() {
  return <svg viewBox="0 0 24 24" width="18" height="18" {...stroke} aria-hidden="true"><rect x="4" y="4" width="7" height="7" rx="1.5" /><rect x="13" y="4" width="7" height="7" rx="1.5" /><rect x="4" y="13" width="7" height="7" rx="1.5" /><rect x="13" y="13" width="7" height="7" rx="1.5" /></svg>;
}

type MapProps = {
  /** The idea the map opens on. Defaults to the root. */
  startId?: string;
  /** Leave the map for the library. */
  onLibrary?: () => void;
};

/** The map view: the whole network as orbs, opened on any idea. */
export default function App({ startId, onLibrary }: MapProps) {
  const [nav, dispatch] = useReducer(navReducer, startId, (id): ReturnType<typeof navReducer> => ({ stack: trailTo(id ?? "entropy"), deep: false }));
  const navRef = useRef(nav);
  navRef.current = nav;

  const [focusedId, setFocusedId] = useState<string | null>(null);
  const focusRef = useRef(focusedId);
  focusRef.current = focusedId;
  // The concept whose explanation is on screen; lingers briefly after the hold ends so it can fade.
  const [shownId, setShownId] = useState<string | null>(null);

  const [sheetOpen, setSheetOpen] = useState(false);
  const [pathsOpen, setPathsOpen] = useState(false);
  const [path, setPath] = useState<{ id: string; index: number } | null>(null);
  const pathRef = useRef(path);
  pathRef.current = path;
  const sheetRef = useRef(sheetOpen);
  sheetRef.current = sheetOpen;
  const pathsRef = useRef(pathsOpen);
  pathsRef.current = pathsOpen;
  const moreButton = useRef<HTMLButtonElement>(null);
  const pathsButton = useRef<HTMLButtonElement>(null);

  const [hintSeen, setHintSeen] = useState(readHintSeen);
  const reducedMotion = useReducedMotion();
  const sound = useInteractionSound();

  useEffect(() => {
    if (focusedId) {
      setShownId(focusedId);
      return;
    }
    setSheetOpen(false);
    const timer = window.setTimeout(() => setShownId(null), LEAVE_MS);
    return () => window.clearTimeout(timer);
  }, [focusedId]);

  const markHintSeen = useCallback(() => {
    setHintSeen((seen) => {
      if (seen) return seen;
      try {
        window.localStorage.setItem(HINT_KEY, "1");
      } catch {
        /* the hint will simply show again next time */
      }
      return true;
    });
  }, []);

  const exitFocus = useCallback(() => setFocusedId(null), []);

  const handleTap = useCallback((id: string) => {
    if (focusRef.current) return;
    const current = navRef.current;
    const next = navReducer(current, { type: "tap", id });
    const voice = getNode(id).tone.voice;
    sound.tap(voice, next.stack.length - 1);
    markHintSeen();
    if (next === current) return;
    dispatch({ type: "tap", id });
    // A few quiet ticks as new ideas unfold; never one per node.
    const opened = next.stack.length !== current.stack.length || next.deep !== current.deep;
    if (opened) {
      const count = Math.min(3, shownChildren(next).length);
      for (let i = 0; i < count; i++) sound.tick(voice, i);
    }
  }, [sound, markHintSeen]);

  const handleHold = useCallback((id: string) => {
    if (focusRef.current || sheetRef.current || pathsRef.current) return;
    setFocusedId(id);
    sound.hold(getNode(id).tone.voice);
    markHintSeen();
    if (!window.matchMedia("(prefers-reduced-motion: reduce)").matches) navigator.vibrate?.(12);
  }, [sound, markHintSeen]);

  /** Travel to any concept along its natural trail, so going back retraces the tree. */
  const goTo = useCallback((id: string) => {
    const stack = trailTo(id);
    dispatch({ type: "set", stack });
    const node = getNode(id);
    sound.tap(node.tone.voice, stack.length - 1);
    markHintSeen();
  }, [sound, markHintSeen]);

  const jumpTo = useCallback((id: string) => {
    setSheetOpen(false);
    setFocusedId(null);
    goTo(id);
  }, [goTo]);

  const beginPath = useCallback((category: Category) => {
    setPathsOpen(false);
    setSheetOpen(false);
    setFocusedId(null);
    setPath({ id: category.id, index: 0 });
    goTo(category.entry);
  }, [goTo]);

  const stepPath = useCallback((index: number) => {
    const current = pathRef.current;
    const id = current && categoriesById.get(current.id)?.path[index];
    if (!current || !id) return;
    setPath({ ...current, index });
    goTo(id);
  }, [goTo]);

  // Wandering onto another step of the path keeps the strip honest about where you are.
  useEffect(() => {
    setPath((current) => {
      if (!current) return current;
      const at = categoriesById.get(current.id)?.path.indexOf(topOf(nav)) ?? -1;
      return at >= 0 && at !== current.index ? { ...current, index: at } : current;
    });
  }, [nav]);

  const handleBack = useCallback(() => {
    if (focusRef.current) setFocusedId(null);
    else dispatch({ type: "back" });
  }, []);

  const closeSheet = useCallback(() => {
    setSheetOpen(false);
    window.setTimeout(() => moreButton.current?.focus({ preventScroll: true }), 0);
  }, []);

  const closePaths = useCallback(() => {
    setPathsOpen(false);
    window.setTimeout(() => pathsButton.current?.focus({ preventScroll: true }), 0);
  }, []);

  // Escape peels back one layer at a time: the info sheet, the paths list, then the held explanation.
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      if (sheetRef.current) { event.preventDefault(); closeSheet(); }
      else if (pathsRef.current) { event.preventDefault(); closePaths(); }
      else if (focusRef.current) { event.preventDefault(); setFocusedId(null); }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [closeSheet, closePaths]);

  const shownConcept = shownId ? getNode(shownId) : null;
  const center = getNode(topOf(nav));
  const layerOpen = sheetOpen || pathsOpen;
  const canGoBack = focusedId !== null || nav.stack.length > 1;
  const activeCategory = path ? categoriesById.get(path.id) ?? null : null;
  const announcement = `${center.title}. ${shownChildren(nav).length} connected ideas.`;

  return (
    <main className="app" data-focus={focusedId ? "open" : "closed"}>
      <div className="app-layer" inert={layerOpen}>
        <ConceptCanvas
          nav={nav}
          focusedId={focusedId}
          reducedMotion={reducedMotion}
          onTap={handleTap}
          onHold={handleHold}
          onBackgroundTap={exitFocus}
          onEdgeSwipe={exitFocus}
        />

        {shownConcept && (
          <FocusView
            key={shownConcept.id}
            concept={shownConcept}
            reducedMotion={reducedMotion}
            leaving={focusedId === null}
            orbRadius={FOCUS_ORB_RADIUS}
          />
        )}

        <div className="topbar" data-visible={!focusedId || undefined} inert={focusedId !== null}>
          {onLibrary && (
            <button type="button" className="control control--pill" onClick={onLibrary} aria-label="Back to the library">
              <LibraryIcon />
              <span>Library</span>
            </button>
          )}
          <button
            ref={pathsButton}
            type="button"
            className="control control--pill"
            onClick={() => setPathsOpen(true)}
            aria-label="Paths: choose somewhere to begin"
          >
            <PathsIcon />
            <span>Paths</span>
          </button>
        </div>

        <button
          type="button"
          className="control control--back"
          data-visible={canGoBack || undefined}
          inert={!canGoBack}
          onClick={handleBack}
          aria-label={focusedId ? "Leave explanation" : "Back to previous idea"}
        >
          <BackIcon />
        </button>

        <button
          ref={moreButton}
          type="button"
          className="control control--more"
          data-visible={focusedId ? true : undefined}
          inert={!focusedId}
          onClick={() => setSheetOpen(true)}
          aria-label={shownConcept ? `More about ${shownConcept.title}` : "More"}
        >
          <MoreIcon />
        </button>

        <button
          type="button"
          className="control control--sound"
          onClick={sound.toggleMuted}
          aria-pressed={sound.muted}
          aria-label={sound.muted ? "Turn sound on" : "Turn sound off"}
        >
          <SoundIcon muted={sound.muted} />
        </button>

        {activeCategory && path && !focusedId && (
          <PathBar category={activeCategory} index={path.index} onStep={stepPath} onClose={() => setPath(null)} />
        )}

        <p className="hint" data-visible={!hintSeen && !focusedId && !activeCategory ? true : undefined} aria-hidden="true">
          Tap to explore · Hold to understand
        </p>

        <p className="sr-only" aria-live="polite">{focusedId ? "" : announcement}</p>
      </div>

      {sheetOpen && shownConcept && <InfoSheet key={shownConcept.id} concept={shownConcept} onClose={closeSheet} onJump={jumpTo} />}
      {pathsOpen && <PathPicker activeId={path?.id ?? null} onBegin={beginPath} onClose={closePaths} />}
    </main>
  );
}
