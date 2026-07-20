/**
 * @module core/Tween
 * A tiny zero-dependency tween engine, driven by the chart's own
 * render loop (call `group.update(now)` each frame). Keeping the clock
 * external means charts can render-on-demand and pause cleanly.
 */

/** @typedef {(t: number) => number} EasingFn */

/** @type {Record<string, EasingFn>} */
export const Easings = {
  linear: (t) => t,
  quadIn: (t) => t * t,
  quadOut: (t) => t * (2 - t),
  quadInOut: (t) => (t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t),
  cubicIn: (t) => t * t * t,
  cubicOut: (t) => --t * t * t + 1,
  cubicInOut: (t) => (t < 0.5 ? 4 * t * t * t : (t - 1) * (2 * t - 2) * (2 * t - 2) + 1),
  quartOut: (t) => 1 - --t * t * t * t,
  quintOut: (t) => 1 + --t * t * t * t * t,
  expoOut: (t) => (t === 1 ? 1 : 1 - 2 ** (-10 * t)),
  circOut: (t) => Math.sqrt(1 - --t * t),
  backOut: (t) => {
    const c1 = 1.70158, c3 = c1 + 1;
    return 1 + c3 * (t - 1) ** 3 + c1 * (t - 1) ** 2;
  },
  elasticOut: (t) => {
    if (t === 0 || t === 1) return t;
    return 2 ** (-10 * t) * Math.sin((t * 10 - 0.75) * ((2 * Math.PI) / 3)) + 1;
  },
  bounceOut: (t) => {
    const n1 = 7.5625, d1 = 2.75;
    if (t < 1 / d1) return n1 * t * t;
    if (t < 2 / d1) return n1 * (t -= 1.5 / d1) * t + 0.75;
    if (t < 2.5 / d1) return n1 * (t -= 2.25 / d1) * t + 0.9375;
    return n1 * (t -= 2.625 / d1) * t + 0.984375;
  },
};

/**
 * Resolve an easing given a name or a function.
 * @param {string | EasingFn} e
 * @returns {EasingFn}
 */
export function resolveEasing(e) {
  if (typeof e === 'function') return e;
  return Easings[e] || Easings.cubicOut;
}

let nextId = 1;

export class Tween {
  /**
   * @param {object} cfg
   * @param {number} [cfg.from]
   * @param {number} [cfg.to]
   * @param {number} [cfg.duration] milliseconds
   * @param {number} [cfg.delay] milliseconds
   * @param {string | EasingFn} [cfg.easing]
   * @param {string} [cfg.tag] group tag for bulk-cancelling
   * @param {(v: number, t: number) => void} [cfg.onUpdate] v = eased value, t = eased progress
   * @param {() => void} [cfg.onComplete]
   */
  constructor({ from = 0, to = 1, duration = 800, delay = 0, easing = 'cubicOut', tag = '', onUpdate, onComplete } = {}) {
    this.id = nextId++;
    this.from = from;
    this.to = to;
    this.duration = Math.max(1, duration);
    this.delay = delay;
    this.easing = resolveEasing(easing);
    this.tag = tag;
    this.onUpdate = onUpdate;
    this.onComplete = onComplete;
    /** @type {number | null} */
    this.startTime = null; // assigned on first update so tweens created while idle behave
    this.done = false;
  }

  /** @param {number} now performance.now() timestamp */
  update(now) {
    if (this.done) return true;
    if (this.startTime === null) this.startTime = now + this.delay;
    if (now < this.startTime) {
      return false;
    }
    const raw = Math.min(1, (now - this.startTime) / this.duration);
    const t = this.easing(raw);
    this.onUpdate?.(this.from + (this.to - this.from) * t, t);
    if (raw >= 1) {
      this.done = true;
      this.onComplete?.();
    }
    return this.done;
  }

  /** Jump straight to the end state (fires callbacks once). */
  finish() {
    if (this.done) return;
    this.done = true;
    this.onUpdate?.(this.to, 1);
    this.onComplete?.();
  }

  cancel() {
    this.done = true;
    this.onUpdate = null;
    this.onComplete = null;
  }
}

/**
 * A set of tweens updated together. Charts own one group; while it has
 * active tweens the chart keeps rendering, otherwise it sleeps.
 */
export class TweenGroup {
  constructor() {
    /** @type {Set<Tween>} */
    this.tweens = new Set();
  }

  /**
   * Create and register a tween. See {@link Tween} for config.
   * @param {ConstructorParameters<typeof Tween>[0]} cfg
   */
  add(cfg) {
    const t = new Tween(cfg);
    this.tweens.add(t);
    return t;
  }

  /** Number of live tweens. */
  get size() {
    return this.tweens.size;
  }

  /** True while anything is animating. */
  get active() {
    return this.tweens.size > 0;
  }

  /**
   * Advance all tweens. Returns true if any tween is still running.
   * @param {number} now performance.now() timestamp
   */
  update(now) {
    for (const t of this.tweens) {
      if (t.update(now)) this.tweens.delete(t);
    }
    return this.tweens.size > 0;
  }

  /**
   * Cancel tweens. With a tag, only tweens whose tag starts with it are
   * cancelled (so `kill('hover')` clears `hover-0`, `hover-1`, …).
   * @param {string} [tag]
   * @param {boolean} [finish] jump to final state instead of freezing
   */
  kill(tag, finish = false) {
    for (const t of this.tweens) {
      if (tag && !t.tag.startsWith(tag)) continue;
      if (finish) t.finish();
      else t.cancel();
      this.tweens.delete(t);
    }
  }
}
