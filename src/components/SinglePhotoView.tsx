import { Expand } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PhotoPreview } from "@/components/PhotoPreview";
import { CardViewControls } from "@/components/CardViewControls";
import { PortraitBadge } from "@/components/PortraitBadge";
import { gradeName } from "@/lib/luts";
import { original, type Grade } from "@/lib/renderer";
import { defaultCardTransform, type useCardView } from "@/hooks/useCardView";

export function SinglePhotoView({
  file,
  grade,
  showPortrait,
  peekingOriginal,
  cardView,
  openLightbox,
}: {
  file: File;
  grade: Grade;
  showPortrait: boolean;
  peekingOriginal: boolean;
  cardView: ReturnType<typeof useCardView>;
  openLightbox: (grade: Grade) => void;
}) {
  const {
    getCardTransform,
    updateCardTransform,
    wheelZoomRef,
    startCardPan,
    moveCardPan,
    endCardPan,
  } = cardView;
  const singleTransform = getCardTransform("single");
  const shownGrade = peekingOriginal ? original : grade;
  const singleTitle = peekingOriginal ? "原图" : gradeName(grade);
  return (
    <div className="group flex h-full w-full flex-col overflow-hidden rounded-lg border border-border bg-card">
      <div
        ref={wheelZoomRef("single")}
        className="relative min-h-0 flex-1 overflow-hidden"
      >
        <div
          role="group"
          aria-label={`${singleTitle} 预览`}
          onPointerDown={(e) => startCardPan("single", e)}
          onPointerMove={moveCardPan}
          onPointerUp={endCardPan}
          onPointerCancel={endCardPan}
          title="滚轮缩放，拖动平移"
          className="h-full w-full cursor-grab active:cursor-grabbing"
        >
          <PhotoPreview
            file={file}
            grade={shownGrade}
            zoom={singleTransform.zoom}
            pan={singleTransform.pan}
            maxSide={1400}
          />
        </div>
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
      <div className="flex h-9 shrink-0 items-center justify-between border-t border-border px-3 text-xs">
        <span className="flex min-w-0 items-center gap-1.5">
          <span className="truncate font-medium text-foreground">
            {singleTitle}
          </span>
          {!peekingOriginal && showPortrait && <PortraitBadge />}
        </span>
        <Button
          type="button"
          variant="ghost"
          size="icon-xs"
          aria-label={`弹窗放大查看 ${singleTitle}`}
          title="放大查看"
          onClick={() => openLightbox(shownGrade)}
          className="text-muted-foreground hover:text-foreground"
        >
          <Expand size={12} />
        </Button>
      </div>
    </div>
  );
}
