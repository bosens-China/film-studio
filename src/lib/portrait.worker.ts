import {
  FaceLandmarker,
  FilesetResolver,
  type NormalizedLandmark,
} from "@mediapipe/tasks-vision";

type Point = { x: number; y: number };

const wasm = `${self.location.origin}${import.meta.env.BASE_URL}mediapipe`;
const model = `${wasm}/face_landmarker.task`;

const detector = FilesetResolver.forVisionTasks(wasm, true).then((vision) =>
  FaceLandmarker.createFromOptions(vision, {
    baseOptions: { modelAssetPath: model, delegate: "CPU" },
    runningMode: "IMAGE",
    numFaces: 10,
  }),
);

// Retry cropped tiles when a common travel portrait is too small in the full frame.
const tileOverlap = 0.2;
const maxTileSide = 1024;

function tileOffsets(length: number, size: number) {
  if (length <= size) return [0];
  const count = Math.ceil((length - size) / (size * (1 - tileOverlap))) + 1;
  return Array.from({ length: count }, (_, i) =>
    Math.round((i * (length - size)) / (count - 1)),
  );
}

function center(face: Point[]) {
  return {
    x: (face[234].x + face[454].x) / 2,
    y: (face[10].y + face[152].y) / 2,
    width: Math.abs(face[454].x - face[234].x),
  };
}

function isDuplicate(face: Point[], faces: Point[][]) {
  const a = center(face);
  return faces.some((other) => {
    const b = center(other);
    return Math.hypot(a.x - b.x, a.y - b.y) < Math.max(a.width, b.width) * 0.5;
  });
}

function scanTiles(
  landmarker: FaceLandmarker,
  bitmap: ImageBitmap,
  divisions: number,
) {
  const { width, height } = bitmap;
  const size = Math.round(Math.max(width, height) / divisions);
  const scale = Math.min(1, maxTileSide / size);
  const canvas = new OffscreenCanvas(1, 1);
  const ctx = canvas.getContext("2d")!;
  const found: Point[][] = [];
  for (const top of tileOffsets(height, size)) {
    for (const left of tileOffsets(width, size)) {
      const tileWidth = Math.min(size, width - left);
      const tileHeight = Math.min(size, height - top);
      canvas.width = Math.round(tileWidth * scale);
      canvas.height = Math.round(tileHeight * scale);
      ctx.drawImage(
        bitmap,
        left,
        top,
        tileWidth,
        tileHeight,
        0,
        0,
        canvas.width,
        canvas.height,
      );
      for (const landmarks of landmarker.detect(canvas).faceLandmarks) {
        if (cutByTileEdge(landmarks, left, top, tileWidth, tileHeight, bitmap))
          continue;
        const face = landmarks.map(({ x, y }) => ({
          x: (left + x * tileWidth) / width,
          y: (top + y * tileHeight) / height,
        }));
        if (!isDuplicate(face, found)) found.push(face);
      }
    }
  }
  return found;
}

/** Faces touching an inner tile edge are partial; a neighbouring tile holds them whole. */
function cutByTileEdge(
  landmarks: NormalizedLandmark[],
  left: number,
  top: number,
  tileWidth: number,
  tileHeight: number,
  bitmap: ImageBitmap,
) {
  const margin = 0.01;
  const xs = landmarks.map((p) => p.x);
  const ys = landmarks.map((p) => p.y);
  return (
    (left > 0 && Math.min(...xs) < margin) ||
    (top > 0 && Math.min(...ys) < margin) ||
    (left + tileWidth < bitmap.width && Math.max(...xs) > 1 - margin) ||
    (top + tileHeight < bitmap.height && Math.max(...ys) > 1 - margin)
  );
}

self.onmessage = async (
  event: MessageEvent<{ id: number; bitmap: ImageBitmap }>,
) => {
  const { id, bitmap } = event.data;
  try {
    const landmarker = await detector;
    let faces: Point[][] = landmarker
      .detect(bitmap)
      .faceLandmarks.map((face) => face.map(({ x, y }) => ({ x, y })));
    if (!faces.length) faces = scanTiles(landmarker, bitmap, 3);
    self.postMessage({ id, faces });
  } catch (error) {
    self.postMessage({ id, error: String(error) });
  } finally {
    bitmap.close();
  }
};
