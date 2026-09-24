export type GlowPhase = "thinking" | "spoken";

/**
 * A restrained band of blue, violet, pink, and teal that rises from the
 * bottom edge and sweeps side to side while a thought is prepared, then
 * settles when the words appear. It is feedback only, never an input.
 */
export function VoiceGlow({ phase, leaving }: { phase: GlowPhase; leaving: boolean }) {
  return (
    <div className={`glow${leaving ? " is-leaving" : ""}`} data-phase={phase} aria-hidden="true">
      <i className="glow__blob glow__blob--blue" />
      <i className="glow__blob glow__blob--violet" />
      <i className="glow__blob glow__blob--pink" />
      <i className="glow__blob glow__blob--teal" />
    </div>
  );
}
