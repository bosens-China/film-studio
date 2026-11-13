import {
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
  type WheelEvent,
} from "react";
import { Dialog } from "@base-ui/react/dialog";
import { X, ZoomIn, ZoomOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectGroupLabel,
  SelectItem,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { PhotoPreview } from "@/components/PhotoPreview";
import { groupLabel, lutLabel } from "@/lib/lut-labels";
import { luts, categories, nameOf } from "@/lib/luts";

export function PhotoLightbox({
  file,
  strength,
  lightbox,
  onClose,
  onChangeLut,
}: {
  file: File;
  strength: number;
  lightbox: { lut: string };
  onClose: () => void;
  onChangeLut: (lut: string) => void;
}) {
  const [lightboxZoom, setLightboxZoom] = useState(1);
  const [lightboxPan, setLightboxPan] = useState({ x: 0, y: 0 });
  const [isLightboxPanning, setIsLightboxPanning] = useState(false);
  const lightboxPanOrigin = useRef({ x: 0, y: 0, clientX: 0, clientY: 0 });

  function handleLightboxWheel(event: WheelEvent<HTMLDivElement>) {
    event.preventDefault();
    const delta = event.deltaY < 0 ? 0.15 : -0.15;
    setLightboxZoom((prev) =>
      Math.min(4, Math.max(0.5, Number((prev + delta).toFixed(2)))),
    );
  }

  function startLightboxPan(event: ReactPointerEvent<HTMLElement>) {
    if (event.button !== 0) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    lightboxPanOrigin.current = {
      x: lightboxPan.x,
      y: lightboxPan.y,
      clientX: event.clientX,
      clientY: event.clientY,
    };
    setIsLightboxPanning(true);
  }

  function moveLightboxPan(event: ReactPointerEvent<HTMLElement>) {
    if (!isLightboxPanning) return;
    setLightboxPan({
      x:
        lightboxPanOrigin.current.x +
        (event.clientX - lightboxPanOrigin.current.clientX),
      y:
        lightboxPanOrigin.current.y +
        (event.clientY - lightboxPanOrigin.current.clientY),
    });
  }

  function endLightboxPan(event: ReactPointerEvent<HTMLElement>) {
    if (!isLightboxPanning) return;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    setIsLightboxPanning(false);
  }

  return (
    <Dialog.Root
      open
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <Dialog.Portal>
        {
          <Dialog.Popup className="fixed inset-0 z-50 flex flex-col bg-black/92 text-foreground outline-none backdrop-blur-md">
            <Dialog.Title className="sr-only">放大查看照片</Dialog.Title>
            {/* Top Bar: All controls concentrated on the right */}
            <div
              className="flex h-13 shrink-0 items-center justify-end gap-2.5 border-b border-white/10 px-6"
              onClick={(e) => e.stopPropagation()}
            >
              {/* 1. Filter Switcher (Custom UI Select) */}
              <div className="w-56">
                <Select
                  value={lightbox.lut}
                  onValueChange={(val) => onChangeLut(val ?? "")}
                >
                  <SelectTrigger aria-label="弹窗滤镜切换" className="bg-card">
                    <SelectValue>{(val: string) => nameOf(val)}</SelectValue>
                  </SelectTrigger>
                  <SelectContent align="end">
                    <SelectItem value="">原图</SelectItem>
                    <SelectSeparator />
                    {categories.map((cat) => (
                      <SelectGroup key={cat}>
                        <SelectGroupLabel>{groupLabel(cat)}</SelectGroupLabel>
                        {luts
                          .filter((l) => l.group === cat)
                          .map((l) => (
                            <SelectItem key={l.id} value={l.id}>
                              {lutLabel(l.name)}
                            </SelectItem>
                          ))}
                      </SelectGroup>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* 2. Zoom Out / In + Slider + Reset */}
              <div className="flex h-8 items-center gap-1.5 rounded-md border border-input bg-card px-1.5">
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-xs"
                  aria-label="缩小"
                  onClick={() =>
                    setLightboxZoom((z) =>
                      Math.max(0.5, Number((z - 0.25).toFixed(2))),
                    )
                  }
                  className="text-muted-foreground hover:text-foreground"
                >
                  <ZoomOut size={14} />
                </Button>
                <Slider
                  aria-label="弹窗缩放"
                  min={0.5}
                  max={4}
                  step={0.1}
                  value={lightboxZoom}
                  onValueChange={(val) => setLightboxZoom(val)}
                  className="w-24"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="xs"
                  onClick={() => {
                    setLightboxZoom(1);
                    setLightboxPan({ x: 0, y: 0 });
                  }}
                  className="min-w-11 px-1 text-center text-xs font-medium tabular-nums"
                  title="点击重置位置与缩放（支持鼠标滚轮与拖拽移动）"
                >
                  {Math.round(lightboxZoom * 100)}%
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-xs"
                  aria-label="放大"
                  onClick={() =>
                    setLightboxZoom((z) =>
                      Math.min(4, Number((z + 0.25).toFixed(2))),
                    )
                  }
                  className="text-muted-foreground hover:text-foreground"
                >
                  <ZoomIn size={14} />
                </Button>
              </div>

              {/* 3. Exit */}
              <Dialog.Close
                render={
                  <Button
                    variant="outline"
                    size="default"
                    aria-label="关闭放大预览"
                    className="bg-card"
                  />
                }
              >
                <X size={14} />
                退出
              </Dialog.Close>
            </div>

            <div
              className="flex min-h-0 flex-1 items-center justify-center overflow-hidden p-6"
              onWheel={handleLightboxWheel}
              onClick={(e) => e.stopPropagation()}
            >
              <div
                onPointerDown={startLightboxPan}
                onPointerMove={moveLightboxPan}
                onPointerUp={endLightboxPan}
                onPointerCancel={endLightboxPan}
                className="h-full w-full cursor-grab active:cursor-grabbing"
              >
                <PhotoPreview
                  file={file}
                  grade={{ lut: lightbox.lut, strength: strength }}
                  zoom={lightboxZoom}
                  pan={lightboxPan}
                  maxSide={2000}
                />
              </div>
            </div>
          </Dialog.Popup>
        }
      </Dialog.Portal>
    </Dialog.Root>
  );
}
