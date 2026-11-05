# Behaviour recipes

Each recipe assumes `assets/fluid-motion.js` is loaded (`Spring`, `VelocityTracker`, `project`, `rubber`, `unrubber`, `rubberSlope`, `prefersReducedMotion`). Pseudocode is JavaScript with pointer events. The same structure applies on any platform: track the finger one to one, decide by projection on release, hand the velocity to a spring. Numbers and presets are defined in `physics.md`; recipes only use them.

Contents
1. Scroll with rubber band and momentum
2. Reusable spring (retarget, drag and fling)
3. Snapping pager
4. Push and pop with interactive swipe-back
5. Bottom sheet with drag to dismiss
6. Lazy follow while dragging

## 1. Scroll with rubber band and momentum

State: `virt` is a virtual scroll position. Inside `[0, max]` it is plain scrolling; outside, the excess is the raw pull `over`. While the return spring runs it drives the visible offset directly, and `applyOffset` keeps `over` in sync through `unrubber`, so a grab mid-spring picks the content up exactly where it is.

```js
const spring = new Spring(o => applyOffset(o), () => { virt = edge; applyVirt(); }).zeta(0.45, 1);
const vt = new VelocityTracker();
let virt = 0, scrollY = 0, over = 0, max, d, edge = 0, c = 0.55, raf = 0;
let startY, startVirt;

const bandOf = o => Math.sign(o) * rubber(Math.abs(o), d, c);           // raw pull → visible offset
const pullOf = o => Math.sign(o) * unrubber(Math.min(Math.abs(o), 0.999 * d), d, c);

function render(y, offset) { content.style.transform = `translate3d(0, ${-y + offset}px, 0)`; }
function applyVirt() {
  if (virt < 0)        { scrollY = 0;    over = -virt; }
  else if (virt > max) { scrollY = max;  over = max - virt; }
  else                 { scrollY = virt; over = 0; }
  render(scrollY, bandOf(over));
}
function applyOffset(offset) {                    // spring drives the visible offset directly
  scrollY = edge; over = pullOf(offset);          // keep raw state current for a mid-spring grab
  render(edge, offset);
}
function stopMomentum() { cancelAnimationFrame(raf); raf = 0; }
function springHome(whichEdge, velPxS) {          // velPxS positive = content moving down
  stopMomentum(); edge = whichEdge;
  spring.value = bandOf(over); spring.to(0, velPxS);
}

surface.onpointerdown = e => {
  stopMomentum(); spring.stop(); virt = scrollY - over;   // grab it wherever it is, band included
  surface.setPointerCapture(e.pointerId);
  startY = e.clientY; startVirt = virt; vt.reset(e.clientY);
};
surface.onpointermove = e => {
  virt = startVirt - (e.clientY - startY);               // raw travel, the formula does the damping
  applyVirt(); vt.push(e.clientY);
};
surface.onpointerup = () => {
  const vMs = -vt.get();                                  // + = scrolling down
  if (over !== 0) return springHome(virt < 0 ? 0 : max, -vMs * 1000 * rubberSlope(Math.abs(over), d, c));
  if (Math.abs(vMs) > 0.05) momentum(vMs);
};

function momentum(vMs, rate = 0.998) {
  let last = performance.now();
  const step = t => {
    const dt = Math.min(64, t - last); last = t;
    virt += vMs * dt; vMs *= Math.pow(rate, dt);
    if (virt < 0 || virt > max) {                         // hit an edge: the spring takes the velocity
      const e = virt < 0 ? 0 : max; virt = e; applyVirt();
      return springHome(e, -vMs * 1000);
    }
    applyVirt();
    if (Math.abs(project(vMs, rate)) < 0.5) { raf = 0; return; }   // under half a pixel left
    raf = requestAnimationFrame(step);
  };
  raf = requestAnimationFrame(step);
}
```

Landing indicator: if the design shows where a flick will stop, compute it once on release with `clamp(virt + project(vMs, rate), 0, max)`.

Wheel input: add `deltaY` to `virt` (halve it past the edge, wheel steps are coarse), and spring home 90 ms after the last wheel event if overscrolled.

## 2. Reusable spring (retarget, drag and fling)

One `Spring` per axis. Tap retargets mid-flight and the velocity carries. Drag moves the element one to one and release flings it at the target with the finger's velocity. Swap `.apple(...)` for any preset in `physics.md` §3.

```js
const sx = new Spring(v => { x = v; draw(); }).apple(0.5, 0);
const sy = new Spring(v => { y = v; draw(); }).apple(0.5, 0);

stage.onpointerdown = e => {
  if (e.target === ball) {                          // start a drag
    sx.stop(); sy.stop(); grab = [px - x, py - y]; vtx.reset(px); vty.reset(py); dragging = true;
  } else {                                          // retarget
    sx.to(px); sy.to(py);
  }
};
stage.onpointermove = e => { if (!dragging) return; x = sx.value = px - grab[0]; y = sy.value = py - grab[1]; draw(); vtx.push(px); vty.push(py); };
stage.onpointerup   = () => { dragging = false; sx.to(sx.target, vtx.get() * 1000); sy.to(sy.target, vty.get() * 1000); };
```

