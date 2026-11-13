import { ZoomIn } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PhotoPreview } from "@/components/PhotoPreview";
import { CardViewControls } from "@/components/CardViewControls";
import { nameOf } from "@/lib/luts";
import { original, type Grade } from "@/lib/renderer";
import { defaultCardTransform, type useCardView } from "@/hooks/useCardView";

export function SinglePhotoView({
  file,
  draft,
  peekingOriginal,
  cardView,
  openLightboxForLut,
}: {
  file: File;
  draft: Grade;
  peekingOriginal: boolean;
  cardView: ReturnType<typeof useCardView>;
  openLightboxForLut: (lut: string) => void;
}) {
  const {
    viewZoom,
    getCardTransform,
    updateCardTransform,
    startCardPan,
    moveCardPan,
    endCardPan,
    consumeDrag,
  } = cardView;
  const singleTransform = getCardTransform("single");
  const singleTitle = peekingOriginal ? "原图" : nameOf(draft.lut);
  return (
    <div className="group flex h-full w-full flex-col overflow-hidden rounded-lg border border-foreground bg-card ring-1 ring-foreground">
      <div className="relative min-h-0 flex-1 overflow-hidden">
        <button
          type="button"
          aria-label={`激活 ${singleTitle} 视图`}
          onPointerDown={(e) => startCardPan("single", () => {}, e)}
          onPointerMove={moveCardPan}
          onPointerUp={endCardPan}
          onPointerCancel={endCardPan}
          onClick={() => {
            consumeDrag();
          }}
          className="h-full w-full cursor-grab active:cursor-grabbing"
        >
          <PhotoPreview
            file={file}
            grade={peekingOriginal ? original : draft}
            zoom={viewZoom * singleTransform.zoom}
            pan={singleTransform.pan}
            maxSide={1400}
          />
        </button>
        <CardViewControls
          label="当前照片"
          zoom={singleTransform.zoom}
          onZoomChange={(zoom) =>
            updateCardTransform("single", (current) => ({
              ...current,
              zoom,
            }))
          }
          onReset={() =>
            updateCardTransform("single", () => defaultCardTransform)
          }
        />
      </div>
      {/* Bottom Non-overlapping Footer Bar */}
      <div className="flex h-9 shrink-0 items-center justify-between border-t border-border bg-sidebar/90 px-3 text-xs">
        <span className="font-medium text-foreground">{singleTitle}</span>
        <Button
          type="button"
          variant="ghost"
          size="xs"
          aria-label={`弹窗放大查看 ${singleTitle}`}
          onClick={() => openLightboxForLut(peekingOriginal ? "" : draft.lut)}
          className="text-muted-foreground hover:text-foreground"
        >
          <ZoomIn size={12} />
          放大查看
        </Button>
      </div>
    </div>
  );
}
