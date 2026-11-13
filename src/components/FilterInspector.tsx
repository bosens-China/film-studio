import { useState } from "react";
import { Check, RotateCcw, Search, SlidersHorizontal, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { groupLabel, lutLabel } from "@/lib/lut-labels";
import { luts, categories } from "@/lib/luts";
import { matchesScene, sceneLabels, type LutScene } from "@/lib/lut-scenes";

function swatchGradient(groupName: string): string {
  if (groupName.includes("Bw") || groupName.includes("Black & White")) {
    return "from-zinc-200 via-zinc-500 to-zinc-900";
  }
  if (groupName.includes("Fuji")) {
    return "from-emerald-300/80 via-teal-600/80 to-zinc-900";
  }
  if (groupName.includes("Portrait") || groupName.includes("Negative")) {
    return "from-amber-200/80 via-orange-500/70 to-stone-900";
  }
  if (groupName.includes("Cinematic") || groupName.includes("Mood")) {
    return "from-cyan-300/75 via-slate-600/80 to-amber-700/80";
  }
  if (groupName.includes("Colorslide") || groupName.includes("Boost")) {
    return "from-rose-400/80 via-amber-400/80 to-indigo-900";
  }
  return "from-zinc-300/80 via-stone-500/80 to-zinc-800";
}

export function FilterInspector({
  show,
  view,
  mode,
  activeId,
  selected,
  visibleIds,
  hasCurrentGroup,
  targetDescription,
  previewPending,
  currentInspectorLut,
  strength,
  gridActiveIndex,
  onSlotChange,
  handleSelectLut,
  handleStrengthChange,
  apply,
}: {
  show: boolean;
  view: "compare" | "library";
  mode: "single" | "side" | "grid";
  activeId: string | undefined;
  selected: string[];
  visibleIds: string[];
  hasCurrentGroup: boolean;
  targetDescription: string;
  previewPending: boolean;
  currentInspectorLut: string;
  strength: number;
  gridActiveIndex: number;
  onSlotChange: (slot: number) => void;
  handleSelectLut: (id: string) => void;
  handleStrengthChange: (value: number) => void;
  apply: (ids: string[]) => void;
}) {
  const [filterGroup, setFilterGroup] = useState("all");
  const [scene, setScene] = useState<LutScene>("all");
  const [search, setSearch] = useState("");
  const shownLuts = luts.filter(
    (lut) =>
      (!search ||
        lutLabel(lut.name)
          .toLowerCase()
          .includes(search.trim().toLowerCase())) &&
      (filterGroup === "all" || lut.group === filterGroup) &&
      matchesScene(lut, scene),
  );
  if (!show) return null;
  return (
    <aside className="flex w-76 shrink-0 flex-col border-l border-border bg-sidebar">
      <div className="border-b border-border px-4 py-3.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5 text-xs font-semibold">
            <SlidersHorizontal size={14} />
            <span>滤镜与调整</span>
          </div>
          {currentInspectorLut && (
            <Button
              type="button"
              variant="ghost"
              size="xs"
              onClick={() => handleSelectLut("")}
              className="text-muted-foreground hover:text-foreground"
            >
              <RotateCcw size={11} /> 重置原图
            </Button>
          )}
        </div>
        <div className="mt-1.5 flex items-center justify-between rounded-md border border-border bg-background/60 px-2.5 py-1.5 text-xs">
          <span
            className="truncate text-muted-foreground"
            title={targetDescription}
          >
            目标：
            <strong className="font-medium text-foreground">
              {targetDescription}
            </strong>
          </span>
          <span className="ml-2 shrink-0 text-xs text-emerald-400">
            {previewPending
              ? "预览未应用"
              : view === "library"
                ? "显示已应用效果"
                : "已应用"}
          </span>
        </div>
        <p className="mt-2 text-xs text-muted-foreground">
          {view === "compare"
            ? "应用使用右侧滤镜；导出保存当前选中的视图。"
            : "参数以首张已选照片为准；应用后更新照片，导出所选使用已应用效果。"}
        </p>
        {view === "compare" && mode === "grid" && (
          <div className="mt-2 flex items-center justify-between text-xs text-muted-foreground">
            <span>当前联动槽位：</span>
            <div className="flex gap-1">
              {[0, 1, 2].map((slot) => (
                <button
                  key={slot}
                  onClick={() => onSlotChange(slot)}
                  className={`rounded px-2 py-1.5 text-xs font-medium ${gridActiveIndex === slot + 1 ? "bg-foreground text-background" : "bg-secondary text-muted-foreground hover:text-foreground"}`}
                >
                  槽位 {slot + 1}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
      <div className="flex min-h-0 flex-1 flex-col px-4 py-3">
        <div className="relative">
          <Search
            size={14}
            className="absolute top-3 left-3 text-muted-foreground"
          />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="搜索滤镜名称"
            className="pr-9 pl-9"
          />
          {search && (
            <Button
              variant="ghost"
              size="icon-xs"
              type="button"
              aria-label="清空搜索"
              onClick={() => setSearch("")}
              className="absolute top-1 right-1 text-muted-foreground hover:text-foreground"
            >
              <X size={13} />
            </Button>
          )}
        </div>
        <div className="mt-2.5">
          <Select
            value={scene}
            onValueChange={(val) => {
              if (val) setScene(val as LutScene);
            }}
          >
            <SelectTrigger aria-label="适用场景">
              <SelectValue>{(val: LutScene) => sceneLabels[val]}</SelectValue>
            </SelectTrigger>
            <SelectContent>
              {(Object.keys(sceneLabels) as LutScene[]).map((item) => (
                <SelectItem key={item} value={item}>
                  {sceneLabels[item]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <p className="mt-1 text-xs text-muted-foreground">
          场景为精选推荐，其余滤镜可在全部场景中查看。
        </p>
        <div className="mt-2.5">
          <Select
            value={filterGroup}
            onValueChange={(val) => {
              if (!val) return;
              setFilterGroup(val);
            }}
          >
            <SelectTrigger aria-label="滤镜分类">
              <SelectValue>
                {(val: string) =>
                  val === "all" ? `全部类别 (${luts.length})` : groupLabel(val)
                }
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">全部类别 ({luts.length})</SelectItem>
              <SelectSeparator />
              {categories.map((cat) => (
                <SelectItem key={cat} value={cat}>
                  {groupLabel(cat)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="mt-3 min-h-0 flex-1 space-y-0.5 overflow-y-auto pr-0.5">
          <button
            className={`filter-item ${!currentInspectorLut ? "filter-active" : ""}`}
            onClick={() => handleSelectLut("")}
          >
            <span className="filter-swatch bg-gradient-to-br from-zinc-200 to-zinc-600" />
            <span>原图</span>
            {!currentInspectorLut && <Check size={13} className="ml-auto" />}
          </button>
          {shownLuts.length === 0 && (
            <p className="px-2 py-4 text-xs text-muted-foreground">
              没有符合条件的滤镜，请调整场景、分类或搜索词。
            </p>
          )}
          {shownLuts.map((lut) => (
            <button
              key={lut.id}
              className={`filter-item ${currentInspectorLut === lut.id ? "filter-active" : ""}`}
              onClick={() => handleSelectLut(lut.id)}
            >
              <span
                className={`filter-swatch flex items-center justify-center bg-gradient-to-br ${swatchGradient(lut.group)} text-[9px] font-semibold tracking-tighter text-white/90 shadow-inner`}
              >
                LUT
              </span>
              <div className="min-w-0 flex-1 text-left">
                <div className="truncate">{lutLabel(lut.name)}</div>
                {filterGroup === "all" && (
                  <div className="truncate text-xs text-muted-foreground">
                    {groupLabel(lut.group)}
                  </div>
                )}
              </div>
              {currentInspectorLut === lut.id && (
                <Check size={13} className="shrink-0" />
              )}
            </button>
          ))}
        </div>
        <div className="mt-3 border-t border-border pt-3">
          <div className="mb-2 flex justify-between text-xs font-medium">
            <span>滤镜强度</span>
            <span className="tabular-nums text-muted-foreground">
              {strength}%
            </span>
          </div>
          <Slider
            aria-label="滤镜强度"
            min={0}
            max={100}
            step={1}
            value={strength}
            onValueChange={(val) => handleStrengthChange(val)}
          />
          <div className="mt-3 grid gap-1.5">
            {view === "compare" ? (
              <>
                <Button
                  size="sm"
                  disabled={!activeId}
                  onClick={() => activeId && apply([activeId])}
                >
                  应用到当前照片
                </Button>
                {selected.length > 0 && (
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => apply(selected)}
                  >
                    应用到选中照片 ({selected.length})
                  </Button>
                )}
              </>
            ) : (
              <>
                <Button
                  size="sm"
                  disabled={!selected.length}
                  onClick={() => apply(selected)}
                >
                  应用到选中照片 ({selected.length})
                </Button>
                {hasCurrentGroup && visibleIds.length > 0 && (
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => apply(visibleIds)}
                  >
                    应用到当前分组 ({visibleIds.length})
                  </Button>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </aside>
  );
}
