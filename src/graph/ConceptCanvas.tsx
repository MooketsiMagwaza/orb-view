import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties, type FocusEvent } from "react";
import type { ConceptNode } from "../concepts/types";
import { usePressGesture, HOLD_MS } from "../interaction/usePressGesture";
import { ConceptNodeView } from "./ConceptNode";
import { boundsOf, computeLayout, type Vec } from "./graph-layout";
import { graph } from "./model";
import { deriveRoles, nearRelated, shownChildren, topOf, type NavState, type Role } from "./navigation";
import { drawOrb, inkFor, orbSpec, type OrbInk, type OrbSpec } from "./orb-paint";
import { useViewport } from "./useViewport";

/** Scale used while an orb is held at the center of the frame. */
export const FOCUS_SCALE = 1.5;
const FOCUS_NODE_SCALE = 1.3;
const ORB_SPACE = 64;
/** On-screen radius of a held orb; the explanation is laid out just beneath it. */
export const FOCUS_ORB_RADIUS = (ORB_SPACE / 2) * FOCUS_SCALE * FOCUS_NODE_SCALE;
const FRAME_PADDING = 96;
/** Screen pixels kept free along the bottom edge. */
const BOTTOM_RESERVE = 72;
const FIT_MIN = 0.8;
const FIT_MAX = 1.3;
const RECEDE_DISTANCE = 70;
/** How long a node that left the view stays mounted so it can fade out. */
const LINGER_MS = 1300;
const SHOW_ALL = import.meta.env.DEV && new URLSearchParams(window.location.search).has("all");

const ROLE_OPACITY: Record<Role, number> = { center: 1, child: 1, related: 0.9, trail: 0.55, far: 0.2, hidden: 0 };
const ROLE_SCALE: Record<Role, number> = { center: 1.18, child: 1, related: 0.92, trail: 0.9, far: 0.82, hidden: 0.6 };

type Runtime = {
  node: ConceptNode;
  el: HTMLElement;
  orbEl: HTMLElement;
  glowEl: HTMLElement;
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D | null;
  ink: OrbInk;
  spec: OrbSpec;
  home: Vec;
  anchor: Vec;
  x: number;
  y: number;
  fx: number; fy: number; px: number; py: number; ax: number; ay: number;
  clock: number;
  /** Spreads slower-cadence orbs across frames so they never all repaint on the same one. */
  slot: number;
  role: Role;
  appear: number;
  appearV: { v: number };
  appearAt: number;
  opacity: number;
  recede: number;
  calm: number;
  pace: number;
  scale: number;
  pulse: number;
  alpha: number;
  hiddenStyle: boolean;
  /** The orb needs repainting even if its cadence says it is not due (just appeared, role changed). */
  dirty: boolean;
};

type Props = {
  nav: NavState;
  focusedId: string | null;
  reducedMotion: boolean;
  onTap: (id: string) => void;
  onHold: (id: string) => void;
  onBackgroundTap: () => void;
  onEdgeSwipe: () => void;
};

const damp = (rate: number, dt: number) => 1 - Math.exp(-rate * dt);

function hashOf(text: string): number {
  let h = 2166136261;
  for (let i = 0; i < text.length; i++) h = Math.imul(h ^ text.charCodeAt(i), 16777619);
  return (h >>> 0) / 4294967296;
}

/** How often, in frames, an orb repaints. 0 = only when something changed. */
function cadenceFor(role: Role, isFocus: boolean, focus: string | null, reduced: boolean): number {
  if (reduced || SHOW_ALL) return 0;
  if (focus) return isFocus ? 1 : 0;
  if (role === "center") return 1;
  if (role === "child") return 2;
  if (role === "related" || role === "trail") return 3;
  return 0;
}

/**
 * The open canvas: a pannable, zoomable network of orbs. React decides which concepts are on screen and in
 * what role and mounts only those; a single animation loop moves everything, so 60 fps drift never
 * triggers a React render, and cost depends on what is visible rather than on how large the network is.
 */
