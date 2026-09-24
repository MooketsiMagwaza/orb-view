import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { ConceptVoice } from "../concepts/types";

const MUTE_KEY = "orb-view:muted";

/** Each voice gets its own pitch so the network has a quiet tonal identity. */
const PITCH: Record<ConceptVoice, number> = {
  restless: 784,
  precise: 880,
  layered: 698,
  human: 659,
  quiet: 587,
  mechanical: 740,
  vast: 523,
  lucid: 932,
};

function readMuted(): boolean {
  try {
    return window.localStorage.getItem(MUTE_KEY) === "1";
  } catch {
    return false;
  }
}

type BlipOptions = { type: OscillatorType; from: number; to: number; attack: number; length: number; gain: number; delay?: number };

export type InteractionSound = {
  muted: boolean;
  toggleMuted: () => void;
  /** Short, clear note when a concept is explored. */
  tap: (voice: ConceptVoice, depth: number) => void;
  /** Slightly warmer, lower note when a hold is confirmed. */
  hold: (voice: ConceptVoice) => void;
  /** Very quiet staggered ticks as new children emerge. */
  tick: (voice: ConceptVoice, index: number) => void;
};

/** Sounds are synthesized locally with the Web Audio API; nothing is bundled or required to understand state. */
export function useInteractionSound(): InteractionSound {
  const [muted, setMuted] = useState(readMuted);
  const mutedRef = useRef(muted);
  const audioRef = useRef<AudioContext | null>(null);

  useEffect(() => {
    mutedRef.current = muted;
    try {
      window.localStorage.setItem(MUTE_KEY, muted ? "1" : "0");
    } catch {
      /* storage may be unavailable; the setting simply won't persist */
    }
  }, [muted]);

  useEffect(() => () => void audioRef.current?.close().catch(() => undefined), []);

  const blip = useCallback((options: BlipOptions) => {
    if (mutedRef.current) return;
    const Ctor = window.AudioContext ?? (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctor) return;
    const audio = (audioRef.current ??= new Ctor());
    if (audio.state === "suspended") void audio.resume().catch(() => undefined);

    const start = audio.currentTime + (options.delay ?? 0);
    const oscillator = audio.createOscillator();
    const gain = audio.createGain();
    oscillator.type = options.type;
    oscillator.frequency.setValueAtTime(options.from, start);
    oscillator.frequency.exponentialRampToValueAtTime(options.to, start + options.length);
    gain.gain.setValueAtTime(0.0001, start);
    gain.gain.exponentialRampToValueAtTime(options.gain, start + options.attack);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + options.length);
    oscillator.connect(gain);
    gain.connect(audio.destination);
    oscillator.start(start);
    oscillator.stop(start + options.length + 0.02);
  }, []);

  const tap = useCallback((voice: ConceptVoice, depth: number) => {
    const pitch = PITCH[voice] * (1 + Math.min(depth, 6) * 0.02);
    blip({ type: "sine", from: pitch, to: pitch / 2, attack: 0.012, length: 0.16, gain: 0.055 });
  }, [blip]);

  const hold = useCallback((voice: ConceptVoice) => {
    const pitch = PITCH[voice] * 0.62;
    blip({ type: "triangle", from: pitch, to: pitch * 0.72, attack: 0.03, length: 0.34, gain: 0.05 });
  }, [blip]);

  const tick = useCallback((voice: ConceptVoice, index: number) => {
    const pitch = PITCH[voice] * 1.5 * (1 + index * 0.06);
    blip({ type: "sine", from: pitch, to: pitch * 0.9, attack: 0.006, length: 0.07, gain: 0.014, delay: 0.09 + index * 0.06 });
  }, [blip]);

  const toggleMuted = useCallback(() => setMuted((value) => !value), []);

  return useMemo(() => ({ muted, toggleMuted, tap, hold, tick }), [muted, toggleMuted, tap, hold, tick]);
}
