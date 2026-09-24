import { useEffect, useRef } from "react";
import type { OrbState } from "thinking-orbs";
import { drawOrb, inkFor, orbSpec } from "../graph/orb-paint";
import { toneFor } from "../concepts/tone";
import type { ConceptVoice } from "../concepts/types";

/** A small, still picture of an orb form in a group's blue. Painted once; nothing animates. */
export function OrbGlyph({ state, voice, seed, size = 44 }: { state: OrbState; voice: ConceptVoice; seed: string; size?: number }) {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    canvas.width = canvas.height = Math.round(size * dpr);
    drawOrb(ctx, canvas.width, orbSpec(state), inkFor(toneFor(voice, seed)), 0.6, 1.1);
  }, [state, voice, seed, size]);

  return <canvas ref={ref} className="glyph" style={{ width: size, height: size }} aria-hidden="true" />;
}
