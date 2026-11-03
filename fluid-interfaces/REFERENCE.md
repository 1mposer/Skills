# Fluid Interfaces — formulas & code

## Rubber band (read from the UIKitCore binary)

```
offset = c·x·d / (d + c·x)        // = (1 − 1/(c·x/d + 1))·d
```
`x` = finger distance past the edge, `d` = viewport size on that axis, and `c` depends on the input: touch **0.55**, small trackpad 0.715, large trackpad 0.17, continuous mouse 0.4, Mac Catalyst 0.075. The curve is hyperbolic with a hard ceiling at `d`: content never travels more than one screen. At d = 844: 100 pt of drag moves 52 pt, 844 pt moves 300 pt, and 3000 pt moves 558 pt.

```swift
func rubberBand(_ x: CGFloat, dimension d: CGFloat, c: CGFloat = 0.55) -> CGFloat {
    let sign: CGFloat = x < 0 ? -1 : 1
    let a = abs(x)
    return sign * (c * a * d) / (d + c * a)
}
```

## Springs

Damped oscillator `m·x″ = −k(x − target) − b·x′`, with m = 1:
```
stiffness k = (2π / response)²
damping   b = dampingRatio · 4π / response        // critical = 2√k = 4π/response
dampingRatio = 1 − bounce                           // bounce ≥ 0, verified vs SwiftUI Spring
```
Check: response 0.5 gives k = 157.91, and ratio 1 / 0.85 / 0.7 gives b = 25.13 / 21.36 / 17.59, which is `.smooth` / `.snappy` / `.bouncy`.

Measured defaults: `.interactiveSpring()` is response 0.15, damping 0.85, blend 0.25. Bare `UISpringTimingParameters()` is m 3, k 1000, b 500 (overdamped, ~0.6 s). Bare `CASpringAnimation()` is m 1, k 100, b 10 (~1.47 s, too slow; always configure it).

```swift
extension UISpringTimingParameters {
    convenience init(damping: CGFloat, response: CGFloat, initialVelocity: CGVector = .zero) {
        let k = pow(2 * .pi / response, 2)
        let b = 4 * .pi * damping / response
        self.init(mass: 1, stiffness: k, damping: b, initialVelocity: initialVelocity)
    }
}
```

## Momentum projection

Scroll deceleration is exponential *per millisecond*: `v(t) = v₀·rate^t`. Use this, not `v²/2a`.
```swift
// v in pt/s; .normal = 0.998 (≈ v·0.5 s of travel), .fast = 0.99 (≈ v·0.1 s)
func project(_ v: CGFloat, rate: CGFloat = UIScrollView.DecelerationRate.normal.rawValue) -> CGFloat {
    (v / 1000) * rate / (1 - rate)
}
let landing = position + project(velocity)
let target  = snapPoints.min { abs($0 - landing) < abs($1 - landing) }!
```
In SwiftUI, `DragGesture.Value.predictedEndTranslation` / `predictedEndLocation` is the built-in projection.

## Velocity hand-off (UIKit)

`initialVelocity` is **relative**: fractions of the remaining distance per second.
```swift
func relativeVelocity(_ v: CGFloat, from current: CGFloat, to target: CGFloat) -> CGFloat {
    let distance = target - current
    return distance == 0 ? 0 : v / distance
}
let rv = CGVector(dx: relativeVelocity(v.x, from: c.x, to: t.x),
                  dy: relativeVelocity(v.y, from: c.y, to: t.y))
let params = UISpringTimingParameters(damping: 1, response: 0.4, initialVelocity: rv)
UIViewPropertyAnimator(duration: 0, timingParameters: params) // duration is ignored; the spring decides
```
Interruptible drawer (`UIViewPropertyAnimator`): on touch-down `pauseAnimation()` and record `fractionComplete`. During the drag, set `fractionComplete = start + translation/travel`. On release, `isReversed = (velocity points back)`, `rv = min(|v| / remaining, 30)` (the cap guards a near-zero remaining distance), then `continueAnimation(withTimingParameters: spring, durationFactor: springDuration / animator.duration)`.

## SwiftUI patterns

```swift
// Press: instant scale on touch-down; drag-off cancel comes for free
struct PressStyle: ButtonStyle {
    func makeBody(configuration: Configuration) -> some View {
        configuration.label
            .scaleEffect(configuration.isPressed ? 0.97 : 1)   // 0.95–0.97 is convention, not an Apple constant
            .animation(configuration.isPressed ? nil : .spring(duration: 0.3), value: configuration.isPressed)
    }
}

// Drag → projected snap, with the velocity carried into the release spring
.gesture(DragGesture()
    .onChanged { v in
        withAnimation(.interactiveSpring()) { offset = start + rubberBanded(v.translation.height) }
    }
    .onEnded { v in
        let target = nearest(to: start + v.predictedEndTranslation.height)
        withAnimation(.spring(duration: 0.3, bounce: 0.2)) { offset = target }  // retargets, keeps velocity
        start = target
    })
```
SwiftUI springs retarget by physics and keep velocity across interruptions. Driving the drag through `.interactiveSpring` makes the release spring inherit the gesture's motion. For explicit control, use `.interpolatingSpring(mass:stiffness:damping:initialVelocity:)` (relative velocity, as in UIKit) or `Spring.value(target:initialVelocity:time:)`.

## Sources
blog.justinbuilds.mov/ios · WWDC18 *Designing Fluid Interfaces* (803) · WWDC23 *Animate with springs* (10158) · Apple docs: SwiftUI `Spring`, `UISpringTimingParameters` · Holko 2014 (rubber-band and UIKit Dynamics) · github.com/nathangitter/fluid-interfaces (projection, hand-off and press code).
