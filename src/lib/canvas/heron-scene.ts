/**
 * Ardeis — generative hero scene ("Ardea, the patient hunter")
 *
 * Ported from the design prototype's `genart/heron-scene.js`. Every
 * coordinate here was tuned by eye in a 100-unit space — the beak angle,
 * the crest stroke, the 1.25px eye dot. They are transcribed exactly, not
 * re-derived. Changing them draws a different bird.
 *
 * The scene renders a vector world (clouds, river, recursive tree, heron)
 * into an offscreen canvas, then re-samples it into a glyph grid — ASCII
 * ramp shading — on the visible canvas. The heron reacts to the cursor:
 * it flaps when the pointer comes near, blinks, hops, and repels
 * cursor-spawned noise particles.
 *
 * This runs its own requestAnimationFrame loop. It is cursor-driven, not
 * scroll-driven, so it is deliberately kept off GSAP's ticker and outside
 * React's render model.
 */

export type ArtStyle = "blocky" | "linework" | "vector";

export type HeronSceneOptions = {
  artStyle?: ArtStyle;
  cloudCount?: number;
  flapRadius?: number;
  ink?: string;
  bg?: string;
  glyphFont?: string;
  /**
   * What fraction of the canvas the *composition* occupies — sky, clouds,
   * horizon, tree, heron, ripples. Everything below it is extended water.
   *
   * At 1 (the default) the scene is exactly the ported original: every
   * element is proportional to the full canvas height. Below 1 the
   * composition keeps its original size and position while the river
   * continues to the bottom of a taller canvas, so growing the canvas adds
   * water instead of scaling the bird and the tree.
   */
  compositionRatio?: number;
};

export type HeronPose = {
  sway?: number;
  hop?: number;
  flap?: number;
  wingAng?: number;
  eyeClosed?: boolean;
  ink?: string;
  bg?: string;
};

const DEFAULTS: Required<HeronSceneOptions> = {
  artStyle: "blocky",
  cloudCount: 3,
  flapRadius: 220,
  // Fallbacks only — HeroCanvas passes these through from the design tokens.
  ink: "#020202",
  bg: "#ffffff",
  glyphFont: '"Switzer", monospace',
  compositionRatio: 1,
};

export const SCENE_RAMPS: Record<string, string[]> = {
  blocky: [" ", "·", ":", "░", "▒", "▓", "█"],
  linework: [" ", "·", ":", "/", "\\", "x", "≡", "#", "█"],
};

/** The loader ramp — kept separate from the scene ramps by design. */
export const LOADER_RAMP = [" ", "·", ":", "░", "▒", "▓", "█"];

export function quint(x: number): number {
  return x < 0.5 ? 16 * x * x * x * x * x : 1 - Math.pow(-2 * x + 2, 5) / 2;
}

/**
 * The heron itself. Lifted to module scope so the loader's silhouette mask
 * draws the exact same bird rather than a second hand-typed copy.
 */
