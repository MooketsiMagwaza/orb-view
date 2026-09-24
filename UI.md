# UI direction

## Overall character

The interface should feel quiet, precise, and tactile in the spirit of Apple’s product UI, without copying a specific Apple screen.

- White background with generous empty space
- Blue as the primary identity color
- Fine, soft connection lines
- Minimal chrome and almost no permanent panels
- Crisp typography and gentle depth
- Motion used to explain relationships

## Canvas view

The canvas fills the viewport edge to edge. It has no visible grid, cards, toolbars, or window-like panels.

```text
          ○ Culture
             ╲
  ○ Nature ─ ● Entropy ─ ○ Silicon
             ╱       ╲
      ○ Humanity      ○ Machines
```

The layout is loosely hexagonal at the starting depth, but it should feel organic rather than geometrically locked. As the user explores, the network can spread beyond the viewport.

Each node contains:

- the animated orb in the concept's own form;
- a short label below it;
- a generous invisible touch target;
- a soft connection point for the linking lines.

## Orb forms

Every node is a dotted blue orb drawn from `thinking-orbs`, and each concept wears one of its nine forms: working, searching, solving, listening, connecting, weaving, composing, breathing, or shaping. The form is chosen for what its motion says about the idea; see [ORBS.md](ORBS.md).

- A concept keeps the same form everywhere it appears.
- Siblings never share a form, so a ring of ideas is easy to tell apart.
- Kinship is shown by blue, speed, and strength, which come from the concept's voice, not by shape.
- All forms share the same dots, size, and palette so the canvas stays one calm family.

Beyond the form, concepts also differ in:

- blue tone, from pale cyan to deep cobalt;
- movement speed;
- breathing amplitude;
- label wording;
- the voice of the focused explanation.

## Focus view

Pressing and holding creates a focused composition:

```text
            [faded network]


                 ◉
              ENTROPY

      Energy spreads. Order is something
       the universe can make locally,
        but never maintain for free.


          ~ colored thinking glow ~
```

The orb is the visual center. Text sits below it in a narrow, readable column. The background network is only a faint reminder of place.

Do not show:

- a chat bubble;
- an input field;
- a “choose a path” heading;
- earlier explanations;
- a sidebar of visited concepts;
- large buttons competing with the orb.

## Sheets and paths

Two quiet overlays sit above the canvas. Neither is permanent chrome.

- **Info sheet.** A bottom sheet (a centered card on wide screens) opened from a small chevron control that mirrors the back control while an explanation is held. It shows the Wikipedia article, images with credits, and every connected idea as tappable chips. It closes on the scrim, its close control, or Escape.
- **Paths.** A pill in the top-left opens a grouped list of learning paths. Each row has a still orb glyph, a one-line blurb, and its step count; opening a row shows a cover image and the ordered steps. While a path is active, a slim strip at the bottom shows where you are and offers *Next*.

Both keep to the same tokens, generous whitespace, and calm motion, and honor reduced motion by dropping their entrance animations.

## Type

Use the native system font stack. On Apple platforms this naturally produces San Francisco; other platforms should use their own high-quality UI font.

- Labels: compact, medium weight
- Focused concept name: small uppercase or restrained title case
- Explanation: 18–22 px on mobile with comfortable line height
- Utility controls: icon-first with accessible text labels

## Color

Suggested starting tokens:

```css
:root {
  --canvas: #ffffff;
  --ink: #10213b;
  --muted-ink: #6f7f95;
  --line: rgba(65, 126, 208, 0.18);
  --orb-light: #8ed8ff;
  --orb-mid: #378cf6;
  --orb-deep: #1454bd;
  --focus-shadow: rgba(45, 126, 240, 0.24);
}
```

The blue family should remain readable against white and must not rely on color alone to communicate interaction state.

## Mobile first

- Minimum node touch target: 48 × 48 px
- Respect top and bottom safe areas
- Keep focused text within roughly 32 px side margins
- Place the back control within thumb reach without turning it into a toolbar
- Prevent browser scrolling while the canvas is being dragged
- Keep primary actions available through touch alone; hover is enhancement only

Desktop adds pointer hover, wheel zoom, Escape to exit focus, and a larger canvas. It should not introduce a different information architecture.

