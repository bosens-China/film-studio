export type Face = { x: number; y: number }[];

const cache = new WeakMap<File, Promise<Face[]>>();
let worker: Worker | undefined;
let nextId = 0;
const pending = new Map<number, (faces: Face[]) => void>();

export function detectFaces(file: File): Promise<Face[]> {
  let result = cache.get(file);
  if (!result) {
    result = (async () => {
      try {
        worker ??= new Worker(
          new URL("./portrait.worker.ts", import.meta.url),
          {
            type: "module",
          },
        );
        worker.onmessage = (
          event: MessageEvent<{ id: number; faces?: Face[]; error?: string }>,
        ) => {
          if (event.data.error)
            console.warn("人像识别不可用", event.data.error);
          pending.get(event.data.id)?.(event.data.faces ?? []);
          pending.delete(event.data.id);
        };
        worker.onerror = (error) => {
          console.warn("人像识别工作线程失败", error.message);
          for (const resolve of pending.values()) resolve([]);
          pending.clear();
          worker?.terminate();
          worker = undefined;
        };
        const bitmap = await createImageBitmap(file);
        const width = bitmap.width;
        const id = ++nextId;
        const faces = await new Promise<Face[]>((resolve) => {
          pending.set(id, resolve);
          worker!.postMessage({ id, bitmap }, [bitmap]);
        });
        return faces.filter(
          (face) =>
            face.length >= 467 &&
            Math.abs(face[454].x - face[234].x) * width >= 80,
        );
      } catch (error) {
        console.warn("人像识别失败", error);
        return [];
      }
    })();
    cache.set(file, result);
  }
  return result;
}

const oval = [
  10, 338, 297, 332, 284, 251, 389, 356, 454, 323, 361, 288, 397, 365, 379, 378,
  400, 377, 152, 148, 176, 149, 150, 136, 172, 58, 132, 93, 234, 127, 162, 21,
  54, 103, 67, 109,
];
const leftEye = [
  33, 7, 163, 144, 145, 153, 154, 155, 133, 173, 157, 158, 159, 160, 161, 246,
];
const rightEye = [
  362, 382, 381, 380, 374, 373, 390, 249, 263, 466, 388, 387, 386, 385, 384,
  398,
];
const mouth = [
  61, 185, 40, 39, 37, 0, 267, 269, 270, 409, 291, 375, 321, 405, 314, 17, 84,
  181, 91, 146,
];
const leftBrow = [70, 63, 105, 66, 107, 55, 65, 52, 53, 46];
const rightBrow = [336, 296, 334, 293, 300, 276, 283, 282, 295, 285];

const skinSamples = [50, 280, 205, 425, 151, 108, 337, 199];

function bounds(face: Face, width: number, height: number) {
  return {
    cx: ((face[234].x + face[454].x) / 2) * width,
    cy: ((face[10].y + face[152].y) / 2) * height,
    fw: Math.abs(face[454].x - face[234].x) * width,
    fh: Math.abs(face[152].y - face[10].y) * height,
  };
}

/**
 * Channels: r = facial skin without eyes/brows/mouth, g = whole face,
 * b = head and upper body. Drawn additively over opaque black because WebGL
 * un-premultiplies canvas uploads, which would turn soft alpha edges hard.
 */
export function faceMask(
  faces: Face[],
  width: number,
  height: number,
): HTMLCanvasElement {
  const scale = Math.min(1, 1024 / Math.max(width, height));
  const w = Math.max(1, Math.round(width * scale));
  const h = Math.max(1, Math.round(height * scale));
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d")!;
  ctx.fillStyle = "#000";
  ctx.fillRect(0, 0, w, h);
  ctx.globalCompositeOperation = "lighter";
  const layer = document.createElement("canvas");
  layer.width = w;
  layer.height = h;
  const layerCtx = layer.getContext("2d")!;
  const path = (face: Face, indices: number[]) => {
    layerCtx.beginPath();
    for (const [i, index] of indices.entries()) {
      const point = face[index];
      if (i === 0) layerCtx.moveTo(point.x * w, point.y * h);
      else layerCtx.lineTo(point.x * w, point.y * h);
    }
    layerCtx.closePath();
    layerCtx.fill();
  };
  for (const face of faces) {
    const { cx, cy, fw, fh } = bounds(face, w, h);
    layerCtx.clearRect(0, 0, w, h);
    layerCtx.fillStyle = "rgb(255,255,0)";
    path(face, oval);
    layerCtx.fillStyle = "rgb(0,255,0)";
    for (const indices of [leftEye, rightEye, leftBrow, rightBrow, mouth])
      path(face, indices);
    ctx.filter = `blur(${Math.max(1, fw * 0.05)}px)`;
    ctx.drawImage(layer, 0, 0);

    layerCtx.clearRect(0, 0, w, h);
    layerCtx.fillStyle = "rgb(0,0,255)";
    for (const [x, y, rx, ry] of [
      [cx, cy - fh * 0.1, fw * 0.85, fh * 0.9],
      [cx, cy + fh * 2.4, fw * 1.5, fh * 1.7],
    ]) {
      layerCtx.beginPath();
      layerCtx.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2);
      layerCtx.fill();
    }
    ctx.filter = `blur(${Math.max(2, fw * 0.45)}px)`;
    ctx.drawImage(layer, 0, 0);
  }
  return canvas;
}

export type PortraitAnalysis = {
  /** Exposure gain that brings the average face luminance to the target. */
  gain: number;
  /** Median face width in source pixels. */
  faceWidth: number;
};

export function analyzePortrait(
  bitmap: ImageBitmap,
  faces: Face[],
): PortraitAnalysis {
  const scale = Math.min(1, 512 / Math.max(bitmap.width, bitmap.height));
  const w = Math.max(1, Math.round(bitmap.width * scale));
  const h = Math.max(1, Math.round(bitmap.height * scale));
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d", { willReadFrequently: true })!;
  ctx.drawImage(bitmap, 0, 0, w, h);
  const { data } = ctx.getImageData(0, 0, w, h);
  let sum = 0;
  let count = 0;
  for (const face of faces) {
    for (const index of skinSamples) {
      const px = Math.round(face[index].x * (w - 1));
      const py = Math.round(face[index].y * (h - 1));
      for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          const x = Math.min(w - 1, Math.max(0, px + dx));
          const y = Math.min(h - 1, Math.max(0, py + dy));
          const i = (y * w + x) * 4;
          sum +=
            (data[i] * 0.2126 + data[i + 1] * 0.7152 + data[i + 2] * 0.0722) /
            255;
          count++;
        }
      }
    }
  }
  const luminance = count ? sum / count : 1;
  const target = 0.56;
  let gain = 1;
  if (luminance < target) {
    // Solve f(L) = target for the highlight-preserving curve f(x) = xg / (1 + x(g - 1)).
    const full =
      (target * (1 - luminance)) / (Math.max(luminance, 0.02) * (1 - target));
    gain = Math.min(2.4, 1 + (full - 1) * 0.85);
  }
  const widths = faces
    .map((face) => bounds(face, bitmap.width, bitmap.height).fw)
    .sort((a, b) => a - b);
  return { gain, faceWidth: widths[Math.floor(widths.length / 2)] ?? 0 };
}
