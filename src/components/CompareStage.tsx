import type { Dispatch, SetStateAction } from "react";
import { ZoomIn } from "lucide-react";
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
import { groupLabel, lutLabel } from "@/lib/lut-labels";
import { luts, categories, nameOf } from "@/lib/luts";
import { original, type Grade } from "@/lib/renderer";
import type { Photo, CompareMode } from "@/lib/workspace-types";
import { defaultCardTransform, type useCardView } from "@/hooks/useCardView";

export function CompareStage({
  active,
  mode,
  draft,
  setDraft,
  candidates,
  setCandidates,
  activeCardKey,
  cardView,
  peekingOriginal,
  setSideActiveIndex,
  setGridActiveIndex,
  setActiveSlot,
  setDirty,
  openLightboxForLut,
  openPhoto,
}: {
  active: Photo;
  mode: CompareMode;
  draft: Grade;
  setDraft: Dispatch<SetStateAction<Grade>>;
  candidates: string[];
  setCandidates: Dispatch<SetStateAction<string[]>>;
  activeCardKey: string;
  cardView: ReturnType<typeof useCardView>;
  peekingOriginal: boolean;
  setSideActiveIndex: Dispatch<SetStateAction<0 | 1>>;
  setGridActiveIndex: Dispatch<SetStateAction<number>>;
  setActiveSlot: Dispatch<SetStateAction<number>>;
  setDirty: Dispatch<SetStateAction<boolean>>;
  openLightboxForLut: (lut: string) => void;
  openPhoto: (photo: Photo) => void;
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
            draft={draft}
            peekingOriginal={peekingOriginal}
            cardView={cardView}
            openLightboxForLut={openLightboxForLut}
          />
        ) : (
          (mode === "side" ? ["", draft.lut] : ["", ...candidates]).map(
            (id, index) => {
              const slotIdx = index - 1;
              const cardKey = `${mode}-${index}`;
              const isCardActive = cardKey === activeCardKey;
              const cardTransform = getCardTransform(cardKey);
              const isAdopted = mode === "grid" && index > 0 && isCardActive;
              const cellGrade: Grade =
                index === 0 || peekingOriginal
                  ? original
                  : mode === "side"
                    ? draft
                    : { lut: id, strength: draft.strength };
              const cellTitle = index === 0 ? "原图" : nameOf(id);
              const activateThisCard = () => {
                if (mode === "side") {
                  setSideActiveIndex(index as 0 | 1);
                } else {
                  setGridActiveIndex(index);
                  if (slotIdx >= 0) {
                    setActiveSlot(slotIdx);
                  }
                }
              };

              return (
                <div
                  key={`${mode}-${index}`}
                  className={`group flex min-h-0 flex-col overflow-hidden rounded-lg border bg-card transition-all ${
                    isCardActive
                      ? "border-foreground ring-1 ring-foreground"
                      : "border-border"
                  }`}
                >
                  {/* Image Area - Click to activate; drag to pan active card; click zoom icon to open lightbox */}
                  <div className="relative min-h-0 flex-1 overflow-hidden">
                    {mode === "grid" && index > 0 ? (
                      <button
                        type="button"
                        aria-label={`选择 ${nameOf(id)} 滤镜`}
                        className={`h-full w-full ${
                          isCardActive
                            ? "cursor-grab active:cursor-grabbing"
                            : "cursor-pointer active:cursor-grabbing"
                        }`}
                        onPointerDown={(e) =>
                          startCardPan(cardKey, activateThisCard, e)
                        }
                        onPointerMove={moveCardPan}
                        onPointerUp={endCardPan}
                        onPointerCancel={endCardPan}
                        onClick={(e) => {
                          e.stopPropagation();
                          if (consumeDrag()) return;
                          activateThisCard();
                          const nextGrade = { ...draft, lut: id };
                          setDraft(nextGrade);
                          setDirty(true);
                        }}
                      >
                        <PhotoPreview
                          file={active.file}
                          grade={cellGrade}
                          zoom={viewZoom * cardTransform.zoom}
                          pan={cardTransform.pan}
                          maxSide={1200}
                        />
                      </button>
                    ) : (
                      <button
                        type="button"
                        aria-label={`激活 ${cellTitle} 视图`}
                        onPointerDown={(e) =>
                          startCardPan(cardKey, activateThisCard, e)
                        }
                        onPointerMove={moveCardPan}
                        onPointerUp={endCardPan}
                        onPointerCancel={endCardPan}
                        onClick={(e) => {
                          e.stopPropagation();
                          if (consumeDrag()) return;
                          activateThisCard();
                        }}
                        className={`h-full w-full ${
                          isCardActive
                            ? "cursor-grab active:cursor-grabbing"
                            : "cursor-pointer active:cursor-grabbing"
                        }`}
                      >
                        <PhotoPreview
                          file={active.file}
                          grade={cellGrade}
                          zoom={viewZoom * cardTransform.zoom}
                          pan={cardTransform.pan}
                          maxSide={1200}
                        />
                      </button>
                    )}
                    <CardViewControls
                      label={
                        index === 0
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

                  {/* Dedicated Bottom Bar Below Image (No Overlap!) */}
                  <div
                    className="flex h-9 shrink-0 items-center justify-between gap-2 border-t border-border bg-sidebar/90 px-2.5 text-xs"
                    onClick={(e) => e.stopPropagation()}
                  >
                    {mode === "grid" && index > 0 ? (
                      <>
                        <button
                          type="button"
                          onClick={() => {
                            activateThisCard();
                            const nextGrade = { ...draft, lut: id };
                            setDraft(nextGrade);
                            setDirty(true);
                          }}
                          className={`h-7 shrink-0 rounded px-2 text-xs font-medium transition ${
                            isCardActive
                              ? "bg-foreground text-background"
                              : "bg-secondary text-muted-foreground hover:text-foreground"
                          }`}
                        >
                          槽位 {index}
                        </button>
                        <div className="min-w-0 flex-1">
                          <Select
                            value={id}
                            onValueChange={(val) => {
                              const nextVal = val ?? "";
                              activateThisCard();
                              setCandidates((prev) =>
                                prev.map((x, i) =>
                                  i === slotIdx ? nextVal : x,
                                ),
                              );
                              const nextGrade = {
                                ...draft,
                                lut: nextVal,
                              };
                              setDraft(nextGrade);
                              setDirty(true);
                            }}
                          >
                            <SelectTrigger
                              aria-label={`第 ${index} 个对比滤镜`}
                              size="xs"
                              onFocus={activateThisCard}
                            >
                              <SelectValue>
                                {(val: string) => nameOf(val)}
                              </SelectValue>
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="">原图</SelectItem>
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
                        <button
                          type="button"
                          onClick={() => {
                            activateThisCard();
                            const nextGrade = { ...draft, lut: id };
                            setDraft(nextGrade);
                            setDirty(true);
                          }}
                          className={`h-7 shrink-0 rounded px-2 text-xs font-medium transition ${
                            isAdopted
                              ? "bg-foreground text-background"
                              : "bg-secondary text-foreground hover:bg-accent"
                          }`}
                        >
                          {isAdopted ? "预览中" : "预览"}
                        </button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon-xs"
                          aria-label={`弹窗放大查看 ${cellTitle}`}
                          onClick={() => openLightboxForLut(id)}
                          className="text-muted-foreground hover:text-foreground"
                          title="放大查看"
                        >
                          <ZoomIn size={12} />
                        </Button>
                      </>
                    ) : (
                      <>
                        <div className="flex min-w-0 items-center gap-1.5">
                          {isCardActive && (
                            <span className="shrink-0 rounded bg-foreground px-1.5 py-0.5 text-[10px] font-medium text-background">
                              当前
                            </span>
                          )}
                          <span className="truncate font-medium text-foreground">
                            {cellTitle}
                          </span>
                          {cardTransform.zoom !== 1 && (
                            <span className="shrink-0 text-[10px] tabular-nums text-muted-foreground">
                              {Math.round(cardTransform.zoom * 100)}%
                            </span>
                          )}
                        </div>
                        <Button
                          type="button"
                          variant="ghost"
                          size="xs"
                          aria-label={`弹窗放大查看 ${cellTitle}`}
                          onClick={() =>
                            openLightboxForLut(index === 0 ? "" : id)
                          }
                          className="shrink-0 px-1.5 text-xs text-muted-foreground hover:text-foreground"
                        >
                          <ZoomIn size={12} />
                          放大查看
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              );
            },
          )
        )}
      </div>

      <PhotoFilmstrip activeId={active.id} openPhoto={openPhoto} />
    </>
  );
}
