# Physics reference

Units throughout: distance in px (points on iOS), time in seconds unless a formula says ms. Velocity from touch tracking is px/ms; springs take px/s. Confidence tags: **official** (Apple docs or WWDC talk), **derived** (math from official numbers), **community** (reverse-engineered, no Apple source), **tuned** (chosen by eye, adjust freely).

## 1. Rubber band (overscroll)

```
offset(x) = (1 − 1 / (c·x/d + 1)) · d
```

- `x` is how far the finger has pulled past the edge (raw travel, undamped).
- `d` is the size of the scroll view along the scroll axis (height for vertical).
- `c` is the stiffness. iOS uses about **0.55** (community). With a mouse on a desktop, **0.35 to 0.40** feels closer, because a mouse travels further than a thumb.
- As `x → ∞`, `offset → d`. The content can approach but never pass one screen height.

Inverse, needed to recover the raw pull while a spring drives `offset` directly (so a mid-spring grab does not jump):

```
x(offset) = (offset / (d − offset)) · d / c        (offset < d)
```

Derivative, used to convert a finger velocity into an offset velocity at release:

```
offset′(x) = c / (c·x/d + 1)²
```

**Return to the edge.** When the finger lifts while overscrolled, or when momentum runs into the edge, a critically damped spring carries `offset` to 0. Response about **0.45 s**, ζ = 1 (community, consistent with UIKit's 0.4 to 0.6 s settle). Initial velocity: the finger's velocity through the band's slope if the finger was moving, the full coasting velocity if momentum hit the edge, zero if the finger was holding still. The spring may overshoot briefly from a large initial velocity; it never overshoots on its own.

## 2. Momentum (deceleration)

Apple decays velocity per **millisecond**, not per frame (community, consistent with Apple's projection code in WWDC18 session 803):

```
v(t)  = v₀ · rate^t                    t in ms, v in px/ms
x(t)  = x₀ + v₀ · (rate^t − 1) / ln(rate)
X_end = x₀ − v₀ / ln(rate)             exact resting point (derived)
```

Apple's projection function is the first-order form (official talk, formula reconstructed):

```
project(v, rate) = v · rate / (1 − rate)      v in px/ms → px
```

| rate | name | `rate/(1−rate)` | 2000 px/s flick travels |
|---|---|---|---|
| 0.998 | `UIScrollView.DecelerationRate.normal` | 499 | ≈ 1000 px |
| 0.99  | `UIScrollView.DecelerationRate.fast`   | 99  | ≈ 200 px |

Rule of thumb: at the normal rate a flick coasts about **0.5 px per px/s** of release speed (499 px per px/ms).

Frame-rate independent per-frame form:

```js
v *= Math.pow(rate, dtMs);
x += v * dtMs;
```

Stop when the remaining distance `|project(v, rate)|` is under **0.5 px** (community). Use the fast rate for paging and snapping contexts. Normal rate elsewhere.

## 3. Springs

Apple's modern parametrisation (WWDC23 session 10158, official) uses a perceptual `duration` and a `bounce` from −1 to 1 (exclusive). The talk warns against bounce above about 0.4.

```
mass    = 1
k       = (2π / duration)²
damping = 4π · (1 − bounce) / duration           bounce ≥ 0     ζ = 1 − bounce
damping = 4π / (duration · (1 + bounce))         bounce < 0     ζ = 1 / (1 + bounce)   (overdamped)
```

The bounce ≥ 0 branch is derived and checked against a published run of SwiftUI's values (duration 1, bounce 0 gives damping 4π ≈ 12.566). The bounce < 0 branch is community: it is continuous at 0 and diverges to infinite damping as bounce → −1, which matches SwiftUI's behaviour of slower, creeping settles for negative bounce.

Equation of motion, integrate with semi-implicit Euler at a fixed 1/240 s sub-step, or use the closed form:

```
a = −k · (x − target) − damping · v
v += a · dt
x += v · dt
```

Rest when `|x − target| < 0.05 px` and `|v| < 1 px/s`. Scale both thresholds down for a 0 to 1 progress spring.

**Presets** (this table is the single source; other files point here):

| preset | SwiftUI | duration | bounce | use |
|---|---|---|---|---|
| smooth (default) | `.smooth` | 0.5 | 0 | everything that was not thrown |
| snappy | `.snappy` | 0.5 | 0.15 | small UI responses |
| bouncy | `.bouncy` | 0.5 | 0.3 | playful, use sparingly |
| interactive | `.interactiveSpring()` | 0.15 | 0.14 | while the finger is down, lazy follow |

Preset values are from memory of SwiftUI's presets, not from the talk (tuned). Legacy API `.spring(response:dampingFraction:)` maps as `k = (2π/response)²`, `damping = 4π·ζ/response`, which is the same model with `response = duration` and `ζ = 1 − bounce`. Legacy default was response 0.55, dampingFraction 0.825 (tuned).

Key properties (official):
- `duration` is perceptual. SwiftUI's completion handlers default to firing when the animation is *logically* complete, around the perceptual duration, not when it physically settles. Chain follow-up work there. `fluid-motion.js` exposes both: `onDone` (perceptual duration) and `onRest` (settle).
- Springs accept an initial velocity. Pass the gesture velocity at release. Retargeting mid-flight keeps the current velocity. Ease curves cannot do either, which is why they jerk when interrupted.

## 4. Velocity projection and snapping

```
landing = x + project(v, rate)
target  = nearest(anchors, clamp(landing, min, max))
```

Then a spring from the current position to `target` with initial velocity `v·1000` px/s. Snap to the anchor nearest the *landing*, not the current position (WWDC18, official). Paging uses the fast rate (community).

**Commit decisions** (pop, dismiss, page) follow the same pattern: compute the projected position, compare with the midpoint. Progress-space velocity for a spring on `p ∈ [0,1]` is `−v·1000 / travel` where `travel` is W or H.

## 5. Gesture recognition

- **Hysteresis**: about **10 pt** of movement before a swipe is recognised (WWDC18, official). Re-anchor the start at the recognition point so content does not jump.
- **Grab offset**: keep the finger-to-element offset for the entire drag.
- **Velocity**: least-squares slope over the last ~100 ms of touch samples (endpoint differences are noisy). If the last sample is older than 100 ms the finger paused, so velocity is 0.
- **Pause detection**: a spike in deceleration, not a timer on low velocity (WWDC18).
- **Parallel recognition**: do not wait for one gesture to fail before another can start. Avoid the ~0.5 s double-tap delay.

## 6. Transitions (community and tuned, no official numbers)

- **Push / pop**: new page `x = (1 − p)·W`, old page `x = −0.3·p·W` under a black dim at about 12 % · p. Spring ζ = 1, about 0.35 s. Nav title cross-fades.
- **Interactive pop**: `p = 1 − fingerX / W` while dragging, nothing animates. On release commit if `fingerX + project(v, 0.998) > W/2`.
- **Sheet**: presenting view scales to about **0.93** (`1 − 0.07·p`), gains ~12 px corners and a ~40 % dim. Sheet is draggable; dismiss by projection past half its height. Damping ratio 0.8 when thrown, 1 when released slowly (the WWDC18 "80 % damping on swipe-to-dismiss" example).
- **Zoom (iOS 18)**: a FLIP transform from the source thumbnail rect to the full rect driven by a spring, reversed on dismiss.
- **Cross-dissolve**: 0.25 to 0.35 s. The right fallback under reduced motion.
- **Durations**: UIKit default 0.25 s, transitions ~0.35 s, SwiftUI default spring 0.5 s perceptual.

## Sources

- WWDC 2018, session 803, Designing Fluid Interfaces: https://developer.apple.com/videos/play/wwdc2018/803/
- WWDC 2023, session 10158, Animate with springs: https://developer.apple.com/videos/play/wwdc2023/10158/
- How UIScrollView works (community): https://teletype.in/@swift-discipline/how-uiscrollview-works
- Dart check of SwiftUI spring values: https://dart.googlesource.com/monorepo//+/28c67afbb634bff93acece51805bdfd8e0dc2ef5
- CSS `linear()` easing: https://developer.chrome.com/docs/css-ui/css-linear-easing-function
- Motion spring model: https://motion.dev/docs/ai-generate-css-springs-and-easings-llm
