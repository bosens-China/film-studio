import type { Dispatch, SetStateAction } from "react";
import {
  ArrowLeft,
  Columns2,
  Eye,
  Grid2x2,
  Maximize2,
  Expand,
  Link2,
  RotateCcw,
  Unlink2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { useCardView } from "@/hooks/useCardView";
import type { Photo, Group, CompareMode } from "@/lib/workspace-types";
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
  onModeChange,
  setPeekingOriginal,
  onOpenLightbox,
  primaryCardKey,
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
  onModeChange: (mode: CompareMode) => void;
  setPeekingOriginal: Dispatch<SetStateAction<boolean>>;
  onOpenLightbox: () => void;
  primaryCardKey: string;
  cardView: ReturnType<typeof useCardView>;
}) {
  const selected = useWorkspaceStore((s) => s.selected);
  const setSelected = useWorkspaceStore((s) => s.setSelected);
  const photos = useWorkspaceStore((s) => s.photos);
  const groups = useWorkspaceStore((s) => s.groups);
  const { linked, setLinked, isTransformed, resetView } = cardView;
  const modes: [CompareMode, string, typeof Maximize2][] = [
    ["single", "单图检视", Maximize2],
    ["side", "左右对比", Columns2],
    ["grid", "2 × 2 网格", Grid2x2],
  ];
  return (
    <div className="flex min-h-11 shrink-0 flex-wrap items-center gap-x-4 gap-y-2 border-b border-border px-5 py-1.5">
      <div
        className={`flex min-w-0 items-center gap-3 ${view === "library" ? "flex-1" : ""}`}
      >
        {view === "compare" && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            aria-label="返回照片列表"
            onClick={() => showLibrary()}
            className="-ml-2 text-muted-foreground"
          >
            <ArrowLeft size={14} />
            <span>返回列表</span>
          </Button>
        )}
        {view === "library" && (
          <>
            <h1 className="shrink-0 truncate text-sm font-semibold tracking-tight">
              {group === "all"
                ? "全部照片"
                : group === "ungrouped"
                  ? "未分组"
                  : currentGroupObj?.name}
            </h1>
            <span className="min-w-0 truncate text-xs text-muted-foreground tabular-nums">
              {visible.length} 张照片
            </span>
          </>
        )}
      </div>

      {view === "library" && photos.length > 0 && (
        <div className="flex flex-wrap items-center gap-3 text-xs">
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
          {selected.length > 0 && (
            <>
              <span className="text-muted-foreground tabular-nums">
                已选 {selected.length} 张
              </span>
              <Select
                value=""
                onValueChange={(val) => {
                  if (!val) return;
                  changeGroup(val === "none" ? "" : val);
                }}
              >
                <SelectTrigger
                  aria-label="移动到分组"
                  size="xs"
                  className="w-30 text-xs"
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
                variant="ghost"
                size="xs"
                onClick={() => setSelected([])}
                className="text-muted-foreground"
              >
                取消选择
              </Button>
            </>
          )}
        </div>
      )}

      {view === "compare" && active && (
        <div className="ml-auto flex min-w-0 flex-wrap items-center gap-2">
          <div className="flex items-center gap-0.5 rounded-lg bg-secondary/60 p-0.5">
            {modes.map(([value, label, Icon]) => (
              <Button
                key={value}
                variant={mode === value ? "secondary" : "ghost"}
                size="xs"
                aria-pressed={mode === value}
                aria-label={value === "single" ? label : undefined}
                title={value === "single" ? label : undefined}
                onClick={() => onModeChange(value)}
                className={
                  mode === value
                    ? "bg-background shadow-xs"
                    : "text-muted-foreground"
                }
              >
                <Icon size={12} />
                {value !== "single" && label}
              </Button>
            ))}
          </div>

          <span className="mx-1 h-4 w-px bg-border" aria-hidden="true" />

          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            aria-label="按住看原图"
            title="按住查看原图（\）"
            onPointerDown={() => setPeekingOriginal(true)}
            onPointerUp={() => setPeekingOriginal(false)}
            onPointerLeave={() => setPeekingOriginal(false)}
            className="text-muted-foreground hover:text-foreground"
          >
            <Eye size={14} />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            aria-label="弹窗放大"
            title="弹窗放大"
            onClick={onOpenLightbox}
            className="text-muted-foreground hover:text-foreground"
          >
            <Expand size={14} />
          </Button>
          {mode !== "single" && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              aria-pressed={linked}
              title={
                linked
                  ? "联动中：缩放和拖动同步到所有卡片"
                  : "各卡片独立缩放和拖动"
              }
              onClick={() => setLinked(!linked, primaryCardKey)}
              className={
                linked
                  ? "bg-secondary text-foreground"
                  : "text-muted-foreground hover:text-foreground"
              }
            >
              {linked ? <Link2 size={14} /> : <Unlink2 size={14} />}
              联动
            </Button>
          )}
          {isTransformed && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              aria-label="重置全部视图"
              title="重置全部卡片的缩放与位置"
              onClick={resetView}
              className="text-muted-foreground hover:text-foreground"
            >
              <RotateCcw size={13} />
              复位
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
