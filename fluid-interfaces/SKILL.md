---
name: fluid-interfaces
description: Design and build iOS-native fluid motion — press feedback, taps, drags, swipes, flicks, snapping, rubber-banding, interruption, velocity hand-off — using Apple's real formulas and constants. Use when designing, implementing or reviewing gesture-driven or animated UI (SwiftUI/UIKit/Figma motion), or when an interaction feels laggy, floaty or janky.
---

# Fluid Interfaces

Motion is a conversation, not a playback. Formulas, constants and code: [REFERENCE.md](REFERENCE.md).

## Rules

1. **Respond on touch-down.** Feedback never waits for touch-up, a timer or a running animation. Don't put a double-tap recognizer on a single-tap target: it adds about 0.5 s of delay.
2. **Track 1:1.** Content follows the finger exactly and keeps the grab offset. Past an edge it rubber-bands (touch c = 0.55) and never hard-stops.
3. **Everything is interruptible.** On touch-down, stop the animation at its *presentation* value and give control back to the finger with no jump. Never block input during an animation.
4. **Preserve velocity, so use springs.** Release starts at the finger's velocity, and a retarget keeps the current velocity. Timed eases restart at zero speed and stall; use them only for non-interactive fades. Linear is for spinners only.
5. **Snap by projection.** On release, project the resting point from velocity (exponential decay, `rate` 0.998/ms) and spring to the valid target nearest *that point*, not nearest the release point.
6. **Spatial consistency.** Things leave the way they came, transitions grow from their source, and a small hint (a grow or bounce) previews what a firmer gesture does.
7. **Haptic at commitment.** Fire the haptic when the gesture crosses its decision point, not when the animation ends.

## Springs

Specify response (pace) and damping/bounce (character), never mass and stiffness. `bounce = 1 − dampingRatio`.

| Use | Spring |
|---|---|
| Default, tap-triggered | damping 1, response 0.3–0.5 |
| Brisk | bounce 0.15 (`.snappy`) |
| End of a thrown gesture (flick, swipe-dismiss) | damping ~0.8, response ~0.3 |
| Playful | bounce 0.3 (`.bouncy`), with **> 0.4 too much** |
| Live tracking | `.interactiveSpring()` |
| Rubber-band snap-back | damping ~0.6, response ~0.3 |

Bounce only when the user threw something, as in Music: tap-open at 100% damping, swipe-dismiss at ~80%. Heavy objects get a slower response and light ones a faster one; keep one family per app. Never gate logic on `settlingDuration`.

## Gestures

- **Press:** highlight or scale (~0.97) instantly. Release eases back slower: instant on, slow off. Dragging off cancels and dragging back re-engages. Pad small hit targets.
- **Drag start:** ~10 pt of hysteresis before committing to a drag or an axis. Run competing recognizers in parallel and cancel the losers once intent is clear.
- **During:** continuous per-frame feedback (`DragGesture`/pan, never `UISwipeGestureRecognizer`).
- **Release:** velocity comes from a short touch history. The commit/dismiss decision uses the projected endpoint plus the velocity sign, never a raw distance threshold.
- **Stop-and-hold:** detect it by a sharp velocity *drop* (≥90% lost, |v| < 100 pt/s), not a timer.
- **2D:** x, y, scale and rotation get independent springs, each with its own projection and velocity.

## Smells

Ease curves on interactive elements · input disabled mid-animation · action with no touch-down feedback · snapping by release position · animation restarting from the model value (a jump) · bounce on a tap transition · hard stop at an edge.
