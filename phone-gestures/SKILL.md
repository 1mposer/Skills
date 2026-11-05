---
name: phone-gestures
description: Design and implement phone-app touch gestures and their feedback motion, Apple/iOS-first. Use when building, reviewing, or animating a long-press, press-and-hold, context menu, peek/preview, drag-to-reorder, edit/jiggle mode, swipe-to-delete, or any tap/hold/drag interaction on iPhone (SwiftUI/UIKit) or a mobile app generally. Also trigger on "gesture", "long press", "hold to", "haptic", "press state", "lift", "squish", "spring back", "context menu animation", "drag and drop on a grid", or "make this feel more native/Apple".
---

# phone-gestures

Gestures are a conversation with the thumb: **acknowledge the touch, announce the
threshold, and land the outcome.** Every gesture you build or review should have all three.
Default to Apple's conventions (HIG + system components) and only hand-roll when the
system component can't express the design.

## The long-press model: 3 phases

Design and review every long-press against these phases. A phase missing its feedback is a bug.

### 1. Press — feedback while holding
The user must *see* the hold is registering before anything activates.

| Pattern | What happens | Use when |
|---|---|---|
| **Lift** | Element rises with a growing shadow | The item will become draggable / float |
| **Press** | Subtle scale-down or squish under the thumb (~0.95–0.97) | Default for buttons, cards, cells |
| **Focus** | Background dims or blurs | A menu/preview is about to take over the screen |

### 2. Activate — threshold reached
One clear moment, paired with a haptic.

| Pattern | What happens | Use when |
|---|---|---|
| **Reveal** | Context menu fades or slides in | Secondary actions on an item |
| **Preview** | Thumbnail expands into a larger view (iOS context-menu preview) | Content worth peeking before opening |
| **Float** | Item detaches from the grid/list for dragging | Reorder or move |
| **Jiggle** | Items shake to signal edit mode | Bulk edit / rearrange (Home Screen style) |

### 3. Resolve — cancel or commit
The gesture must end somewhere physically believable.

| Pattern | What happens | Outcome |
|---|---|---|
| **Cancel** | Springs back and settles into its slot | Released early or dragged away |
| **Collapse** | Preview shrinks back into the source element | Menu/preview dismissed |
| **Commit** | Flies off-screen (delete) or drops into a new spot (move) | Action confirmed |

## Apple defaults (lean on these first)

- **Use the system component when it fits.** SwiftUI `.contextMenu { } preview: { }` /
  UIKit `UIContextMenuInteraction` gives you Press → Focus → Preview/Reveal → Collapse,
  the haptic, accessibility, and pointer support for free. Don't rebuild it.
- **Drag:** `.draggable` / `.dropDestination` (or `UIDragInteraction`) give Lift + Float +
  drop for free. For in-list reorder, `List` + `.onMove`.
- **Threshold:** the system long-press is ~0.5s (`LongPressGesture(minimumDuration: 0.5)`).
  Shorter feels accidental; longer feels broken. Custom holds (e.g. "hold to confirm") may run
  longer but must show progress.
- **Haptics:** fire once at Activate, never during Press. SwiftUI `.sensoryFeedback(...)`
  (iOS 17+) or `UIImpactFeedbackGenerator` — `.medium`/`.rigid` impact at activation,
  `.success`/`.warning` on commit, nothing on cancel.
- **Motion:** springs, not linear/ease curves. SwiftUI `.spring` / `.snappy` / `.bouncy`;
  Press uses a fast, non-bouncy response; Cancel and drop use a slight bounce so the item
  *settles*. All motion must be interruptible — a new touch mid-animation takes over from the
  current position, never snaps.
- **Track the finger 1:1** during drag; only spring once released.

## Checklist (build or review)

1. **Press:** Does the element react within a frame of touch-down? Is the feedback reversed
   immediately if the finger moves off / scrolls (don't fight scroll views)?
2. **Activate:** Exactly one threshold, one haptic, one visual change?
3. **Resolve:** Do *both* cancel and commit paths have a defined, animated ending? Does a
   destructive commit have undo or confirmation?
4. **Discoverability:** A long-press is hidden. Every action behind it must also be reachable
   another way (button, swipe action, menu) — HIG requirement.
5. **Accessibility:** VoiceOver exposes the actions (`.accessibilityAction`, context menus do
   this automatically); Reduce Motion swaps lift/fly/jiggle for fades or cross-dissolves;
   no action requires precise timing only.
6. **Conflicts:** Long-press vs. tap vs. scroll vs. swipe on the same view — state which wins
   (`.simultaneousGesture`, `.highPriorityGesture`, `exclusively(before:)`) and test it.

## Other platforms

When the target isn't iOS, keep the 3-phase model but map to native conventions
(Android: ripple + elevation lift, `HapticFeedbackConstants.LONG_PRESS`, Material motion).
Say explicitly where you diverge from the Apple pattern and why.

For exact HIG measurements and rules, load the `apple-hig` skill alongside this one.
