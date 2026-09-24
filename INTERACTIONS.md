# Interactions

## Interaction grammar

Orb View has two primary actions:

| Gesture | Meaning | Result |
| --- | --- | --- |
| Tap | Continue exploring | The tapped concept becomes the local center and its connected child nodes unfold. |
| Press and hold | Pause and understand | The orb moves to frame center, the network fades, and an explanation appears below it. |

This distinction must remain consistent at every depth.

## Tap to go deeper

1. The tapped orb brightens and contracts slightly.
2. A short, soft blip plays.
3. The canvas shifts so the orb becomes the local anchor.
4. Existing unrelated nodes drift outward and fade to low opacity.
5. Child nodes emerge from the selected orb along animated connection lines.
6. The breadcrumb state updates invisibly; a back gesture or control can restore the previous depth.

The transition should feel like traveling through one continuous network, not loading another screen.

Suggested duration: 450–700 ms, with spring-like easing and no hard cuts.

## Press and hold to focus

Holding begins after roughly 450 ms so an ordinary tap does not trigger it accidentally.

1. A progress ring or subtle blue halo grows around the pressed orb.
2. A light haptic pulse confirms the hold on supported devices.
3. The orb glides to the exact center of the viewport.
4. Other nodes and lines fade almost completely but remain faintly present.
5. The orb continues its searching motion at a calmer pace.
6. A voice-like glow rises from the bottom and sweeps gently side to side.
7. A short explanation fades in beneath the orb.

The explanation is not a chat message. It has no bubble, sender label, timestamp, composer, or conversation history.

## Leaving focus

The user can leave focus by:

- tapping the quiet background;
- swiping from the screen edge;
- using a small back control;
- pressing Escape in the desktop app.

The orb should return to its remembered canvas position and the surrounding network should regain its previous opacity.

## More information

The short note is the whole experience for most visits. Depth is one deliberate step away.

1. While an explanation is held, a small chevron appears opposite the back control, after the text has settled.
2. Tapping it lifts an **info sheet** over the network. It shows the Wikipedia article for the concept, images with credits, and, where they apply, NASA images or public-domain artworks from The Met.
3. Below the sources, **connected ideas** are listed as chips: where the idea comes from, what it leads to, and everything it echoes elsewhere in the network. Tapping a chip closes the sheet and the held explanation and travels there.
4. Nothing is requested until the sheet opens. Escape or a tap on the dimmed background closes it and returns to the held explanation; a second Escape returns to the network.

See [SOURCES.md](SOURCES.md) for what is fetched, cached, and credited.

## Paths

A path is a short, ordered trail through the network for learning one idea at a time.

- The **Paths** pill in the top-left opens a grouped list. Opening a row shows a cover image and the steps, and *Begin this path* travels to its first idea.
- While a path is active, a slim strip along the bottom shows the path name, the step count, and the next idea. Its arrows step forward and back, and its close control leaves the path.
- The path never locks anything. You can tap, hold, and wander freely; if you land on another step of the path, the strip updates to match.
- Travel by path follows each idea's natural trail, so the back control retraces the tree rather than the path.

## Canvas movement

- Drag one finger or the pointer to pan.
- Pinch or use the wheel to zoom.
- Clamp zoom to a comfortable range so labels remain usable.
- Preserve the canvas position when focus mode opens and closes.
- Only the local group is drawn at full life: the center animates every frame, its children every other frame, the trail more slowly, and receded orbs hold a still frame. This keeps the canvas smooth however large the network grows.
- Give nodes a small amount of autonomous drift without allowing collisions or tangled labels.
- Do not snap nodes to a visible grid.

## Sound

The sound is a tiny interface blip, synthesized locally with the Web Audio API.

- Tap: short, clear note.
- Hold confirmed: slightly warmer or lower note.
- New child nodes: optional quiet staggered ticks, used sparingly.

Sound should respect mute settings and never be required to understand state.

## Voice-like glow

The glow is visual feedback, not an input field.

- It begins near the bottom safe area.
- Blue, violet, pink, and teal blur into one restrained band.
- It rises with the start of the explanation.
- It sweeps side to side while the thought is being prepared.
- It settles and fades when the text appears.

## Motion accessibility

When reduced motion is enabled:

- replace travel animations with short fades;
- stop continuous orb drift;
- show the hold halo without expansion;
- replace the sweeping glow with a static gradient;
- keep the same tap and hold meaning.