## 3. Snapping pager

Anchors at `i · step`. Hysteresis of 10 pt, then re-anchor. Project with the fast rate and snap to the anchor nearest the landing.

```js
const spring = new Spring(v => { pos = v; drawTrack(); }).zeta(0.4, 1);

pager.onpointerdown = e => { spring.stop(); recognised = false; startX = e.clientX; startPos = pos; vt.reset(e.clientX); };
pager.onpointermove = e => {
  const dx = e.clientX - startX;
  if (!recognised) { if (Math.abs(dx) < 10) return; recognised = true; startX = e.clientX; return; }
  pos = spring.value = startPos - (e.clientX - startX); drawTrack(); vt.push(e.clientX);
};
pager.onpointerup = () => {
  if (!recognised) return spring.to(spring.target);             // a tap: resume whatever was in flight
  const vMs = -vt.get();                                         // + = toward the next page
  const landing = pos + project(vMs, 0.99);
  const target = clamp(Math.round(landing / step), 0, n - 1) * step;
  spring.to(target, vMs * 1000);
};
```

Past the ends, display `pos` through `rubber()` with `d` = pager width, while the spring works in raw space.

## 4. Push and pop with interactive swipe-back

One spring on progress `p`, 0 = root showing, 1 = detail showing.

```js
const nav = new Spring(p => draw(p)).apple(0.35, 0); nav.eps = 0.0005;
function draw(p) {
  if (prefersReducedMotion()) {                                   // cross-fade instead of sliding
    detail.style.transform = root.style.transform = 'none';
    detail.style.opacity = p; root.style.opacity = 1 - p; return;
  }
  detail.style.transform = `translate3d(${(1 - p) * W}px, 0, 0)`;
  root.style.transform   = `translate3d(${-0.3 * p * W}px, 0, 0)`;
  dim.style.opacity      = 0.12 * p;
}
row.onclick  = () => nav.to(1);
back.onclick = () => nav.to(0);

edge.onpointerdown = e => { nav.stop(); startX = e.clientX; startP = nav.value; vt.reset(e.clientX); };   // edge zone ≈ 44 px wide
edge.onpointermove = e => { nav.value = clamp(startP - (e.clientX - startX) / W, 0, 1); draw(nav.value); vt.push(e.clientX); };
edge.onpointerup   = () => {
  const vMs = vt.get();                                           // + = finger moving right
  const x = (1 - nav.value) * W + project(vMs, 0.998);            // where the page would coast to
  nav.to(x > W / 2 ? 0 : 1, -vMs * 1000 / W);                     // velocity in progress units
};
```

The edge swipe still works under reduced motion: the finger scrubs the cross-fade.

## 5. Bottom sheet with drag to dismiss

Spring on `p`, 1 = presented. The page behind scales from the top.

```js
const sh = new Spring(p => draw(p)).zeta(0.45, 1); sh.eps = 0.0005;
function draw(p) {
  const q = clamp(p, 0, 1);
  sheet.style.transform = `translate3d(0, ${(1 - p) * H}px, 0)`;
  base.style.transform  = `translate3d(0, ${10 * q}px, 0) scale(${1 - 0.07 * q})`;
  base.style.borderRadius = `${12 * q}px`;
  dim.style.opacity = 0.4 * q;
}
present.onclick = () => { sh.zeta(0.45, 1); sh.to(1); };
dim.onclick     = () => { sh.zeta(0.45, 1); sh.to(0); };

sheet.onpointerdown = e => { sh.stop(); startY = e.clientY; startP = sh.value; vt.reset(e.clientY); };
sheet.onpointermove = e => {
  let p = startP - (e.clientY - startY) / H;
  if (p > 1) p = 1 + rubber((p - 1) * H, H, 0.55) / H;            // band when pulled past the top
  sh.value = Math.max(0, p); draw(sh.value); vt.push(e.clientY);
};
sheet.onpointerup = () => {
  const vMs = vt.get();                                           // + = finger moving down
  const y = (1 - sh.value) * H + project(vMs, 0.998);
  const dismiss = y > H / 2;
  const thrown = Math.abs(vMs) > 0.3;                             // ≈ 300 px/s
  sh.zeta(0.45, thrown ? 0.8 : 1);                                // bounce only when earned
  sh.to(dismiss ? 0 : 1, -vMs * 1000 / H);
};
```

Size the sheet from the space available, not a fixed percentage, so its handle is never hidden behind other chrome.

## 6. Lazy follow while dragging

For an element that should trail the finger organically (a draggable card, a picker thumb), do not set its position directly. Keep an interactive spring targeting the finger:

```js
const s = new Spring(v => draw(v)).apple(0.15, 0.14);
surface.onpointermove = e => { s.to(e.clientX - grab); vt.push(e.clientX); };
surface.onpointerup   = () => s.to(snapTarget, vt.get() * 1000);
```

The 0.15 s response is short enough to feel attached and long enough to smooth input jitter. Leave `s.reduce` at `'damp'`: with `'snap'` it would fire `onRest` on every pointermove.
