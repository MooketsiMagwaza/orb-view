import type { OrbState } from "thinking-orbs";
import type { ConceptVoice } from "../concepts/types";
import type { Route } from "./route";

/**
 * Standalone guide pages: curated, hand-written pages (not concept cards with a depth dial) that live
 * outside the concept graph but still deserve a door on the library home. Each is shelved under one
 * faculty, alongside that faculty's departments.
 */
export type Guide = { id: string; facultyId: string; title: string; blurb: string; orb: OrbState; voice: ConceptVoice; route: Route };

export const guides: Guide[] = [
  { id: "debate-guide", facultyId: "humanities", title: "How to Argue Well", blurb: "Build a sound case, debate in good faith, and a field guide to every fallacy — with a quiz for spotting them live.", orb: "listening", voice: "lucid", route: { kind: "debate" } },
];
