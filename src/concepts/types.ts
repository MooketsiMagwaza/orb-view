import type { OrbState } from "thinking-orbs";

export type ConceptVoice = "restless" | "precise" | "layered" | "human" | "quiet" | "mechanical" | "vast" | "lucid";

export type ConceptTone = {
  /** Mid-tone blue of the orb, from pale cyan to deep cobalt. */
  blue: string;
  /** Multiplier on the orb's animation clock. */
  speed: number;
  /** 0–1: dot ink strength, breathing amplitude, and glow weight. */
  intensity: number;
  voice: ConceptVoice;
};

export type ConceptSafety = "general" | "sensitive";

/** Where more information about a concept can be pulled from. Each value is that provider's own query. */
export type ConceptSources = {
  /** An exact English Wikipedia article title. */
  wikipedia?: string;
  /** A search phrase for the NASA Image and Video Library. */
  nasa?: string;
  /** A search phrase for The Met's open-access (public domain) collection. */
  met?: string;
};

export type ConceptNode = {
  id: string;
  title: string;
  /** The short explanation shown when the orb is held. */
  summary: string;
  /** Multiple parents let the content behave like a network instead of a strict tree. */
  parentIds: string[];
  /** Symmetric cross-links between branches. */
  relatedIds: string[];
  tone: ConceptTone;
  /**
   * Which of the nine thinking-orbs forms this concept wears. Chosen for what the motion says about the idea
   * (see ORBS.md); siblings avoid sharing a form so a ring of ideas stays easy to tell apart.
   */
  orb: OrbState;
  sources: ConceptSources;
  safety?: ConceptSafety;
  /**
   * Second-layer children stay hidden until their (already centered) parent is tapped again.
   * Layer-2 nodes must have exactly one parent.
   */
  layer?: 1 | 2;
};
