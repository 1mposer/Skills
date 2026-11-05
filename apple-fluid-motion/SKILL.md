---
name: apple-fluid-motion
description: Make interfaces move the way Apple's do, so that scrolling, dragging, paging, pushing screens and presenting sheets feel natural and "at home" to the user. Gives the exact physics (rubber band, per-millisecond momentum, duration/bounce springs, velocity projection) with Apple's constants, plus recipes and a drop-in JS module. Use this whenever a design or prototype involves any touch or pointer gesture, scrolling, overscroll, swipe, flick, snapping, carousel, pager, navigation push/pop, swipe-back, bottom sheet, modal card, drag-to-dismiss, spring animation, "iOS feel", "native feel", or when someone says an animation feels stiff, laggy, floaty or wrong. Also use it when choosing between CSS easing and springs, or when asked for Framer Motion, react-spring or SwiftUI spring values that match iOS.
---

# Apple fluid motion

Apple's interfaces feel "at home" because of four rules, not because of any one animation. Every recipe is one of these rules applied to a specific gesture.

1. **The gesture is the animation.** While the finger is down, content tracks it one to one. When the finger lifts, a spring takes over from the finger's real velocity. Nothing ever starts from zero with a fixed duration.
2. **Everything is interruptible.** Touching a moving element grabs it where it is, keeping its position and velocity. No timers, no delays, no "wait for the animation to finish".
3. **Decide by projection.** Where the content *would* coast to decides what happens, not where it is now. A light flick that would carry past the midpoint turns the page.
4. **Bounce is earned.** Springs are critically damped by default. Overshoot appears only when the gesture carried momentum into the end state.

If an animation feels wrong, find the rule it breaks with the checklist at the end.

## Workflow

1. **Name the gesture.** What does the user physically do: scroll, flick, drag past an edge, swipe between pages, swipe from an edge, pull a card down?
2. **Pick the recipe.** Each row below maps a gesture to a recipe in `references/behaviours.md`. Read only the recipes you need.
3. **Implement with one shared spring.** On the web, copy `assets/fluid-motion.js` into the project. Every animation on the page should go through the same spring class so the whole UI has one character. On other platforms, map the numbers with "Platform mapping".
4. **Check the feel** against the checklist before calling it done.

## Quick reference

| Gesture | What moves | Key numbers |
|---|---|---|
| Overscroll (rubber band) | content past the edge | `offset = (1 − 1/(c·x/d + 1))·d`, c ≈ 0.55 on iOS, 0.35 to 0.40 feels better with a mouse. Return: spring ζ = 1, response 0.45 s |
| Flick (momentum) | content coasting | `v *= rate^dt_ms`, rate 0.998 normal, 0.99 fast. Landing = `x + v·rate/(1 − rate)`: about 0.5 px per px/s of release speed at the normal rate. Stop under 0.5 px |
| Any spring | anything | `k = (2π/duration)²`, `damping = 4π(1 − bounce)/duration` for bounce ≥ 0, mass 1. Default duration 0.5, bounce 0. Negative bounce and presets: `physics.md` §3 |
| Paging / snapping | carousel, cards, switch | project with the fast rate, snap to the nearest anchor to the *landing*, spring ζ = 1, 0.4 s, 10 pt hysteresis before a swipe counts |
| Push / pop | navigation stack | new `x = (1 − p)·W`, old `x = −0.3·p·W`, dim 12 %·p, spring ζ = 1, 0.35 s. Swipe back: `p = 1 − fingerX/W`, commit if projected x > W/2 |
| Sheet / card | modal from the bottom | base `scale = 1 − 0.07·p`, radius 12·p px, dim 40 %·p. Dismiss by projection past H/2. ζ = 0.8 if thrown (> 300 px/s), 1 otherwise |
| Edge-swipe recognition | any swipe | 10 pt of travel before the gesture is recognised, then re-anchor and keep the grab offset so nothing jumps |

`x` is finger travel, `d` the view height, `W` the width, `H` the sheet height, `p` progress 0 to 1, `v` velocity in px/ms unless stated, ζ the damping ratio (1 = no overshoot).

Full derivations, units and confidence levels are in `references/physics.md`. Read it when you need to convert to another library's parameters or when a number has to be defended.

## Platform mapping

- **Web, JavaScript.** Use `assets/fluid-motion.js`. Drive transforms with `translate3d` from a `requestAnimationFrame` loop owned by the spring. Use pointer events with `setPointerCapture` and `touch-action: none` on the gesture surface so the browser does not fight you for the scroll.
- **CSS.** `transition` and `animation` cannot take a runtime velocity and jerk when interrupted, so use CSS only for transitions the user does not drive by hand (a tap that opens a menu). Approximate a spring with `linear()` easing from a generator, never with `ease-in-out`.
- **Motion / Framer Motion.** `transition={{ type: "spring", visualDuration: 0.5, bounce: 0 }}` is Apple's `duration`/`bounce` model. Pass the gesture velocity through `onDragEnd` info; do not set `duration` on a spring.
- **react-spring.** `tension` is k and `friction` is the damping coefficient with mass 1, so `tension = (2π/duration)²`, `friction = 4π(1 − bounce)/duration`. Its named presets are not Apple-matched.
- **SwiftUI.** `.spring(duration: 0.5, bounce: 0)` is the native form; the preset names are in `physics.md` §3. Springs keep their current velocity automatically when retargeted, so a new `withAnimation` mid-flight is already continuous. For a release velocity, read `DragGesture.Value.velocity` (iOS 17+) and pass it as `initialVelocity` to `.interpolatingSpring(...)` or a `Spring`, converted to the animation's units (fraction of the remaining distance per second). `UIScrollView.DecelerationRate.normal` and `.fast` are the two momentum rates.

## Easy to forget

- **Carry the velocity in the right units.** The tracker gives px/ms. Springs here take px/s, so multiply by 1000. For a progress spring (0 to 1) divide by the travel distance as well.
- **Reduce motion.** When `prefers-reduced-motion` is set, replace travelling and zooming transitions with cross-fades, remove bounce and parallax, and keep direct manipulation (dragging still follows the finger). `Spring` removes overshoot automatically; cross-fades are the caller's job via `prefersReducedMotion()`.
- **No `alert`, no timers in gestures.** Any `setTimeout` between a touch and a visible response is latency the user feels.

## Checklist before shipping

- Rule 1: Does a release always use the finger's velocity? Is there any place a fixed-duration curve or `ease-in-out` starts from rest after a drag?
- Rule 2: Can I grab something mid-animation, including mid rubber-band return, and it continues from where it is, at the speed it was moving?
- Rule 3: Does a light flick that would coast past the midpoint commit the page, pop or dismiss? Do snaps use the landing, not the current position?
- Rule 4: Is bounce absent everywhere except where the gesture threw something?
- Is momentum decaying per millisecond (frame-rate independent), not per frame?
- Does the rubber band hold the finger with growing resistance and approach, but never pass, one screen height?
- Does reduced motion still let the user drag?

## Files

- `assets/fluid-motion.js`: drop-in `Spring` (with `onDone` at the perceptual duration and `onRest` at settle), `VelocityTracker`, `project`, `rubber`, `unrubber`, `rubberSlope`, `prefersReducedMotion`. Copy it into the project.
- `references/behaviours.md`: one recipe per gesture, with pseudocode for the gesture handlers and the release decision. Read the recipe that matches the gesture you are building.
- `references/physics.md`: formulas, units, derivations, presets, sources and how confident to be in each number. Read when converting parameters or when you need to justify a value.
