import type { Dispatch, SetStateAction } from "react";
import {
  ArrowLeft,
  Columns2,
  Eye,
  Grid2x2,
  Maximize2,
  RotateCcw,
  ZoomIn,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import type { useCardView } from "@/hooks/useCardView";
import type { Photo, Group, CompareMode } from "@/lib/workspace-types";
import type { Grade } from "@/lib/renderer";
import { useWorkspaceStore } from "@/stores/workspace";

export function WorkspaceToolbar({
  view,
  group,
  currentGroupObj,
  visible,
  active,
  showLibrary,
  changeGroup,
  mode,
  setMode,
  draft,
  candidates,
  setCandidates,
  activeSlot,
  setPeekingOriginal,
  openLightboxForLut,
  gridActiveIndex,
  sideActiveIndex,
  cardView,
}: {
  view: "library" | "compare";
  group: string;
  currentGroupObj: Group | undefined;
  visible: Photo[];
  active: Photo | undefined;
  showLibrary: () => void;
  changeGroup: (id: string) => void;
  mode: CompareMode;
  setMode: Dispatch<SetStateAction<CompareMode>>;
  draft: Grade;
  candidates: string[];
  setCandidates: Dispatch<SetStateAction<string[]>>;
  activeSlot: number;
  setPeekingOriginal: Dispatch<SetStateAction<boolean>>;
  openLightboxForLut: (id: string) => void;
  gridActiveIndex: number;
  sideActiveIndex: 0 | 1;
  cardView: ReturnType<typeof useCardView>;
}) {
  const selected = useWorkspaceStore((s) => s.selected);
  const setSelected = useWorkspaceStore((s) => s.setSelected);
  const photos = useWorkspaceStore((s) => s.photos);
  const groups = useWorkspaceStore((s) => s.groups);
  const { viewZoom, setViewZoom, cardTransforms, setCardTransforms } = cardView;
  return (
    <div className="flex shrink-0 flex-wrap items-center gap-x-4 gap-y-2 border-b border-border px-5 py-2">
      <div
        className={`flex min-w-0 items-center gap-3 ${view === "compare" ? "w-full" : "flex-1"}`}
      >
        {view === "compare" && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            aria-label="返回照片列表"
            onClick={() => showLibrary()}
            className="bg-card"
          >
            <ArrowLeft size={14} />
            <span>返回列表</span>
          </Button>
        )}
        <h1 className="shrink-0 truncate text-sm font-semibold tracking-tight">
          {view === "library"
            ? group === "all"
              ? "全部照片"
              : group === "ungrouped"
                ? "未分组"
                : currentGroupObj?.name
            : "照片对比"}
        </h1>
        <span className="min-w-0 text-xs text-muted-foreground truncate">
          {view === "library"
            ? `${visible.length} 张照片 · ${
                selected.length > 0
                  ? "勾选用于批量操作，点击照片查看详情"
                  : "选择照片，探索属于你的色彩"
              }`
            : active?.file.name}
        </span>
      </div>

      {/* Right controls in sub-header */}
      {view === "library" && photos.length > 0 && (
        <div className="flex flex-wrap items-center gap-3 text-sm">
          <label className="flex cursor-pointer items-center gap-1.5 text-muted-foreground hover:text-foreground">
            <input
              type="checkbox"
              checked={
                visible.length > 0 &&
                visible.every((p) => selected.includes(p.id))
              }
              onChange={(e) =>
                setSelected((prev) =>
                  e.target.checked
                    ? [...new Set([...prev, ...visible.map((p) => p.id)])]
                    : prev.filter((id) => !visible.some((p) => p.id === id)),
                )
              }
              className="size-3.5 rounded accent-primary"
            />
            全选当前分组
          </label>
          <span className="text-muted-foreground tabular-nums">
            已选 {selected.length} 张
          </span>
          {selected.length > 0 && (
            <>
              <Select
                value=""
                onValueChange={(val) => {
                  if (!val) return;
                  changeGroup(val === "none" ? "" : val);
                }}
              >
                <SelectTrigger
                  aria-label="移动到分组"
                  size="sm"
                  className="w-34 bg-card"
                >
                  <SelectValue placeholder="移动到分组">
                    {(value: string) =>
                      !value
                        ? "移动到分组"
                        : value === "none"
                          ? "未分组"
                          : (groups.find((g) => g.id === value)?.name ??
                            "移动到分组")
                    }
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">未分组</SelectItem>
                  {groups.map((g) => (
                    <SelectItem key={g.id} value={g.id}>
                      {g.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={() => setSelected([])}
              >
                取消选择
              </Button>
            </>
          )}
        </div>
      )}

      {view === "compare" && active && (
        <div className="flex min-w-0 flex-wrap items-center gap-2">
          <div className="flex items-center gap-0.5 rounded-lg border border-border bg-card p-0.5">
            <Button
              variant={mode === "single" ? "secondary" : "ghost"}
              size="xs"
              onClick={() => setMode("single")}
              className={
                mode === "single" ? "shadow-xs" : "text-muted-foreground"
              }
            >
              <Maximize2 size={12} />
              单图检视
            </Button>
            <Button
              variant={mode === "side" ? "secondary" : "ghost"}
              size="xs"
              onClick={() => setMode("side")}
              className={
                mode === "side" ? "shadow-xs" : "text-muted-foreground"
              }
            >
              <Columns2 size={12} />
              左右对比
            </Button>
            <Button
              variant={mode === "grid" ? "secondary" : "ghost"}
              size="xs"
              onClick={() => {
                setMode("grid");
                if (draft.lut && !candidates.includes(draft.lut)) {
                  setCandidates((prev) =>
                    prev.map((c, idx) => (idx === activeSlot ? draft.lut : c)),
                  );
                }
              }}
              className={
                mode === "grid" ? "shadow-xs" : "text-muted-foreground"
              }
            >
              <Grid2x2 size={12} />2 × 2 网格
            </Button>
          </div>

          <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onMouseDown={() => setPeekingOriginal(true)}
              onMouseUp={() => setPeekingOriginal(false)}
              onMouseLeave={() => setPeekingOriginal(false)}
              title="按住临时对比原图"
              className="bg-card text-xs text-muted-foreground hover:text-foreground"
            >
              <Eye size={12} />
              按住看原图
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() =>
                openLightboxForLut(
                  mode === "grid"
                    ? gridActiveIndex === 0
                      ? ""
                      : (candidates[gridActiveIndex - 1] ?? "")
                    : mode === "side" && sideActiveIndex === 0
                      ? ""
                      : draft.lut,
                )
              }
              className="bg-card text-xs text-muted-foreground hover:text-foreground"
            >
              <ZoomIn size={12} />
              弹窗放大
            </Button>
            <div
              className="flex h-7 items-center gap-2 rounded-lg border border-input bg-card px-2.5"
              title="缩放全部对比卡片，保留各卡片的单独调整"
            >
              <span className="shrink-0">整体缩放</span>
              <Slider
                aria-label="全部卡片缩放"
                min={1}
                max={3}
                step={0.1}
                value={viewZoom}
                onValueChange={setViewZoom}
                className="w-22"
              />
              <span className="w-9 text-right tabular-nums text-foreground">
                {Math.round(viewZoom * 100)}%
              </span>
              {(viewZoom !== 1 ||
                Object.values(cardTransforms).some(
                  ({ zoom, pan }) => zoom !== 1 || pan.x !== 0 || pan.y !== 0,
                )) && (
                <Button
                  type="button"
                  variant="ghost"
                  size="xs"
                  aria-label="重置全部视图"
                  onClick={() => {
                    setViewZoom(1);
                    setCardTransforms({});
                  }}
                  className="px-1.5 text-xs"
                >
                  <RotateCcw size={11} />
                  复位
                </Button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
