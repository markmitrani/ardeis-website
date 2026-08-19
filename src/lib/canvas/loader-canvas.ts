/**
 * Loader ASCII reveal.
 *
 * Renders the heron silhouette into an offscreen buffer, box-averages it into
 * a glyph grid, then reveals cells in a stable random order as progress runs
 * 0 → 1. Cells not yet revealed flicker with random ramp glyphs; empty space
 * gets sparse noise that thins out as the reveal completes.
 *
 * Shares `drawHeron` with the hero scene, so the silhouette is the same bird.
 */
import { drawHeron, LOADER_RAMP } from "./heron-scene";

export type LoaderRenderer = {
  draw: (p: number) => void;
  dispose: () => void;
};

export function createLoaderRenderer(
  canvas: HTMLCanvasElement,
): LoaderRenderer | null {
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;

  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const W = Math.max(320, window.innerWidth);
  const H = Math.max(320, window.innerHeight);
  canvas.width = W * dpr;
  canvas.height = H * dpr;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

  const cw = 11;
  const ch = 15;
  const cols = Math.ceil(W / cw);
  const rows = Math.ceil(H / ch);
  const SS = 3;

  const off = document.createElement("canvas");
  off.width = cols * SS;
  off.height = rows * SS;
  const o = off.getContext("2d", { willReadFrequently: true });
  if (!o) return null;

  const s = (rows * SS * 0.52) / 100;
  drawHeron(o, cols * SS * 0.5 - 6 * s, rows * SS * 0.66, s, {
    ink: "#fff",
    bg: "#0a0a09",
  });

  const img = o.getImageData(0, 0, cols * SS, rows * SS).data;
  const cov = new Float32Array(cols * rows);
  const ord = new Float32Array(cols * rows);
  for (let r = 0; r < rows; r++) {
    for (let cc = 0; cc < cols; cc++) {
      let a = 0;
      for (let sy = 0; sy < SS; sy++) {
        for (let sx = 0; sx < SS; sx++) {
          a += img[((r * SS + sy) * cols * SS + cc * SS + sx) * 4 + 3];
        }
      }
      cov[r * cols + cc] = a / (SS * SS * 255);
      ord[r * cols + cc] = Math.random();
    }
  }

  const ramp = LOADER_RAMP;

  const draw = (p: number) => {
    ctx.clearRect(0, 0, W, H);
    ctx.font = '600 12px "Switzer", sans-serif';
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillStyle = "#F4F0EA";
    for (let r = 0; r < rows; r++) {
      for (let cc = 0; cc < cols; cc++) {
        const i = r * cols + cc;
        const v = cov[i];
        const x = cc * cw + cw / 2;
        const y = r * ch + ch / 2;
        if (v > 0.05) {
          if (ord[i] < p) {
            ctx.globalAlpha = 0.4 + 0.6 * v;
            ctx.fillText(
              ramp[Math.min(ramp.length - 1, 1 + Math.floor(v * (ramp.length - 1)))],
              x,
              y,
            );
          } else if (Math.random() < 0.5) {
            ctx.globalAlpha = 0.28;
            ctx.fillText(ramp[1 + Math.floor(Math.random() * (ramp.length - 1))], x, y);
          }
        } else if (Math.random() < 0.006 * (1 - p)) {
          ctx.globalAlpha = 0.14;
          ctx.fillText(ramp[1 + Math.floor(Math.random() * 3)], x, y);
        }
      }
    }
    ctx.globalAlpha = 1;
  };

  return {
    draw,
    dispose: () => {
      off.width = 0;
      off.height = 0;
    },
  };
}
