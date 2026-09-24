# Orbs

Every concept is a dotted blue sphere, but not the same one. `thinking-orbs` ships nine forms, and each concept wears the form whose motion says the most about it. The shared dots, size, and blue keep the network one family; the form is what lets you tell ideas apart at a glance and feel what they are.

## The nine forms

| Form | What it does | It suggests |
| --- | --- | --- |
| `working` | Particles on tilted orbits | Energy, heat, motion, orbits, restless things |
| `searching` | A meridian scans a dotted globe | Looking, retrieving, curiosity, surveying |
| `solving` | Bands scramble, then click back | Order restored, precision, fit, resolution |
| `listening` | A waveform rolls through rings | Sound, waves, attention, being heard |
| `connecting` | A constellation wires itself | Networks, transfer, circuits, relations |
| `weaving` | Three strands plait | Threads, bonds, heredity, tradition, interdependence |
| `composing` | An undulating multi-band sash | Flow, art, time, things fading or unfolding |
| `breathing` | A face-on ring slowly morphing | Cycles, calm, rhythm, life |
| `shaping` | Circle → triangle → square | Form, geometry, boundaries, change of shape |

## How each form is judged

1. **The motion is the metaphor.** Pick the form whose movement resembles the idea, not one that merely sounds related. Entropy is `working` because particles dispersing on orbits is what heat looks like. Mathematics is `shaping` because a circle becoming a square is geometry.
2. **Siblings never share a form.** Ideas that appear together must be told apart at a glance, so no two children of the same parent wear the same orb. (Nine forms can't cover a ring of ten, so the largest rings repeat exactly one.) `npm run check:content` warns on any repeat.
3. **Kinship comes from blue, not shape.** Branches share a voice, and a voice sets the blue, the speed, and the pitch of the tap sound. A family reads as a family through color and tempo, so its members are free to move differently.
4. **The entrances are all different.** The eight ideas around Entropy are the first thing anyone sees, so each gets its own form:

| Entrance | Form | Why |
| --- | --- | --- |
| Entropy (root) | `working` | Particles spreading on orbits: heat, motion, disorder in progress |
| Culture | `weaving` | Strands of story, ritual, and language plaited across generations |
| Humanity | `listening` | Attention to one another; the waveform of a voice |
| Nature | `breathing` | A ring that swells and settles: cycles, seasons, rest |
| Cosmos | `searching` | A scan sweeping a sphere: the sky observed, surveyed, questioned |
| Mathematics | `shaping` | Circle, triangle, square: pure form and symmetry |
| Silicon | `connecting` | A web wiring itself, with signals running the edges: a circuit |
| Computing | `composing` | A layered, shifting band: software built up in layers |
| Machines | `solving` | Parts clicking into place: constraint made into motion |

5. **A concept may echo its parent when nothing fits better,** but the default is to earn its own form. A few deliberate pairings recur: `listening` for anything wave-like (sound, redshift, pulsars, speech), `weaving` for heredity and bonds (DNA, love, trust), `composing` for time and fading (time, white dwarfs, death, grief), and `shaping` for boundaries and forms (boundaries, symbols, the Turing test).

## Motion, tone, and accessibility

Speed, dot strength, and breathing amplitude come from the concept's voice, not from its form, so a `working` orb in the `quiet` voice drifts more slowly than one in the `restless` voice. Only the center and its children animate at full rate; receded orbs hold a still frame. With reduced motion, every orb is a single still frame.

## Changing an orb

Edit the concept's `orb` field in its file under `content/concepts/`. The validator will tell you if it now repeats a sibling.
