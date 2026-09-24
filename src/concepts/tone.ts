import type { ConceptTone, ConceptVoice } from "./types";

/**
 * Voices share one blue family. What changes is the exact blue, how fast an orb moves, and how strongly
 * its dots are inked. The orb *form* is chosen separately, per concept (see ORBS.md).
 */
const VOICES: Record<ConceptVoice, { h: number; s: number; l: number; speed: number; intensity: number }> = {
  restless: { h: 216, s: 0.88, l: 0.55, speed: 1.3, intensity: 0.95 },
  precise: { h: 219, s: 0.82, l: 0.42, speed: 1.0, intensity: 1.0 },
  layered: { h: 227, s: 0.76, l: 0.56, speed: 0.85, intensity: 0.8 },
  human: { h: 211, s: 0.9, l: 0.58, speed: 0.95, intensity: 0.85 },
  quiet: { h: 197, s: 0.78, l: 0.58, speed: 0.55, intensity: 0.6 },
  mechanical: { h: 222, s: 0.85, l: 0.38, speed: 1.15, intensity: 1.0 },
  vast: { h: 205, s: 0.72, l: 0.46, speed: 0.5, intensity: 0.7 },
  lucid: { h: 213, s: 0.86, l: 0.5, speed: 1.05, intensity: 0.9 },
};

function hash(text: string): number {
  let h = 2166136261;
  for (let i = 0; i < text.length; i++) h = Math.imul(h ^ text.charCodeAt(i), 16777619);
  return ((h >>> 0) % 10000) / 10000;
}

function hslToHex(h: number, s: number, l: number): string {
  const a = s * Math.min(l, 1 - l);
  const channel = (n: number) => {
    const k = (n + h / 30) % 12;
    const value = l - a * Math.max(-1, Math.min(k - 3, 9 - k, 1));
    return Math.round(value * 255).toString(16).padStart(2, "0");
  };
  return `#${channel(0)}${channel(8)}${channel(4)}`;
}

/** Small, deterministic variations keep each thought distinct inside one blue family. */
export function toneFor(voice: ConceptVoice, id: string): ConceptTone {
  const base = VOICES[voice];
  const jitter = (salt: string) => hash(id + salt) - 0.5;
  return {
    voice,
    blue: hslToHex(base.h + jitter("h") * 10, base.s, Math.min(0.66, Math.max(0.34, base.l + jitter("l") * 0.08))),
    speed: +(base.speed * (1 + jitter("s") * 0.24)).toFixed(3),
    intensity: +Math.min(1, Math.max(0.4, base.intensity + jitter("i") * 0.16)).toFixed(3),
  };
}