export function ConceptCanvas({ nav, focusedId, reducedMotion, onTap, onHold, onBackgroundTap, onEdgeSwipe }: Props) {
  const stageRef = useRef<HTMLDivElement>(null);
  const worldRef = useRef<HTMLDivElement>(null);
  const edgeRef = useRef<HTMLCanvasElement>(null);
  const { camera, size } = useViewport(stageRef);
  const layout = useMemo(() => computeLayout(), []);
  const roles = useMemo(() => deriveRoles(nav, layout, SHOW_ALL), [nav, layout]);

  // ── Mount only what is visible (plus what is still fading out) ────────
  const visibleIds = useMemo(() => {
    const ids = new Set<string>();
    for (const [id, role] of roles) if (role !== "hidden") ids.add(id);
    return ids;
  }, [roles]);
  const [mounted, setMounted] = useState<Set<string>>(visibleIds);
  useEffect(() => {
    setMounted((prev) => {
      let changed = false;
      const next = new Set(prev);
      for (const id of visibleIds) if (!next.has(id)) { next.add(id); changed = true; }
      return changed ? next : prev;
    });
    const timer = window.setTimeout(() => {
      setMounted((prev) => (prev.size === visibleIds.size && [...prev].every((id) => visibleIds.has(id)) ? prev : new Set(visibleIds)));
    }, LINGER_MS);
    return () => window.clearTimeout(timer);
  }, [visibleIds]);
  const renderedNodes = useMemo(
    () => graph.nodes.filter((node) => mounted.has(node.id) || visibleIds.has(node.id)),
    [mounted, visibleIds],
  );

  const runtimes = useRef(new Map<string, Runtime>());
  const edgeStates = useRef(new Map<string, { opacity: number }>());
  const density = useRef(Math.min(2, Math.max(1.5, window.devicePixelRatio || 1)));
  const live = useRef({ roles, focusedId, reducedMotion, center: layout.get(topOf(nav))! });
  live.current = { roles, focusedId, reducedMotion, center: layout.get(topOf(nav))! };
  const savedCamera = useRef<ReturnType<typeof camera.save> | null>(null);
  const pressing = useRef<string | null>(null);
  const hasFitted = useRef(false);
  /** Leaving focus restores the exact canvas position, so the next framing pass must not override it... */
  const skipFrame = useRef(false);
  /** ...unless the trail changed while focused (a jump from the info sheet), which needs a fresh framing. */
  const focusNav = useRef<NavState | null>(null);

  // A node's runtime state lives exactly as long as its element does.
  const register = useCallback((id: string, el: HTMLElement | null) => {
    if (!el) {
      runtimes.current.delete(id);
      for (const edge of graph.edgesOf.get(id) ?? []) edgeStates.current.delete(edge.id);
      return;
    }
    if (runtimes.current.get(id)?.el === el) return;
    const node = graph.byId.get(id)!;
    const canvas = el.querySelector("canvas")!;
    canvas.width = canvas.height = Math.round(ORB_SPACE * density.current);
    const home = layout.get(id)!;
    const base = hashOf(id);
    const seed = (n: number) => {
      const x = Math.sin(base * 9973 + n * 78.233) * 43758.5453;
      return x - Math.floor(x);
    };
    runtimes.current.set(id, {
      node, el,
      orbEl: el.querySelector<HTMLElement>(".node__orb")!,
      glowEl: el.querySelector<HTMLElement>(".node__glow")!,
      canvas,
      ctx: canvas.getContext("2d"),
      ink: inkFor(node.tone),
      spec: orbSpec(node.orb),
      home, anchor: home, x: home.x, y: home.y,
      fx: 0.28 + seed(1) * 0.32, fy: 0.24 + seed(2) * 0.32, px: seed(3) * 6.28, py: seed(4) * 6.28,
      ax: 3 + seed(5) * 4, ay: 3 + seed(6) * 4,
      clock: seed(7) * 40,
      slot: Math.floor(seed(8) * 6),
      role: "hidden",
      appear: 0, appearV: { v: 0 }, appearAt: 0,
      opacity: 0, recede: 0, calm: 1, pace: 1, scale: 1, pulse: 0, alpha: 0,
      hiddenStyle: true, // matches the stylesheet's `visibility: hidden`
      dirty: true,
    });
  }, [layout]);

  // The edge layer is one canvas the size of the stage.
  useEffect(() => {
    const canvas = edgeRef.current;
    if (!canvas || !size.width) return;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    canvas.width = Math.round(size.width * dpr);
    canvas.height = Math.round(size.height * dpr);
  }, [size]);

  // ── Frame the local group whenever the trail or viewport changes ──────
  useEffect(() => {
    if (focusedId || !size.width) return;
    if (skipFrame.current) {
      skipFrame.current = false;
      if (focusNav.current === nav) return;
    }
    const top = topOf(nav);
    const points: Vec[] = [];
    if (SHOW_ALL) {
      for (const p of layout.values()) points.push(p);
    } else {
      points.push(layout.get(top)!);
      for (const id of shownChildren(nav)) points.push(layout.get(id)!);
      for (const id of nearRelated(nav, layout)) points.push(layout.get(id)!);
      if (points.length === 1 && nav.stack.length > 1) points.push(layout.get(nav.stack[nav.stack.length - 2])!);
    }
    const b = boundsOf(points);
    const w = b.maxX - b.minX + FRAME_PADDING * 2;
    const h = b.maxY - b.minY + FRAME_PADDING * 2;
    // Keep the bottom edge clear for the back control and the first-run hint.
    const usable = camera.height - BOTTOM_RESERVE;
    const fit = Math.min(FIT_MAX, Math.max(SHOW_ALL ? 0.05 : FIT_MIN, Math.min(camera.width / w, usable / h)));
    camera.goTo((b.minX + b.maxX) / 2, (b.minY + b.maxY) / 2 + BOTTOM_RESERVE / 2 / fit, fit, reducedMotion || !hasFitted.current);
    hasFitted.current = true;
  }, [nav, size, layout, camera, focusedId, reducedMotion]);

  // ── Hold: glide the node to the exact center, then come back ──────────
  useEffect(() => {
    if (focusedId) {
      const home = layout.get(focusedId);
      if (!home) return;
      savedCamera.current = camera.save();
      focusNav.current = nav;
      camera.locked = true;
      camera.goToExact(home.x, home.y, FOCUS_SCALE, reducedMotion);
      return () => {
        camera.locked = false;
        skipFrame.current = true;
        if (savedCamera.current) camera.restore(savedCamera.current, live.current.reducedMotion);
        savedCamera.current = null;
        stageRef.current?.querySelector<HTMLButtonElement>(`[data-node-id="${focusedId}"] button`)?.focus({ preventScroll: true });
      };
    }
  }, [focusedId, camera, reducedMotion, layout]);

  // Reduced motion draws each orb once, so flag everything for a repaint when it flips.
  useEffect(() => {
    for (const n of runtimes.current.values()) n.dirty = true;
  }, [reducedMotion]);

  // ── Gestures ──────────────────────────────────────────────────────────
  const setPressing = useCallback((id: string | null) => {
    if (pressing.current) runtimes.current.get(pressing.current)?.el.classList.remove("is-pressing");
    pressing.current = id;
    if (id) runtimes.current.get(id)?.el.classList.add("is-pressing");
  }, []);

  const pulse = useCallback((id: string) => {
    const runtime = runtimes.current.get(id);
    if (runtime) runtime.pulse = 1;
  }, []);

  const gesture = usePressGesture(
    {
      onPressStart: (id) => setPressing(id),
      onPressEnd: () => setPressing(null),
      onTap: (id) => { pulse(id); onTap(id); },
      onHold: (id) => { setPressing(null); pulse(id); onHold(id); },
      onBackgroundTap,
      onPan: (dx, dy) => camera.panBy(dx, dy),
      onPinch: (factor, cx, cy) => {
        const rect = stageRef.current!.getBoundingClientRect();
        camera.zoomAt(factor, cx - rect.left, cy - rect.top);
      },
      onEdgeSwipe,
    },
    focusedId !== null,
  );

  useEffect(() => {
    const stage = stageRef.current!;
    const onWheel = (event: WheelEvent) => {
      event.preventDefault();
      const rect = stage.getBoundingClientRect();
      camera.zoomAt(Math.exp(-event.deltaY * (event.ctrlKey ? 0.01 : 0.0018)), event.clientX - rect.left, event.clientY - rect.top);
    };
    stage.addEventListener("wheel", onWheel, { passive: false });
    return () => stage.removeEventListener("wheel", onWheel);
  }, [camera]);

  const onKey = useCallback((id: string, kind: "tap" | "hold") => {
    pulse(id);
    if (kind === "tap") onTap(id); else onHold(id);
  }, [onTap, onHold, pulse]);
  const onClickActivate = useCallback((id: string) => { pulse(id); onTap(id); }, [onTap, pulse]);

  // Keyboard focus that lands off-screen brings its node back into view.
  const onFocusCapture = useCallback((event: FocusEvent) => {
    if (live.current.focusedId) return;
    const id = (event.target as HTMLElement).closest<HTMLElement>("[data-node-id]")?.dataset.nodeId;
    const runtime = id ? runtimes.current.get(id) : undefined;
    if (!runtime) return;
    const at = camera.toScreen(runtime.x, runtime.y);
    const margin = 72;
    if (at.x < margin || at.y < margin || at.x > camera.width - margin || at.y > camera.height - margin) {
      camera.tx = runtime.home.x;
      camera.ty = runtime.home.y;
    }
  }, [camera]);

  // ── The one animation loop ────────────────────────────────────────────
  useEffect(() => {
    const world = worldRef.current!;
    let raf = 0;
    let last = performance.now();
    let frame = 0;
    let dashed = false;

    const tick = (now: number) => {
      const workStart = import.meta.env.DEV ? performance.now() : 0;
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      frame++;
      const time = now / 1000;
      const { roles: currentRoles, focusedId: focus, reducedMotion: reduced, center } = live.current;

      camera.update(dt, reduced ? 0.01 : focus ? 0.6 : 0.55);
      world.style.transform = `translate3d(${camera.width / 2}px, ${camera.height / 2}px, 0) scale(${camera.scale}) translate3d(${-camera.x}px, ${-camera.y}px, 0)`;

      const fadeRate = reduced ? 16 : 5.5;
      let flips = 0;

      for (const n of runtimes.current.values()) {
        const role = currentRoles.get(n.node.id) ?? "hidden";
        if (role !== n.role) {
          const becameVisible = n.role === "hidden" && role !== "hidden";
          const becameHidden = n.role !== "hidden" && role === "hidden";
          if (becameVisible || becameHidden) {
            n.anchor = center;
            n.appearAt = becameVisible ? time + flips * 0.05 : 0;
            if (becameVisible) flips++;
            if (reduced) { n.appear = becameVisible ? 1 : 0; n.appearV.v = 0; }
          }
          n.role = role;
          n.dirty = true;
        }

        const isFocus = focus === n.node.id;
        const visible = role !== "hidden";
        const roleOpacity = focus ? (isFocus ? 1 : 0.05) : ROLE_OPACITY[role];

        n.opacity += (roleOpacity - n.opacity) * damp(fadeRate, dt);
        if (reduced) {
          n.appear = visible ? 1 : 0;
        } else {
          const appearTarget = visible && time >= n.appearAt ? 1 : 0;
          const omega = appearTarget ? 9 : 12;
          const x = omega * dt;
          const decay = 1 / (1 + x + 0.48 * x * x + 0.235 * x * x * x);
          const change = n.appear - appearTarget;
          const temp = (n.appearV.v + omega * change) * dt;
          n.appearV.v = (n.appearV.v - omega * temp) * decay;
          n.appear = appearTarget + (change + temp) * decay;
        }
        const grow = Math.min(1, Math.max(0, n.appear));
        n.recede += ((role === "far" && !focus && !reduced ? 1 : 0) - n.recede) * damp(3.2, dt);
        n.calm += ((reduced || isFocus ? 0 : 1) - n.calm) * damp(4, dt);
        n.pace += ((isFocus ? 0.55 : 1) - n.pace) * damp(3, dt);
        n.pulse *= Math.exp(-dt * 4.5);
        n.clock += dt * n.pace;

        // Position: emerge from the anchor, drift gently, and step outward when unrelated.
        let bx = n.home.x;
        let by = n.home.y;
        if (n.recede > 0.001) {
          const dx = n.home.x - center.x;
          const dy = n.home.y - center.y;
          const d = Math.hypot(dx, dy) || 1;
          bx += (dx / d) * RECEDE_DISTANCE * n.recede;
          by += (dy / d) * RECEDE_DISTANCE * n.recede;
        }
        bx += Math.sin(time * n.fx + n.px) * n.ax * n.calm;
        by += Math.cos(time * n.fy + n.py) * n.ay * n.calm;
        n.x = n.anchor.x + (bx - n.anchor.x) * n.appear;
        n.y = n.anchor.y + (by - n.anchor.y) * n.appear;

        const isRoot = n.node.id === graph.nodes[0].id;
        const targetScale = (isFocus ? FOCUS_NODE_SCALE : ROLE_SCALE[role]) * (isRoot ? 1.14 : 1);
        n.scale += (targetScale - n.scale) * damp(6, dt);
        const drawScale = n.scale * (0.55 + 0.45 * grow) * (1 - 0.13 * n.pulse);
        n.alpha = n.opacity * Math.min(1, grow * 1.5);

        const hide = n.alpha < 0.012;
        if (hide !== n.hiddenStyle) {
          n.el.style.visibility = hide ? "hidden" : "visible";
          n.hiddenStyle = hide;
        }
        if (hide) continue;

        n.el.style.transform = `translate3d(${n.x.toFixed(2)}px, ${n.y.toFixed(2)}px, 0) scale(${drawScale.toFixed(4)})`;
        n.el.style.opacity = n.alpha.toFixed(3);

        const breathe = reduced || n.calm < 0.05 ? 0 : Math.sin(time * (0.9 + n.node.tone.speed * 0.5) + n.px) * (0.012 + n.node.tone.intensity * 0.028);
        n.orbEl.style.transform = `scale(${(1 + breathe).toFixed(4)})`;
        n.glowEl.style.opacity = (0.16 + n.node.tone.intensity * 0.12 + (role === "center" ? 0.2 : 0) + (isFocus ? 0.25 : 0) + n.pulse * 0.5).toFixed(3);

        // Paint the orb only when it is due: the center every frame, its children every other frame,
        // the trail every third, and receded orbs just once. Faint or off-screen orbs are skipped.
        if (!n.ctx || n.alpha < 0.03) continue;
        const at = camera.toScreen(n.x, n.y);
        if (at.x < -110 || at.y < -110 || at.x > camera.width + 110 || at.y > camera.height + 110) continue;
        const cadence = cadenceFor(role, isFocus, focus, reduced);
        const due = cadence > 0 && (frame + n.slot) % cadence === 0;
        if (!(due || n.dirty || n.pulse > 0.03)) continue;
        const t = reduced ? 0.6 : n.clock * n.spec.speed * n.node.tone.speed;
        drawOrb(n.ctx, n.canvas.width, n.spec, n.ink, t, 1 + n.pulse * 0.4);
        n.dirty = false;
      }

      // Edges: curved lines on one canvas that flex with the drifting nodes.
      const edgeCanvas = edgeRef.current;
      const ectx = edgeCanvas?.getContext("2d");
      if (edgeCanvas && ectx) {
        const dpr = edgeCanvas.width / (camera.width || 1);
        ectx.setTransform(dpr, 0, 0, dpr, 0, 0);
        ectx.clearRect(0, 0, camera.width, camera.height);
        const s = camera.scale;
        const cx = camera.width / 2;
        const cy = camera.height / 2;

        for (const a of runtimes.current.values()) {
          for (const edge of graph.edgesOf.get(a.node.id) ?? []) {
            if (edge.from !== a.node.id) continue;
            const b = runtimes.current.get(edge.to);
            if (!b) continue;
            const bothVisible = a.role !== "hidden" && b.role !== "hidden";
            const wanted = !bothVisible ? 0 : edge.kind === "related" ? (!focus && (a.role === "center" || b.role === "center") ? 1 : 0) : 1;
            let state = edgeStates.current.get(edge.id);
            if (!state) {
              if (wanted === 0) continue;
              state = { opacity: 0 };
              edgeStates.current.set(edge.id, state);
            }
            state.opacity += (wanted - state.opacity) * damp(fadeRate, dt);
            const alpha = state.opacity * Math.min(a.alpha, b.alpha);
            if (alpha < 0.01) continue;

            const dx = b.x - a.x;
            const dy = b.y - a.y;
            const d = Math.hypot(dx, dy) || 1;
            const ux = dx / d;
            const uy = dy / d;
            const trimA = 31 * a.scale;
            const trimB = 31 * b.scale;
            if (d <= trimA + trimB + 4) continue;
            const ax = a.x + ux * trimA;
            const ay = a.y + uy * trimA;
            const bx = b.x - ux * trimB;
            const by = b.y - uy * trimB;
            const bow = (edge.seed - 0.5) * d * 0.16 + (reduced ? 0 : Math.sin(time * 0.6 + edge.seed * 9) * 4);
            const mx = (ax + bx) / 2 - uy * bow;
            const my = (ay + by) / 2 + ux * bow;

            const related = edge.kind === "related";
            if (related !== dashed) {
              ectx.setLineDash(related ? [1.5, 7] : []);
              dashed = related;
            }
            ectx.globalAlpha = alpha * (related ? 0.6 : 0.5);
            ectx.strokeStyle = related ? "rgb(70,96,236)" : "rgb(55,140,246)";
            ectx.lineWidth = related ? 1.6 : 1.3;
            ectx.lineCap = "round";
            ectx.beginPath();
            ectx.moveTo(cx + (ax - camera.x) * s, cy + (ay - camera.y) * s);
            ectx.quadraticCurveTo(cx + (mx - camera.x) * s, cy + (my - camera.y) * s, cx + (bx - camera.x) * s, cy + (by - camera.y) * s);
            ectx.stroke();
          }
        }
        ectx.globalAlpha = 1;
      }

      if (import.meta.env.DEV) {
        // Dev only: how long one frame of the loop's own work takes, for spotting regressions.
        const perf = ((window as unknown as { __orbPerf?: { avg: number; max: number; frames: number; mounted: number } }).__orbPerf ??= { avg: 0, max: 0, frames: 0, mounted: 0 });
        const ms = performance.now() - workStart;
        perf.avg += (ms - perf.avg) * 0.05;
        perf.max = Math.max(perf.max * 0.995, ms);
        perf.frames++;
        perf.mounted = runtimes.current.size;
      }

      raf = requestAnimationFrame(tick);
    };

    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [camera]);

  return (
    <div
      ref={stageRef}
      className={`stage${focusedId ? " is-focus" : ""}`}
      style={{ "--hold-ms": `${HOLD_MS}ms` } as CSSProperties}
      role="group"
      aria-label="Network of connected ideas"
      aria-describedby="orb-help"
      onContextMenu={(event) => event.preventDefault()}
      onFocusCapture={onFocusCapture}
      {...gesture}
    >
      <p id="orb-help" className="sr-only">
        Press Enter on an idea to explore what connects to it. Press Space to read a short explanation.
      </p>
      <canvas ref={edgeRef} className="edges" aria-hidden="true" />
      <div ref={worldRef} className="world">
        {renderedNodes.map((node) => (
          <ConceptNodeView
            key={node.id}
            node={node}
            role={roles.get(node.id) ?? "hidden"}
            focusOpen={focusedId !== null}
            isFocused={focusedId === node.id}
            register={register}
            onKey={onKey}
            onClickActivate={onClickActivate}
          />
        ))}
      </div>
    </div>
  );
}
