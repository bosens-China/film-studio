import { useEffect, useRef, useState } from "react";
import { LoaderCircle } from "lucide-react";
import { renderImage, type Grade } from "@/lib/renderer";

type Props = {
  file: File;
  grade: Grade;
  className?: string;
  maxSide?: number;
  zoom?: number;
  pan?: { x: number; y: number };
};

type Result = {
  file: File;
  key: string;
  url: string;
  error: string;
  done: boolean;
};

const cacheLimit = 48;
const renders = new Map<string, Blob>();
const fileIds = new WeakMap<File, number>();
let nextFileId = 0;

function gradeKey(file: File, grade: Grade) {
  let id = fileIds.get(file);
  if (id === undefined) {
    id = ++nextFileId;
    fileIds.set(file, id);
  }
  return `${id}|${grade.lut}|${grade.strength}|${grade.portrait ? 1 : 0}`;
}

function remember(key: string, blob: Blob) {
  renders.delete(key);
  renders.set(key, blob);
  if (renders.size > cacheLimit) renders.delete(renders.keys().next().value!);
}

function closestRender(prefix: string): Blob | undefined {
  let best: Blob | undefined;
  let bestSide = 0;
  for (const [key, blob] of renders) {
    if (!key.startsWith(prefix)) continue;
    const side = Number(key.slice(prefix.length));
    if (side > bestSide) {
      best = blob;
      bestSide = side;
    }
  }
  return best;
}

export function PhotoPreview({
  file,
  grade,
  className,
  maxSide = 800,
  zoom = 1,
  pan = { x: 0, y: 0 },
}: Props) {
  const { lut, strength, portrait } = grade;
  const prefix = `${gradeKey(file, grade)}|`;
  const key = `${prefix}${maxSide}`;
  const [result, setResult] = useState<Result | null>(null);
  const currentUrl = useRef("");
  const loading = !result || result.key !== key || !result.done;

  useEffect(() => {
    let active = true;
    const show = (blob: Blob, done: boolean) => {
      if (!active) return;
      const url = URL.createObjectURL(blob);
      if (currentUrl.current) URL.revokeObjectURL(currentUrl.current);
      currentUrl.current = url;
      setResult({ file, key, url, error: "", done });
    };
    const cached = renders.get(key);
    if (cached) {
      remember(key, cached);
      void Promise.resolve().then(() => show(cached, true));
      return () => {
        active = false;
      };
    }
    const placeholder = closestRender(prefix);
    if (placeholder)
      void Promise.resolve().then(() => show(placeholder, false));
    const controller = new AbortController();
    renderImage(
      file,
      { lut, strength, portrait },
      maxSide,
      false,
      controller.signal,
    )
      .then((blob) => {
        remember(key, blob);
        show(blob, true);
      })
      .catch((err: unknown) => {
        if (active) {
          setResult({
            file,
            key,
            url: "",
            error: err instanceof Error ? err.message : "预览失败",
            done: true,
          });
        }
      });
    return () => {
      active = false;
      controller.abort();
    };
  }, [file, key, prefix, lut, strength, portrait, maxSide]);

  useEffect(
    () => () => {
      if (currentUrl.current) URL.revokeObjectURL(currentUrl.current);
    },
    [],
  );

  return (
    <div
      className="relative h-full w-full overflow-hidden select-none"
      aria-busy={loading}
    >
      {result?.file === file && result.url && (
        <img
          src={result.url}
          alt=""
          draggable={false}
          className={className ?? "h-full w-full object-contain"}
          style={{
            transform:
              zoom === 1 && pan.x === 0 && pan.y === 0
                ? undefined
                : `translate3d(${pan.x}px, ${pan.y}px, 0) scale(${zoom})`,
            transformOrigin: "center center",
          }}
        />
      )}
      {loading && (
        <div
          role="status"
          className="pointer-events-none absolute right-2.5 bottom-2.5 flex items-center gap-1.5 rounded-md border border-border/80 bg-background/85 px-2 py-1 text-[11px] font-medium text-foreground shadow-sm backdrop-blur-sm"
        >
          <LoaderCircle
            size={12}
            className="animate-spin text-muted-foreground"
            aria-hidden="true"
          />
          <span>正在处理…</span>
        </div>
      )}
      {!loading && result?.error && (
        <div
          role="alert"
          className="absolute inset-0 flex items-center justify-center bg-card p-4 text-center text-xs text-destructive"
        >
          {result.error}
        </div>
      )}
    </div>
  );
}
