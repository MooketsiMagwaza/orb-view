import { MODE_FRAMES, resolvePreset, type ModeFrame, type ModeOpts } from "thinking-orbs/engine";
import type { OrbState } from "thinking-orbs";
import type { ConceptTone } from "../concepts/types";

/**
 * Each concept wears one of the nine thinking-orbs forms. We ask the engine for the frame and paint it
 * ourselves so the ink can be blue and the speed and strength can follow each concept's tone.
 */
const TAU = Math.PI * 2;
const LUT_SIZE = 16;
const ALPHA_LEVELS = 6;
/** The engine's tuned 64px preset is the coordinate space every frame is authored in. */
const SPACE = 64;

export type OrbSpec = {
  frame: ModeFrame;
  opts: ModeOpts;
  /** The preset's own clock, so a tone speed of 1 looks like the library default for this form. */
  speed: number;
};

const specs = new Map<OrbState, OrbSpec>();

export function orbSpec(state: OrbState): OrbSpec {
  let spec = specs.get(state);
  if (!spec) {
    const resolved = resolvePreset(state, SPACE);
    spec = { frame: MODE_FRAMES[resolved.mode], opts: resolved.opts, speed: resolved.speed };
    specs.set(state, spec);
  }
  return spec;
}

export type OrbInk = { lut: string[]; gain: number };

const cache = new Map<string, OrbInk>();

function parseHex(hex: string): [number, number, number] {
  const value = Number.parseInt(hex.slice(1), 16);
  return [(value >> 16) & 255, (value >> 8) & 255, value & 255];
}

function mix(a: [number, number, number], b: [number, number, number], t: number): string {
  const channel = (i: number) => Math.round(a[i] + (b[i] - a[i]) * t).toString(16).padStart(2, "0");
  return `#${channel(0)}${channel(1)}${channel(2)}`;
}

/** Near dots read deep cobalt, far dots read pale cyan, with the concept's blue in between. */
export function inkFor(tone: ConceptTone): OrbInk {
  const key = `${tone.blue}:${tone.intensity}`;
  const cached = cache.get(key);
  if (cached) return cached;

  const mid = parseHex(tone.blue);
  const deep = parseHex(mix(mid, [8, 30, 92], 0.55));
  const pale = parseHex(mix(mid, [190, 234, 255], 0.72));
  const lut = Array.from({ length: LUT_SIZE }, (_, i) => {
    const w = i / (LUT_SIZE - 1);
    return w < 0.5 ? mix(deep, mid, w / 0.5) : mix(mid, pale, (w - 0.5) / 0.5);
  });
  const ink = { lut, gain: 0.62 + tone.intensity * 0.38 };
  cache.set(key, ink);
  return ink;
}

/** Reused between calls so painting an orb allocates nothing. Key = colorIndex * ALPHA_LEVELS + alphaIndex. */
const buckets = new Map<number, number[]>();

/**
 * Paint one instant of an orb into a canvas whose backing store is `pixels` wide.
 * Dots are grouped by color and alpha and filled once per group, which is roughly twice as fast as
 * filling every dot on its own and looks the same.
 */
export function drawOrb(ctx: CanvasRenderingContext2D, pixels: number, spec: OrbSpec, ink: OrbInk, t: number, boost = 1) {
  const frame = spec.frame(SPACE, t, spec.opts);
  ctx.setTransform(pixels / SPACE, 0, 0, pixels / SPACE, 0, 0);
  ctx.clearRect(0, 0, SPACE, SPACE);

  for (const line of frame.lines) {
    ctx.globalAlpha = Math.min(1, (line.a ?? 1) * ink.gain * boost);
    ctx.strokeStyle = ink.lut[Math.round(Math.min(1, Math.max(0, line.white)) * (LUT_SIZE - 1))];
    ctx.lineWidth = line.w;
    ctx.beginPath();
    ctx.moveTo(line.x1, line.y1);
    ctx.lineTo(line.x2, line.y2);
    ctx.stroke();
  }

  for (const list of buckets.values()) list.length = 0;
  for (const dot of frame.dots) {
    const alpha = Math.round(Math.min(1, (dot.a ?? 1) * ink.gain * boost) * (ALPHA_LEVELS - 1));
    if (alpha === 0) continue;
    const color = Math.round(Math.min(1, Math.max(0, dot.white)) * (LUT_SIZE - 1));
    const key = color * ALPHA_LEVELS + alpha;
    let list = buckets.get(key);
    if (!list) buckets.set(key, (list = []));
    list.push(dot.x, dot.y, dot.r);
  }
  for (const [key, list] of buckets) {
    if (!list.length) continue;
    ctx.globalAlpha = (key % ALPHA_LEVELS) / (ALPHA_LEVELS - 1);
    ctx.fillStyle = ink.lut[(key / ALPHA_LEVELS) | 0];
    ctx.beginPath();
    for (let i = 0; i < list.length; i += 3) {
      ctx.moveTo(list[i] + list[i + 2], list[i + 1]);
      ctx.arc(list[i], list[i + 1], list[i + 2], 0, TAU);
    }
    ctx.fill();
  }
  ctx.globalAlpha = 1;
}
