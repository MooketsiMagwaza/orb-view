import { useEffect, useState, type CSSProperties } from "react";
import type { ConceptNode, ConceptVoice } from "../concepts/types";
import { VoiceGlow, type GlowPhase } from "./VoiceGlow";

/** How long the glow sweeps before the words arrive. */
const THINK_MS = 1350;
const THINK_MS_REDUCED = 300;

/** Voices differ in rhythm, never in orb geometry: how quickly words settle onto the page. */
const WORD_DELAY_MS: Record<ConceptVoice, number> = {
  restless: 22,
  precise: 30,
  layered: 36,
  human: 32,
  quiet: 48,
  mechanical: 26,
  vast: 54,
  lucid: 24,
};

type Props = {
  concept: ConceptNode;
  reducedMotion: boolean;
  /** The hold has ended; fade out while the network returns. */
  leaving: boolean;
  /** Screen distance from the viewport center to just below the focused orb. */
  orbRadius: number;
};

/**
 * The centered thought: the concept name and a short piece of writing beneath
 * the orb. There is no bubble, sender, timestamp, composer, or history.
 */
export function FocusView({ concept, reducedMotion, leaving, orbRadius }: Props) {
  const [phase, setPhase] = useState<GlowPhase>("thinking");

  useEffect(() => {
    setPhase("thinking");
    const timer = window.setTimeout(() => setPhase("spoken"), reducedMotion ? THINK_MS_REDUCED : THINK_MS);
    return () => window.clearTimeout(timer);
  }, [concept.id, reducedMotion]);

  const words = concept.summary.split(/\s+/);
  const stepMs = reducedMotion ? 0 : WORD_DELAY_MS[concept.tone.voice];
  const style = { "--orb-r": `${orbRadius}px` } as CSSProperties;

  return (
    <>
      <VoiceGlow phase={phase} leaving={leaving} />
      <section className={`focus${leaving ? " is-leaving" : ""}`} style={style} aria-label={concept.title} data-voice={concept.tone.voice}>
        <div className="focus__stack">
          <h2 className="focus__title">{concept.title}</h2>
          <div aria-live="polite">
            {phase === "spoken" && (
              <p className="focus__text">
                {words.map((word, index) => (
                  <span key={index} className="focus__word" style={{ animationDelay: `${Math.min(index * stepMs, 1500)}ms` }}>
                    {word}{" "}
                  </span>
                ))}
              </p>
            )}
          </div>
        </div>
      </section>
    </>
  );
}