export function drawHeron(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  s: number,
  o: HeronPose = {},
): void {
  const ink = o.ink || DEFAULTS.ink;
  const bg = o.bg || DEFAULTS.bg;
  const sw = o.sway || 0;
  const hop = o.hop || 0;
  const flap = o.flap || 0;
  const wingAng = o.wingAng !== undefined ? o.wingAng : -1.75;

  ctx.save();
  ctx.translate(x, y + hop * s);
  ctx.scale(s, s);
  ctx.fillStyle = ink;
  ctx.strokeStyle = ink;
  ctx.lineCap = "round";

  // legs
  ctx.lineWidth = 2.4;
  ctx.beginPath();
  ctx.moveTo(4, -36);
  ctx.lineTo(7, -17);
  ctx.lineTo(5, -hop);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(-2, -36);
  ctx.lineTo(-6, -16);
  ctx.lineTo(-4, 2 - hop);
  ctx.stroke();

  // wings — two overlaid strokes, the trailing one at half alpha for motion blur
  if (flap > 0.02) {
    const wing = (ang: number, alpha: number) => {
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.translate(0, -52);
      ctx.rotate(ang);
      ctx.scale(flap, flap);
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.quadraticCurveTo(22, -8, 46, -3);
      ctx.quadraticCurveTo(22, 5, 0, 7);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    };
    wing(wingAng + 0.4, 0.5);
    wing(wingAng, 1);
  }

  // tail + body
  ctx.beginPath();
  ctx.moveTo(-14, -52);
  ctx.lineTo(-31, -42);
  ctx.lineTo(-13, -41);
  ctx.closePath();
  ctx.fill();
  ctx.save();
  ctx.translate(0, -46);
  ctx.rotate(-0.13);
  ctx.beginPath();
  ctx.ellipse(0, 0, 20, 11, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  // folded-wing crease, knocked out in bg — fades as the wings open
  if (flap < 0.5) {
    ctx.save();
    ctx.globalAlpha = Math.max(0, 1 - flap * 2);
    ctx.strokeStyle = bg;
    ctx.lineWidth = 1.1;
    ctx.beginPath();
    ctx.moveTo(-12, -50);
    ctx.quadraticCurveTo(2, -46, 12, -40);
    ctx.stroke();
    ctx.restore();
  }

  // neck, head, beak, crest
  ctx.strokeStyle = ink;
  ctx.lineWidth = 5.2;
  ctx.beginPath();
  ctx.moveTo(12, -50);
  ctx.bezierCurveTo(24, -54, 18 + sw * 0.4, -70, 23 + sw, -83);
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(24 + sw, -86, 4.2, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(27 + sw, -87.5);
  ctx.lineTo(43 + sw, -82.5);
  ctx.lineTo(27 + sw, -83.5);
  ctx.closePath();
  ctx.fill();
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(21 + sw, -89);
  ctx.lineTo(14 + sw, -93);
  ctx.stroke();

  // eye — a bg dot, or a bg slit when blinking
  if (o.eyeClosed) {
    ctx.strokeStyle = bg;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(23.6 + sw, -87);
    ctx.lineTo(26 + sw, -86.6);
    ctx.stroke();
  } else {
    ctx.fillStyle = bg;
    ctx.beginPath();
    ctx.arc(24.8 + sw, -87, 1.25, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = ink;
  }
  ctx.restore();
}

type Particle = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  decay: number;
  ch: string;
};

type Cloud = {
  x: number;
  y: number;
  w: number;
  h: number;
  sp: number;
  seed: number;
};

export class HeronScene {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private opts: Required<HeronSceneOptions>;

  private mouse: { x: number; y: number };
  private lastMouse: { x: number; y: number };
  private mouseSpeed = 0;
  private flapStart = -99;
  private flapBeats = 0;
  private wasNear = false;
  private particles: Particle[] = [];
  private lastT = 0;

  private rt: number[] = [];
  private clouds: Cloud[];
  private drift: { x: number; y: number; sp: number }[] = [];

  private sW = 0;
  private sH = 0;
  private off: HTMLCanvasElement | null = null;
  private offCtx: CanvasRenderingContext2D | null = null;
  private hcv: HTMLCanvasElement | null = null;
  private hctx: CanvasRenderingContext2D | null = null;

  private flapEnv = 0;
  private wingAng = -1.05;
  private eyeClosed = false;
  private hop = 0;
  private ri = 0;

  private running = false;
  private rafId = 0;

  private onMove: (e: PointerEvent) => void;
  private onDown: () => void;
  private onResize: () => void;

  constructor(canvas: HTMLCanvasElement, opts?: HeronSceneOptions) {
    this.canvas = canvas;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("HeronScene: 2d context unavailable");
    this.ctx = ctx;
    this.opts = { ...DEFAULTS, ...(opts || {}) };

    this.mouse = { x: window.innerWidth / 2, y: window.innerHeight / 2 };
    this.lastMouse = { x: this.mouse.x, y: this.mouse.y };

    // deterministic random table — keeps the tree and river drift stable across frames
    for (let i = 0; i < 128; i++) {
      this.rt.push(Math.abs(Math.sin(i * 127.1 + 311.7) * 43758.5453) % 1);
    }

    this.clouds = [
      { x: 0.16, y: 0.2, w: 0.15, h: 0.055, sp: 0.55, seed: 1.7 },
      { x: 0.52, y: 0.32, w: 0.21, h: 0.065, sp: 0.34, seed: 4.2 },
      { x: 0.84, y: 0.13, w: 0.12, h: 0.045, sp: 0.75, seed: 8.9 },
      { x: 0.34, y: 0.09, w: 0.09, h: 0.035, sp: 0.95, seed: 2.3 },
      { x: 0.7, y: 0.24, w: 0.13, h: 0.05, sp: 0.45, seed: 6.1 },
    ];

    for (let i = 0; i < 9; i++) {
      this.drift.push({
        x: this.rt[i * 3],
        y: this.rt[i * 3 + 1],
        sp: 20 + this.rt[i * 3 + 2] * 30,
      });
    }

    this.onMove = (e: PointerEvent) => {
      this.mouse.x = e.clientX;
      this.mouse.y = e.clientY;
    };
    this.onDown = () => {
      this.flapStart = this.lastT || 0;
      this.flapBeats = 1;
    };
    this.onResize = () => this.resize();
  }

  start(): void {
    if (this.running) return;
    window.addEventListener("pointermove", this.onMove, { passive: true });
    window.addEventListener("resize", this.onResize);
    this.canvas.style.pointerEvents = "auto";
    this.canvas.addEventListener("pointerdown", this.onDown);
    this.resize();
    this.running = true;
    const loop = (now: number) => {
      if (!this.running) return;
      // cursor speed drives particle spawning
      this.mouseSpeed = Math.hypot(
        this.mouse.x - this.lastMouse.x,
        this.mouse.y - this.lastMouse.y,
      );
      this.lastMouse.x = this.mouse.x;
      this.lastMouse.y = this.mouse.y;
      this.drawScene(now);
      this.rafId = requestAnimationFrame(loop);
    };
    this.rafId = requestAnimationFrame(loop);
  }

  /**
   * Full teardown. Symmetric with start(), so repeated start/stop cycles —
   * Strict Mode double-mounts, IntersectionObserver pausing — never leave a
   * second rAF chain or a duplicate listener behind.
   */
  stop(): void {
    this.running = false;
    if (this.rafId) cancelAnimationFrame(this.rafId);
    this.rafId = 0;
    window.removeEventListener("pointermove", this.onMove);
    window.removeEventListener("resize", this.onResize);
    this.canvas.removeEventListener("pointerdown", this.onDown);
  }

  /** Paint a single resting frame without starting the loop. */
  renderStaticFrame(): void {
    this.resize();
    this.drawScene(0);
  }

  resize(): void {
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const r = this.canvas.getBoundingClientRect();
    this.sW = Math.max(1, r.width);
    this.sH = Math.max(1, r.height);
    this.canvas.width = this.sW * dpr;
    this.canvas.height = this.sH * dpr;
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  /* ---------- WORLD ---------- */
  /**
   * @param H  full canvas height — how far the water reaches
   * @param Hc composition height — sizes and places sky, tree, heron, ripples
   */
  private drawWorld(
    ctx: CanvasRenderingContext2D,
    W: number,
    H: number,
    t: number,
    Hc: number = H,
  ): void {
    const ink = this.opts.ink;
    const horizon = Hc * 0.68;
    const riverBot = Hc * 0.94;
    // Only extend when the canvas is genuinely taller than the composition, so
    // the unextended scene stays byte-identical to the original.
    const extended = Hc < H - 0.5;
    const cloudN = Math.max(0, Math.min(5, this.opts.cloudCount ?? 3));

    // clouds: three overlapping ellipses each, wrapping horizontally
    ctx.fillStyle = ink;
    for (let ci = 0; ci < cloudN; ci++) {
      const c = this.clouds[ci];
      const w = c.w * W;
      const h = Math.max(3, c.h * Hc);
      const span = W + w * 2;
      const cx = ((((c.x * W + t * c.sp * W * 0.012) % span) + span) % span) - w;
      const cy = c.y * Hc;
      ctx.globalAlpha = 0.62;
      ctx.beginPath();
      ctx.ellipse(cx, cy, w / 2, h / 2, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.ellipse(cx - w * 0.28, cy + h * 0.15, w * 0.28, h * 0.4, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.ellipse(cx + w * 0.3, cy + h * 0.1, w * 0.24, h * 0.38, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;
    }

    // river: five lines, the horizon one straight, the rest sine-rippled and
    // fading. When extended, the same spacing simply continues to the bottom
    // of the canvas — more water, not a stretched river. The alpha ramp gets a
    // floor so the far bands stay faintly visible instead of going negative.
    const bandStep = (riverBot - horizon) / 4;
    const waterBot = extended ? H : riverBot;
    const bands = extended ? Math.floor((waterBot - horizon) / bandStep) + 1 : 5;
    for (let k = 0; k < bands; k++) {
      const yy = horizon + bandStep * k;
      ctx.strokeStyle =
        k === 0
          ? ink
          : "rgba(10,10,9," + Math.max(0.1, 0.55 - k * 0.08).toFixed(2) + ")";
      ctx.lineWidth = k === 0 ? 1.6 : 1.3;
      ctx.beginPath();
      for (let x = 0; x <= W; x += 4) {
        const y =
          yy +
          (k === 0 ? 0 : Math.sin(x * 0.06 + t * (0.6 + k * 0.18) + k * 2.1) * 1.1);
        if (x === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();
    }

    // drifting flotsam dashes, spread across whatever water there is
    ctx.strokeStyle = "rgba(10,10,9,.45)";
    ctx.lineWidth = 1;
    this.drift.forEach((d) => {
      const x = ((d.x * W + (t * d.sp * 0.12 * W) / 100) % W);
      const y = horizon + 2 + d.y * (waterBot - horizon - 4);
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x + W * 0.012, y);
      ctx.stroke();
    });

    // recursive tree, depth 6, swaying by depth
    ctx.strokeStyle = ink;
    this.ri = 0;
    const rnd = () => this.rt[this.ri++ % this.rt.length];
    const branch = (
      x: number,
      y: number,
      ang: number,
      len: number,
      d: number,
    ): void => {
      if (d === 0 || len < 1) return;
      const a = ang + Math.sin(t * 0.7 + d * 1.3) * 0.008 * (8 - d);
      const x2 = x + Math.cos(a) * len;
      const y2 = y + Math.sin(a) * len;
      ctx.lineWidth = Math.max(1.1, d * 0.55);
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x2, y2);
      ctx.stroke();
      const r1 = rnd();
      const r2 = rnd();
      branch(x2, y2, a - 0.34 - r1 * 0.22, len * 0.72, d - 1);
      branch(x2, y2, a + 0.26 + r2 * 0.2, len * 0.74, d - 1);
    };
    branch(W * 0.13, horizon, -Math.PI / 2 + 0.06, Hc * 0.22, 6);

    const s = (Hc * 0.5) / 100;
    const heronArgs: HeronPose = {
      flap: this.flapEnv || 0,
      wingAng: this.wingAng,
      eyeClosed: this.eyeClosed,
      sway: Math.sin(t * 0.55) * 1.4,
      hop: this.hop || 0,
      ink: this.opts.ink,
      bg: this.opts.bg,
    };

    // punch a thin halo of emptiness behind the heron so clouds/scenery never merge with it
    if (!this.hcv || this.hcv.width !== W || this.hcv.height !== H) {
      this.hcv = document.createElement("canvas");
      this.hcv.width = W;
      this.hcv.height = H;
      this.hctx = this.hcv.getContext("2d", { willReadFrequently: true });
    }
    const hc = this.hctx;
    if (!hc) return;
    hc.clearRect(0, 0, W, H);
    hc.strokeStyle = ink;
    hc.fillStyle = ink;
    hc.lineWidth = ctx.lineWidth;
    drawHeron(hc, W * 0.62, horizon + Hc * 0.02, s, heronArgs);
    ctx.save();
    ctx.globalCompositeOperation = "destination-out";
    ctx.globalAlpha = 1;
    const halo = Math.max(2.5, s * 3);
    for (let a = 0; a < 8; a++) {
      ctx.drawImage(
        this.hcv,
        Math.cos((a * Math.PI) / 4) * halo,
        Math.sin((a * Math.PI) / 4) * halo,
      );
    }
    ctx.drawImage(this.hcv, 0, 0);
    ctx.restore();
    ctx.strokeStyle = ink;
    ctx.fillStyle = ink;
    drawHeron(ctx, W * 0.62, horizon + Hc * 0.02, s, heronArgs);

    // three ripples beneath the bird
    ctx.strokeStyle = "rgba(10,10,9,.4)";
    ctx.lineWidth = 1;
    for (let i = 0; i < 3; i++) {
      const rw = (26 - i * 7) * s;
      const ry = horizon + Hc * 0.06 + i * Hc * 0.05 + Math.sin(t * 1.4 + i) * 1;
      ctx.beginPath();
      ctx.moveTo(W * 0.62 - rw, ry);
      ctx.quadraticCurveTo(W * 0.62, ry + 1.5, W * 0.62 + rw, ry);
      ctx.stroke();
    }
  }

  /* ---------- SCENE ---------- */
  private drawScene(now: number): void {
    const ctx = this.ctx;
    const W = this.sW;
    const H = this.sH;
    if (!W || !H) return;
    const t = now * 0.001;
    this.lastT = t;

    // glyph grid: 10×14px cells, world rendered at 3× per cell then box-averaged.
    // The cell size is why this stays affordable — a finer grid multiplies the
    // per-frame fillText count directly.
    const cw = 10;
    const ch = 14;
    const cols = Math.ceil(W / cw);
    const rows = Math.ceil(H / ch);
    const SS = 3;
    if (!this.off || this.off.width !== cols * SS || this.off.height !== rows * SS) {
      this.off = document.createElement("canvas");
      this.off.width = cols * SS;
      this.off.height = rows * SS;
      this.offCtx = this.off.getContext("2d", { willReadFrequently: true });
    }
    const o = this.offCtx;
    if (!o) return;
    const ow = cols * SS;
    const oh = rows * SS;

    // Composition height in offscreen units — the scene is laid out against
    // this, while the canvas itself may be taller and filled with water.
    const ohc = oh * Math.max(0.05, Math.min(1, this.opts.compositionRatio ?? 1));

    // heron center in screen space
    const rect = this.canvas.getBoundingClientRect();
    const hs = (ohc * 0.5) / 100;
    const hScrX = rect.left + 0.62 * rect.width;
    const hScrY =
      rect.top + ((ohc * 0.68 + ohc * 0.02 - 46 * hs) / oh) * rect.height;
    const d = Math.hypot(this.mouse.x - hScrX, this.mouse.y - hScrY);
    const radius = this.opts.flapRadius ?? 220;
    const near = d < radius;
    if (near && !this.wasNear) {
      this.flapStart = t;
      this.flapBeats = 2;
    }
    this.wasNear = near;

    // graceful flap: period 1.6s per beat, quintic in-out from bottom to top and back
    const period = 1.6;
    const fT = t - this.flapStart;
    const total = this.flapBeats * period;
    let env = 0;
    let wingAng = -1.05;
    if (fT >= 0 && fT < total) {
      env = Math.max(0, Math.min(1, Math.min(fT / 0.4, (total - fT) / 0.4)));
      const ph = (fT % period) / period;
      const tri = ph < 0.5 ? ph * 2 : 2 - ph * 2;
      const e = quint(tri);
      wingAng = -1.05 - e * 1.55; // bottom (-1.05) → top (-2.6) → back
      this.hop = -e * 4 * env;
    } else {
      this.hop = 0;
    }
    this.flapEnv = env;
    this.wingAng = wingAng;
    this.eyeClosed = d < 95 || t % 4.3 < 0.14;

    // vector world into the offscreen buffer
    o.setTransform(1, 0, 0, 1, 0, 0);
    o.clearRect(0, 0, ow, oh);
    this.drawWorld(o, ow, oh, t, ohc);

    // art style — 'blocky' / 'linework' glyph ramps, or 'vector' (smooth line art)
    const artStyle = this.opts.artStyle || "blocky";
    const vectorMode = artStyle === "vector";
    const sceneRamp = SCENE_RAMPS[artStyle] || SCENE_RAMPS.blocky;

    // ---- noise particles: spawn near cursor only while it MOVES, repelled by heron ----
    const inScene =
      this.mouse.x >= rect.left &&
      this.mouse.x <= rect.right &&
      this.mouse.y >= rect.top &&
      this.mouse.y <= rect.bottom;
    if (
      inScene &&
      this.mouseSpeed > 0.8 &&
      this.particles.length < 220 &&
      Math.random() < Math.min(0.9, this.mouseSpeed * 0.05)
    ) {
      const spawnN = 1 + Math.floor(Math.random() * 2);
      for (let s = 0; s < spawnN; s++) {
        const a = Math.random() * Math.PI * 2;
        const rr = Math.random() * 100;
        this.particles.push({
          x: this.mouse.x - rect.left + Math.cos(a) * rr,
          y: this.mouse.y - rect.top + Math.sin(a) * rr,
          vx: (Math.random() - 0.5) * 10,
          vy: (Math.random() - 0.5) * 10,
          life: 1,
          decay: 0.012 + Math.random() * 0.012,
          ch: sceneRamp[3 + Math.floor(Math.random() * (sceneRamp.length - 3))],
        });
      }
    }
    const hLocX = hScrX - rect.left;
    const hLocY = hScrY - rect.top;
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      // heron force field: repulsion vector = particle − heron center
      const ddx = p.x - hLocX;
      const ddy = p.y - hLocY;
      const dd = Math.hypot(ddx, ddy);
      if (dd < radius && dd > 0.001) {
        const f = (1 - dd / radius) * 3.2;
        p.vx += (ddx / dd) * f;
        p.vy += (ddy / dd) * f;
      }
      p.vx *= 0.94;
      p.vy *= 0.94;
      p.x += p.vx * 0.35;
      p.y += p.vy * 0.35;
      p.life -= p.decay;
      if (p.life <= 0) this.particles.splice(i, 1);
    }

    const img = o.getImageData(0, 0, ow, oh).data;
    ctx.clearRect(0, 0, W, H);
    if (vectorMode) {
      ctx.save();
      ctx.scale(W / ow, H / oh);
      this.drawWorld(ctx, ow, oh, t, ohc);
      ctx.restore();
    }
    ctx.font = "400 11px " + this.opts.glyphFont;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillStyle = this.opts.ink;
    const ramp = sceneRamp;

    // heron-only mask (this.hcv is drawn at ow×oh inside drawWorld) —
    // heron cells render bolder: heavier weight, fuller alpha, deeper into the ramp
    const hImg =
      !vectorMode && this.hcv && this.hctx && this.hcv.width === ow
        ? this.hctx.getImageData(0, 0, ow, oh).data
        : null;
    const cellV = new Float32Array(rows * cols);
    for (let r = 0; r < rows; r++) {
      const cy = r * ch + ch / 2;
      for (let c = 0; c < cols; c++) {
        const cx = c * cw + cw / 2;
        let a = 0;
        let hA = 0;
        const bx = c * SS;
        const by = r * SS;
        for (let sy = 0; sy < SS; sy++) {
          const rowOff = (by + sy) * ow;
          for (let sx = 0; sx < SS; sx++) {
            const ii = (rowOff + bx + sx) * 4 + 3;
            a += img[ii];
            if (hImg) hA += hImg[ii];
          }
        }
        const v = a / (SS * SS * 255);
        cellV[r * cols + c] = v;
        if (vectorMode) continue;
        if (v < 0.04) continue;
        const hv = hA / (SS * SS * 255);
        if (hv > 0.05) {
          const hvv = Math.min(1, Math.pow(hv, 0.5));
          ctx.font = "600 12px " + this.opts.glyphFont;
          ctx.globalAlpha = 0.72 + 0.28 * hvv;
          ctx.fillText(
            ramp[Math.min(ramp.length - 1, 2 + Math.floor(hvv * (ramp.length - 2)))],
            cx,
            cy,
          );
          ctx.font = "400 11px " + this.opts.glyphFont;
          continue;
        }
        const vv = Math.min(1, Math.pow(v, 0.6));
        ctx.globalAlpha = 0.5 + 0.5 * vv;
        ctx.fillText(
          ramp[Math.min(ramp.length - 1, 1 + Math.floor(vv * (ramp.length - 1)))],
          cx,
          cy,
        );
      }
    }

    // particles on top, snapped to the grid — but never over (or directly beside)
    // the heron's ink: a one-cell exclusion ring keeps a thin band of emptiness around it
    const heronR = 170;
    for (const p of this.particles) {
      const gc = Math.round(p.x / cw);
      const gr = Math.round(p.y / ch);
      if (Math.hypot(p.x - hLocX, p.y - hLocY) < heronR) {
        let onInk = false;
        for (let dr = -1; dr <= 1 && !onInk; dr++) {
          for (let dc = -1; dc <= 1; dc++) {
            const rr2 = gr + dr;
            const cc2 = gc + dc;
            if (
              rr2 >= 0 &&
              rr2 < rows &&
              cc2 >= 0 &&
              cc2 < cols &&
              cellV[rr2 * cols + cc2] > 0.12
            ) {
              onInk = true;
              break;
            }
          }
        }
        if (onInk) continue;
      }
      ctx.globalAlpha = 0.62 * Math.min(1, p.life * 2);
      if (vectorMode) {
        ctx.beginPath();
        ctx.arc(p.x, p.y, 1.6, 0, Math.PI * 2);
        ctx.fill();
      } else {
        const gx = gc * cw + cw / 2;
        const gy = gr * ch + ch / 2;
        ctx.fillText(p.ch, gx, gy);
      }
    }
    ctx.globalAlpha = 1;
  }
}
