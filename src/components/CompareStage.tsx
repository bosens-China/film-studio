import type { Dispatch, PointerEvent, SetStateAction } from "react";
import { Expand } from "lucide-react";
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
import { PhotoPreview } from "@/components/PhotoPreview";
import { PhotoFilmstrip } from "@/components/PhotoFilmstrip";
import { SinglePhotoView } from "@/components/SinglePhotoView";
import { CardViewControls } from "@/components/CardViewControls";
import { PortraitBadge } from "@/components/PortraitBadge";
import { groupLabel, lutLabel } from "@/lib/lut-labels";
import { luts, categories, gradeName, nameOf } from "@/lib/luts";
import { original, type Grade } from "@/lib/renderer";
import type { Photo, CompareMode } from "@/lib/workspace-types";
import { defaultCardTransform, type useCardView } from "@/hooks/useCardView";

export function CompareStage({
  active,
  mode,
  grade,
  candidates,
  adoptedSlot,
  setCandidates,
  cardView,
  peekingOriginal,
  onAdoptLut,
  openLightbox,
  openPhoto,
}: {
  active: Photo;
  mode: CompareMode;
  grade: Grade;
  candidates: string[];
  adoptedSlot: number;
  setCandidates: Dispatch<SetStateAction<string[]>>;
  cardView: ReturnType<typeof useCardView>;
  peekingOriginal: boolean;
  onAdoptLut: (lut: string, slot: number) => void;
  openLightbox: (grade: Grade) => void;
  openPhoto: (photo: Photo) => void;
}) {
  const {
    getCardTransform,
    updateCardTransform,
    wheelZoomRef,
    startCardPan,
    moveCardPan,
    endCardPan,
    consumeDrag,
  } = cardView;
  const showPortrait = grade.portrait && !!active.faces;
  const format =
    active.file.type.slice(6).split("+")[0].toUpperCase() ||
    active.file.name.split(".").pop()?.toUpperCase() ||
    "未知";
  const size =
    active.file.size >= 1_000_000
      ? `${(active.file.size / 1_000_000).toFixed(1)} MB`
      : `${Math.ceil(active.file.size / 1_000)} KB`;
  const modified =
    active.file.lastModified > 0
      ? new Intl.DateTimeFormat("zh-CN", { dateStyle: "medium" }).format(
          active.file.lastModified,
        )
      : null;
  return (
    <>
      <div
        className={`min-h-0 flex-1 p-4 ${
          mode === "single"
            ? "flex items-center justify-center"
            : mode === "grid"
              ? "grid grid-cols-2 grid-rows-2 gap-3"
              : "grid grid-cols-2 gap-3"
        }`}
      >
        {mode === "single" ? (
          <SinglePhotoView
            file={active.file}
            grade={grade}
            showPortrait={showPortrait}
            peekingOriginal={peekingOriginal}
            cardView={cardView}
            openLightbox={openLightbox}
          />
        ) : (
          (mode === "side" ? ["", grade.lut] : ["", ...candidates]).map(
            (id, index) => {
              const slotIdx = index - 1;
              const cardKey = `${mode}-${index}`;
              const cardTransform = getCardTransform(cardKey);
              const isEffect = index > 0;
              const cellGrade: Grade =
                !isEffect || peekingOriginal ? original : { ...grade, lut: id };
              const cellTitle = !isEffect
                ? "原图"
                : mode === "side"
                  ? gradeName(grade)
                  : nameOf(id);
              const isGridSlot = mode === "grid" && isEffect;
              const isAdopted =
                isGridSlot &&
                id !== "" &&
                slotIdx === adoptedSlot &&
                id === grade.lut;
              const panHandlers = {
                onPointerDown: (e: PointerEvent<HTMLElement>) =>
                  startCardPan(cardKey, e),
                onPointerMove: moveCardPan,
                onPointerUp: endCardPan,
                onPointerCancel: endCardPan,
              };
              const preview = (
                <PhotoPreview
                  file={active.file}
                  grade={cellGrade}
                  zoom={cardTransform.zoom}
                  pan={cardTransform.pan}
                  maxSide={1200}
                />
              );

              return (
                <div
                  key={cardKey}
                  className={`group flex min-h-0 flex-col overflow-hidden rounded-lg border bg-card transition-colors ${
                    isAdopted
                      ? "border-foreground/70"
                      : isGridSlot
                        ? "border-border hover:border-foreground/25"
                        : "border-border"
                  }`}
                >
                  <div
                    ref={wheelZoomRef(cardKey)}
                    className="relative min-h-0 flex-1 overflow-hidden"
                  >
                    {isGridSlot ? (
                      <button
                        type="button"
                        aria-label={`采用 ${cellTitle}`}
                        aria-pressed={isAdopted}
                        {...panHandlers}
                        onClick={() => {
                          if (!consumeDrag()) onAdoptLut(id, slotIdx);
                        }}
                        title="点击采用此滤镜；滚轮缩放，拖动平移"
                        className="h-full w-full cursor-grab active:cursor-grabbing"
                      >
                        {preview}
                      </button>
                    ) : (
                      <div
                        role="group"
                        aria-label={`${cellTitle} 预览`}
                        {...panHandlers}
                        title="滚轮缩放，拖动平移"
                        className="h-full w-full cursor-grab active:cursor-grabbing"
                      >
                        {preview}
                      </div>
                    )}
                    <CardViewControls
                      label={
                        !isEffect
                          ? "原图卡片"
                          : mode === "side"
                            ? "效果卡片"
                            : `对比卡片 ${index}`
                      }
                      zoom={cardTransform.zoom}
                      onZoomChange={(zoom) =>
                        updateCardTransform(cardKey, (current) => ({
                          ...current,
                          zoom,
                        }))
                      }
                      onReset={() =>
                        updateCardTransform(cardKey, () => defaultCardTransform)
                      }
                    />
                  </div>

                  <div
                    className="flex h-9 shrink-0 items-center justify-between gap-2 border-t border-border px-2.5 text-xs"
                    onClick={(e) => e.stopPropagation()}
                  >
                    {isGridSlot ? (
                      <div className="min-w-0 flex-1">
                        <Select
                          value={id}
                          onValueChange={(val) => {
                            const nextVal = val ?? "";
                            setCandidates((prev) =>
                              prev.map((x, i) => (i === slotIdx ? nextVal : x)),
                            );
                            onAdoptLut(nextVal, slotIdx);
                          }}
                        >
                          <SelectTrigger
                            aria-label={`第 ${index} 个对比滤镜`}
                            size="xs"
                            className="border-transparent bg-transparent shadow-none hover:bg-accent/50"
                          >
                            <SelectValue>
                              {(val: string) => nameOf(val)}
                            </SelectValue>
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="">无滤镜</SelectItem>
                            <SelectSeparator />
                            {categories.map((cat) => (
                              <SelectGroup key={cat}>
                                <SelectGroupLabel>
                                  {groupLabel(cat)}
                                </SelectGroupLabel>
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
                    ) : (
                      <div className="flex min-w-0 items-center gap-1.5">
                        <span className="truncate font-medium text-foreground">
                          {cellTitle}
                        </span>
                        {isEffect && showPortrait && <PortraitBadge />}
                        {cardTransform.zoom !== 1 && (
                          <span className="shrink-0 text-[10px] tabular-nums text-muted-foreground">
                            {Math.round(cardTransform.zoom * 100)}%
                          </span>
                        )}
                      </div>
                    )}
                    {isGridSlot && showPortrait && <PortraitBadge />}
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-xs"
                      aria-label={`弹窗放大查看 ${cellTitle}`}
                      title="放大查看"
                      onClick={() => openLightbox(cellGrade)}
                      className="shrink-0 text-muted-foreground hover:text-foreground"
                    >
                      <Expand size={12} />
                    </Button>
                  </div>
                </div>
              );
            },
          )
        )}
      </div>

      <PhotoFilmstrip activeId={active.id} openPhoto={openPhoto} />
      <footer
        aria-label="原图文件信息"
        className="flex h-9 shrink-0 items-center gap-4 overflow-x-auto border-t border-border bg-sidebar px-5 text-xs whitespace-nowrap text-muted-foreground"
      >
        <span className="font-medium text-foreground">原图信息</span>
        <span>
          尺寸 {active.width} × {active.height} px
        </span>
        <span>大小 {size}</span>
        <span>格式 {format}</span>
        {modified && <span>文件修改日期 {modified}</span>}
      </footer>
    </>
  );
}
