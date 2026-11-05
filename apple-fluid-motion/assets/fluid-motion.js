/**
 * fluid-motion.js — Apple-style interaction physics for the web.
 *
 * Exports (ES module; also attaches to window.FluidMotion when loaded as a plain script):
 *   Spring                duration/bounce spring (mass 1), retargetable, carries velocity
 *   VelocityTracker       finger velocity in px/ms, least-squares fit over the last ~100 ms
 *   project(v, rate)      where a flick lands: v·rate/(1 − rate), v in px/ms
 *   rubber(x, d, c)       overscroll offset (1 − 1/(c·x/d + 1))·d
 *   unrubber(o, d, c)     inverse of rubber
 *   rubberSlope(x, d, c)  d(offset)/dx, for converting finger velocity to offset velocity
 *   prefersReducedMotion() live value of the user's reduced-motion setting
 *   RATE                  { normal: 0.998, fast: 0.99 } per-millisecond deceleration rates
 *
 * Units: px for distance, px/s for spring velocity, px/ms for tracker velocity.
 */

export const RATE = { normal: 0.998, fast: 0.99 };

export const project = (vMs, rate = RATE.normal) => vMs * rate / (1 - rate);

export const rubber      = (x, d, c = 0.55) => (1 - 1 / (c * x / d + 1)) * d;
export const unrubber    = (o, d, c = 0.55) => (o >= d ? Infinity : (o / (d - o)) * d / c);
export const rubberSlope = (x, d, c = 0.55) => c / Math.pow(c * x / d + 1, 2);

// Live reduced-motion flag: follows the OS setting if it changes while the page is open.
let reducedMotion = false;
if (typeof matchMedia === 'function') {
  const mq = matchMedia('(prefers-reduced-motion: reduce)');
  reducedMotion = mq.matches;
  const onChange = e => { reducedMotion = e.matches; };
  if (mq.addEventListener) mq.addEventListener('change', onChange);
  else if (mq.addListener) mq.addListener(onChange);
}
export const prefersReducedMotion = () => reducedMotion;

export class Spring {
  /**
   * @param {(value:number)=>void} onUpdate  called every frame with the current value
   * @param {()=>void} [onRest]              called once when the spring physically settles
   * @param {()=>void} [onDone]              called once at the perceptual duration (Apple's "logically complete")
   */
  constructor(onUpdate, onRest, onDone) {
    this.value = 0; this.velocity = 0; this.target = 0;
    this.onUpdate = onUpdate; this.onRest = onRest; this.onDone = onDone;
    this.eps = 0.05;                 // rest threshold in value units; use ~0.0005 for a 0..1 progress spring
    // Reduced motion: 'damp' (default) keeps the motion but removes all overshoot, so dragging and
    // flinging still work. 'snap' jumps straight to the target; use it only for springs no gesture drives.
    this.reduce = 'damp';
    this._raf = 0; this._last = 0; this._t = 0; this._doneFired = true;
    this.apple(0.5, 0);
  }

  /** Apple's parametrisation: perceptual duration (s) and bounce (−1 < bounce < 1, 0 = no overshoot). */
  apple(duration = 0.5, bounce = 0) {
    const w = 2 * Math.PI / duration;
    const b = Math.max(-0.999, Math.min(0.999, bounce));
    this.k = w * w; this.duration = duration;
    // ζ = 1 − bounce for bounce ≥ 0, ζ = 1/(1 + bounce) for bounce < 0 (overdamped)
    this.c = b >= 0 ? 4 * Math.PI * (1 - b) / duration : 4 * Math.PI / (duration * (1 + b));
    return this;
  }

  /** Legacy parametrisation: response (s) and damping ratio ζ (1 = critically damped). */
  zeta(response = 0.5, zeta = 1) {
    const w = 2 * Math.PI / response;
    this.k = w * w; this.c = 4 * Math.PI * zeta / response; this.duration = response;
    return this;
  }

  /** Jump to a value with no animation. */
  snap(v) { this.stop(); this.value = this.target = v; this.velocity = 0; this.onUpdate(v); return this; }

  /** Animate toward `target`. Pass `velocity` (value units per second) to carry a gesture's speed. Omit it to keep the current velocity. */
  to(target, velocity) {
    this.target = target;
    if (velocity !== undefined) this.velocity = velocity;
    this._t = 0; this._doneFired = false;
    if (reducedMotion && this.reduce === 'snap') {
      this.snap(target); this._done(); this.onRest && this.onRest(); return this;
    }
    if (!this._raf) { this._last = performance.now(); this._raf = requestAnimationFrame(this._tick); }
    return this;
  }

  /** Freeze in place (the user grabbed it). value and velocity stay readable. */
  stop() { if (this._raf) cancelAnimationFrame(this._raf); this._raf = 0; return this; }

  get running() { return this._raf !== 0; }

  _done() { if (!this._doneFired) { this._doneFired = true; this.onDone && this.onDone(); } }

  _tick = (t) => {
    let dt = Math.min(0.064, (t - this._last) / 1000); this._last = t;
    this._t += dt;
    // Under reduced motion, never less than critical damping: no bounce.
    const c = reducedMotion ? Math.max(this.c, 2 * Math.sqrt(this.k)) : this.c;
    const h = 1 / 240;                                  // fixed sub-step keeps stiff springs stable
    while (dt > 0) {
      const s = Math.min(h, dt); dt -= s;
      const a = -this.k * (this.value - this.target) - c * this.velocity;
      this.velocity += a * s; this.value += this.velocity * s;
    }
    if (this._t >= this.duration) this._done();
    if (Math.abs(this.value - this.target) < this.eps && Math.abs(this.velocity) < this.eps * 20) {
      this.value = this.target; this.velocity = 0; this._raf = 0;
      this.onUpdate(this.value); this._done(); this.onRest && this.onRest(); return;
    }
    this.onUpdate(this.value);
    this._raf = requestAnimationFrame(this._tick);
  };
}

export class VelocityTracker {
  constructor(windowMs = 100) { this.windowMs = windowMs; this.s = []; }
  reset(p) { this.s = [[performance.now(), p]]; }
  push(p) {
    const t = performance.now(); this.s.push([t, p]);
    while (this.s.length > 2 && t - this.s[0][0] > this.windowMs) this.s.shift();
  }
  /** px/ms, least-squares slope over the recent window. Zero if the finger paused before lifting. */
  get() {
    const s = this.s, now = performance.now();
    if (s.length < 2 || now - s[s.length - 1][0] > this.windowMs) return 0;
    const n = s.length, t0 = s[0][0];
    let st = 0, sp = 0, stt = 0, stp = 0;
    for (const [t, p] of s) { const x = t - t0; st += x; sp += p; stt += x * x; stp += x * p; }
    const den = n * stt - st * st;
    return den > 1e-9 ? (n * stp - st * sp) / den : 0;
  }
}

if (typeof window !== 'undefined') {
  window.FluidMotion = { Spring, VelocityTracker, project, rubber, unrubber, rubberSlope, prefersReducedMotion, RATE };
}
