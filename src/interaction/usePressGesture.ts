import { useCallback, useEffect, useRef, type PointerEvent as ReactPointerEvent } from "react";

export const HOLD_MS = 450;
const MOVE_SLOP = 8;
const EDGE_ZONE = 24;
const EDGE_SWIPE = 56;

export type PressGestureHandlers = {
  /** A press began on a node, so its halo can start growing. */
  onPressStart: (id: string) => void;
  /** The press ended without becoming a hold (released, dragged, or interrupted). */
  onPressEnd: (id: string) => void;
  onTap: (id: string) => void;
  onHold: (id: string) => void;
  onBackgroundTap: () => void;
  onPan: (dx: number, dy: number) => void;
  onPinch: (factor: number, cx: number, cy: number) => void;
  onEdgeSwipe: () => void;
};

type Mode = "pending" | "pan" | "held" | "edge" | "done";

type Press = {
  pointerId: number;
  id: string | null;
  startX: number;
  startY: number;
  lastX: number;
  lastY: number;
  mode: Mode;
  timer: number | null;
};

/**
 * pointer down
 * ├── movement beyond the slop → canvas drag
 * ├── released before the hold delay → node tap (or background tap)
 * └── hold delay reached → node focus
 * Two pointers always mean pinch. A tap is never fired after a hold.
 */
export function usePressGesture(handlers: PressGestureHandlers, focusOpen: boolean) {
  const latest = useRef(handlers);
  latest.current = handlers;
  const focusRef = useRef(focusOpen);
  focusRef.current = focusOpen;

  const pointers = useRef(new Map<number, { x: number; y: number }>());
  const press = useRef<Press | null>(null);
  const pinch = useRef<{ dist: number; cx: number; cy: number } | null>(null);

  const clearTimer = (p: Press) => {
    if (p.timer !== null) window.clearTimeout(p.timer);
    p.timer = null;
  };

  const endPress = useCallback(() => {
    const p = press.current;
    if (!p) return;
    clearTimer(p);
    if (p.id && p.mode !== "held") latest.current.onPressEnd(p.id);
    press.current = null;
  }, []);

  useEffect(() => endPress, [endPress]);

  const onPointerDown = useCallback((event: ReactPointerEvent<HTMLElement>) => {
    if (event.pointerType === "mouse" && event.button !== 0) return;
    try {
      event.currentTarget.setPointerCapture(event.pointerId);
    } catch {
      /* the pointer may already be gone; the gesture still works without capture */
    }
    pointers.current.set(event.pointerId, { x: event.clientX, y: event.clientY });

    if (pointers.current.size === 2) {
      endPress();
      const [a, b] = [...pointers.current.values()];
      pinch.current = { dist: Math.hypot(a.x - b.x, a.y - b.y) || 1, cx: (a.x + b.x) / 2, cy: (a.y + b.y) / 2 };
      return;
    }
    if (pointers.current.size > 2) return;

    const nodeEl = (event.target as Element).closest<HTMLElement>("[data-node-id]");
    const id = nodeEl?.dataset.nodeId ?? null;
    const edge = focusRef.current && (event.clientX < EDGE_ZONE || event.clientX > window.innerWidth - EDGE_ZONE);
    const next: Press = {
      pointerId: event.pointerId,
      id,
      startX: event.clientX,
      startY: event.clientY,
      lastX: event.clientX,
      lastY: event.clientY,
      mode: edge ? "edge" : "pending",
      timer: null,
    };
    press.current = next;

    if (id && !edge) {
      latest.current.onPressStart(id);
      next.timer = window.setTimeout(() => {
        if (press.current !== next || next.mode !== "pending") return;
        next.mode = "held";
        next.timer = null;
        latest.current.onHold(id);
      }, HOLD_MS);
    }
  }, [endPress]);

  const onPointerMove = useCallback((event: ReactPointerEvent<HTMLElement>) => {
    const known = pointers.current.get(event.pointerId);
    if (!known) return;
    const prev = { ...known };
    known.x = event.clientX;
    known.y = event.clientY;

    if (pinch.current && pointers.current.size === 2) {
      const [a, b] = [...pointers.current.values()];
      const dist = Math.hypot(a.x - b.x, a.y - b.y) || 1;
      const cx = (a.x + b.x) / 2;
      const cy = (a.y + b.y) / 2;
      latest.current.onPinch(dist / pinch.current.dist, cx, cy);
      latest.current.onPan(cx - pinch.current.cx, cy - pinch.current.cy);
      pinch.current = { dist, cx, cy };
      return;
    }

    const p = press.current;
    if (!p || p.pointerId !== event.pointerId) return;
    const dx = event.clientX - prev.x;
    const dy = event.clientY - prev.y;
    p.lastX = event.clientX;
    p.lastY = event.clientY;

    if (p.mode === "edge") {
      const travelled = event.clientX - p.startX;
      if (Math.abs(travelled) > EDGE_SWIPE && (p.startX < EDGE_ZONE ? travelled > 0 : travelled < 0)) {
        p.mode = "done";
        latest.current.onEdgeSwipe();
      }
      return;
    }
    if (p.mode === "pending" && Math.hypot(event.clientX - p.startX, event.clientY - p.startY) > MOVE_SLOP) {
      clearTimer(p);
      if (p.id) latest.current.onPressEnd(p.id);
      p.mode = "pan";
      // Catch up on the movement spent inside the slop so the canvas does not jump.
      latest.current.onPan(event.clientX - p.startX, event.clientY - p.startY);
      return;
    }
    if (p.mode === "pan") latest.current.onPan(dx, dy);
  }, []);

  const finish = useCallback((event: ReactPointerEvent<HTMLElement>, cancelled: boolean) => {
    pointers.current.delete(event.pointerId);
    if (pointers.current.size < 2) pinch.current = null;

    const p = press.current;
    if (!p || p.pointerId !== event.pointerId) return;
    const wasPending = p.mode === "pending";
    const id = p.id;
    endPress();
    if (!wasPending || cancelled) return;
    if (id) latest.current.onTap(id);
    else latest.current.onBackgroundTap();
  }, [endPress]);

  const onPointerUp = useCallback((event: ReactPointerEvent<HTMLElement>) => finish(event, false), [finish]);
  const onPointerCancel = useCallback((event: ReactPointerEvent<HTMLElement>) => finish(event, true), [finish]);

  return { onPointerDown, onPointerMove, onPointerUp, onPointerCancel };
}
