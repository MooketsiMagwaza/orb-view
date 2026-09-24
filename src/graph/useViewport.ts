import { useEffect, useMemo, useState, type RefObject } from "react";

export type Viewport = { x: number; y: number; scale: number };

export const MIN_SCALE = 0.55;
export const MAX_SCALE = 2.4;
const MIN_ZOOM = 0.6;
const MAX_ZOOM = 2.2;

/** Critically damped spring (Unity-style SmoothDamp): follows a moving target without overshoot. */
function smoothDamp(current: number, target: number, velocity: { v: number }, smoothTime: number, dt: number): number {
  const omega = 2 / Math.max(0.0001, smoothTime);
  const x = omega * dt;
  const decay = 1 / (1 + x + 0.48 * x * x + 0.235 * x * x * x);
  const change = current - target;
  const temp = (velocity.v + omega * change) * dt;
  velocity.v = (velocity.v - omega * temp) * decay;
  return target + (change + temp) * decay;
}

/**
 * One shared camera for pan and zoom. Navigation sets a target; direct
 * manipulation (drag, pinch, wheel) moves both the camera and its target so
 * it never springs back against the user's hand.
 */
export class Camera {
  x = 0;
  y = 0;
  scale = 1;
  tx = 0;
  ty = 0;
  /** The scale that frames the current local group; `zoom` is the user's multiplier on top of it. */
  fit = 1;
  zoom = 1;
  locked = false;
  width = 1;
  height = 1;
  private vx = { v: 0 };
  private vy = { v: 0 };
  private vs = { v: 0 };

  get targetScale() {
    return clampScale(this.fit * this.zoom);
  }

  /** Aim the camera. With `snap` (reduced motion) it arrives immediately. */
  goTo(x: number, y: number, fit: number, snap = false) {
    this.tx = x;
    this.ty = y;
    this.fit = fit;
    if (snap) this.snap();
  }

  /** Focus mode: exact scale, ignoring the user's zoom. */
  goToExact(x: number, y: number, scale: number, snap = false) {
    this.tx = x;
    this.ty = y;
    this.fit = scale;
    this.zoom = 1;
    if (snap) this.snap();
  }

  snap() {
    this.x = this.tx;
    this.y = this.ty;
    this.scale = this.targetScale;
    this.vx.v = this.vy.v = this.vs.v = 0;
  }

  update(dt: number, smoothTime = 0.5) {
    this.x = smoothDamp(this.x, this.tx, this.vx, smoothTime, dt);
    this.y = smoothDamp(this.y, this.ty, this.vy, smoothTime, dt);
    this.scale = Math.exp(smoothDamp(Math.log(this.scale), Math.log(this.targetScale), this.vs, smoothTime, dt));
  }

  panBy(dxScreen: number, dyScreen: number) {
    if (this.locked) return;
    this.x -= dxScreen / this.scale;
    this.y -= dyScreen / this.scale;
    this.tx = this.x;
    this.ty = this.y;
    this.vx.v = this.vy.v = 0;
  }

  /** Zoom around a screen point so the world under the fingers stays put. */
  zoomAt(factor: number, sx: number, sy: number) {
    if (this.locked) return;
    const before = this.scale;
    const next = clampScale(before * factor);
    const ox = sx - this.width / 2;
    const oy = sy - this.height / 2;
    const worldX = this.x + ox / before;
    const worldY = this.y + oy / before;
    this.scale = next;
    this.x = worldX - ox / next;
    this.y = worldY - oy / next;
    this.zoom = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, next / this.fit));
    this.tx = this.x;
    this.ty = this.y;
    this.vx.v = this.vy.v = this.vs.v = 0;
  }

  toScreen(wx: number, wy: number): { x: number; y: number } {
    return { x: this.width / 2 + (wx - this.x) * this.scale, y: this.height / 2 + (wy - this.y) * this.scale };
  }

  save() {
    return { tx: this.tx, ty: this.ty, fit: this.fit, zoom: this.zoom };
  }

  restore(saved: { tx: number; ty: number; fit: number; zoom: number }, snap = false) {
    this.tx = saved.tx;
    this.ty = saved.ty;
    this.fit = saved.fit;
    this.zoom = saved.zoom;
    if (snap) this.snap();
  }
}

const clampScale = (scale: number) => Math.min(MAX_SCALE, Math.max(MIN_SCALE, scale));

/** Owns the camera and keeps its size in sync with the element it fills. */
export function useViewport(ref: RefObject<HTMLElement | null>) {
  const camera = useMemo(() => new Camera(), []);
  const [size, setSize] = useState({ width: 0, height: 0 });

  useEffect(() => {
    const element = ref.current;
    if (!element) return;
    const measure = () => {
      const { width, height } = element.getBoundingClientRect();
      camera.width = width;
      camera.height = height;
      setSize((prev) => (prev.width === width && prev.height === height ? prev : { width, height }));
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(element);
    return () => observer.disconnect();
  }, [camera, ref]);

  return { camera, size };
}
