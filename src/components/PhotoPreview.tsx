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
  lut: string;
  strength: number;
  maxSide: number;
  url: string;
  error: string;
};

export function PhotoPreview({
  file,
  grade,
  className,
  maxSide = 800,
  zoom = 1,
  pan = { x: 0, y: 0 },
}: Props) {
  const { lut, strength } = grade;
  const [result, setResult] = useState<Result | null>(null);
  const currentUrl = useRef("");
  const loading =
    !result ||
    result.file !== file ||
    result.lut !== lut ||
    result.strength !== strength ||
    result.maxSide !== maxSide;

  useEffect(() => {
    let active = true;
    renderImage(file, { lut, strength }, maxSide)
      .then((blob) => {
        if (!active) return;
        const url = URL.createObjectURL(blob);
        if (currentUrl.current) URL.revokeObjectURL(currentUrl.current);
        currentUrl.current = url;
        setResult({ file, lut, strength, maxSide, url, error: "" });
      })
      .catch((err: unknown) => {
        if (active) {
          setResult({
            file,
            lut,
            strength,
            maxSide,
            url: "",
            error: err instanceof Error ? err.message : "预览失败",
          });
        }
      });
    return () => {
      active = false;
    };
  }, [file, lut, strength, maxSide]);

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
