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
  { id: "study-japan-guide", facultyId: "me", title: "Studying in Japan: the Guide", blurb: "MEXT scholarship categories, prerequisites, the embassy vs. university routes, Botswana-specific notes, and how the application year unfolds. The journey itself is mapped as a deck alongside this.", orb: "searching", voice: "layered", route: { kind: "study-japan" } },
];
