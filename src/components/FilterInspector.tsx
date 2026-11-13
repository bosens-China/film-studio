import { useState } from "react";
import { Check, Redo2, Search, SquareCheck, Undo2, X } from "lucide-react";
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
import { Switch } from "@/components/ui/switch";
import { groupLabel, lutLabel } from "@/lib/lut-labels";
import { luts, categories } from "@/lib/luts";
import { matchesScene, sceneLabels, type LutScene } from "@/lib/lut-scenes";

const isMac =
  typeof navigator !== "undefined" &&
  /Mac|iPhone|iPad/.test(navigator.platform);
const mod = isMac ? "⌘" : "Ctrl+";

export type PortraitControl = {
  checked: boolean;
  disabled: boolean;
  hint: string;
};

export function FilterInspector({
  show,
  disabled,
  targetLabel,
  currentLut,
  strength,
  portrait,
  canUndo,
  canRedo,
  syncCount,
  onSelectLut,
  onStrengthChange,
  onStrengthCommit,
  onPortraitChange,
  onUndo,
  onRedo,
  onSync,
}: {
  show: boolean;
  disabled: boolean;
  targetLabel: string;
  currentLut: string;
  strength: number;
  portrait: PortraitControl;
  canUndo: boolean;
  canRedo: boolean;
  syncCount: number;
  onSelectLut: (id: string) => void;
  onStrengthChange: (value: number) => void;
  onStrengthCommit: (value: number) => void;
  onPortraitChange: (value: boolean) => void;
  onUndo: () => void;
  onRedo: () => void;
  onSync: () => void;
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
  const sections =
    filterGroup === "all"
      ? categories
          .map((group) => ({
            group,
            items: shownLuts.filter((lut) => lut.group === group),
          }))
          .filter(({ items }) => items.length)
      : [{ group: "", items: shownLuts }];
  if (!show) return null;
  return (
    <aside className="flex w-76 shrink-0 flex-col border-l border-border bg-sidebar">
      <div className="flex h-11 shrink-0 items-center justify-between gap-2 border-b border-border px-4">
        <div className="flex min-w-0 items-baseline gap-2">
          <span className="shrink-0 text-xs font-semibold">滤镜与调整</span>
          <span
            className="truncate text-xs text-muted-foreground"
            title={targetLabel}
          >
            {targetLabel}
          </span>
        </div>
        <div className="flex shrink-0 items-center">
          <Button
            variant="ghost"
            size="icon-xs"
            aria-label="撤销"
            title={`撤销（${mod}Z）`}
            disabled={!canUndo}
            onClick={onUndo}
            className="text-muted-foreground"
          >
            <Undo2 size={13} />
          </Button>
          <Button
            variant="ghost"
            size="icon-xs"
            aria-label="重做"
            title={`重做（${mod}⇧Z）`}
            disabled={!canRedo}
            onClick={onRedo}
            className="text-muted-foreground"
          >
            <Redo2 size={13} />
          </Button>
        </div>
      </div>

      {disabled ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-2 px-10 text-center">
          <SquareCheck size={18} className="text-muted-foreground" />
          <p className="text-xs leading-relaxed text-muted-foreground">
            勾选照片后，点击滤镜即可应用到所选照片。
          </p>
        </div>
      ) : (
        <>
          <div className="flex min-h-0 flex-1 flex-col px-3 pt-3">
            <div className="relative">
              <Search
                size={14}
                className="absolute top-2.5 left-2.5 text-muted-foreground"
              />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="搜索滤镜名称"
                className="h-8 pr-8 pl-8"
              />
              {search && (
                <Button
                  variant="ghost"
                  size="icon-xs"
                  type="button"
                  aria-label="清空搜索"
                  onClick={() => setSearch("")}
                  className="absolute top-0.5 right-0.5 text-muted-foreground hover:text-foreground"
                >
                  <X size={13} />
                </Button>
              )}
            </div>
            <div className="mt-2 grid grid-cols-2 gap-2">
              <Select
                value={scene}
                onValueChange={(val) => {
                  if (val) setScene(val as LutScene);
                }}
              >
                <SelectTrigger
                  aria-label="适用场景"
                  size="sm"
                  title="场景为精选推荐，未标注的滤镜可在「全部场景」中查看"
                >
                  <SelectValue>
                    {(val: LutScene) => sceneLabels[val]}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {(Object.keys(sceneLabels) as LutScene[]).map((item) => (
                    <SelectItem key={item} value={item}>
                      {sceneLabels[item]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select
                value={filterGroup}
                onValueChange={(val) => {
                  if (val) setFilterGroup(val);
                }}
              >
                <SelectTrigger aria-label="滤镜分类" size="sm">
                  <SelectValue>
                    {(val: string) =>
                      val === "all"
                        ? `全部类别 (${luts.length})`
                        : groupLabel(val)
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

            <div className="-mx-1 mt-2 min-h-0 flex-1 space-y-px overflow-y-auto px-1 pb-2">
              <button
                className={`filter-item ${!currentLut ? "filter-active" : ""}`}
                onClick={() => onSelectLut("")}
              >
                <span className="flex-1 text-left">无滤镜</span>
                {!currentLut && <Check size={13} className="shrink-0" />}
              </button>
              {shownLuts.length === 0 && (
                <p className="px-2 py-4 text-xs text-muted-foreground">
                  没有符合条件的滤镜，请调整场景、分类或搜索词。
                </p>
              )}
              {sections.map(({ group, items }) => (
                <div
                  key={group || "all"}
                  role={group ? "group" : undefined}
                  aria-label={group ? groupLabel(group) : undefined}
                  className="space-y-px"
                >
                  {group && (
                    <div className="sticky top-0 z-10 mt-2 border-t border-border bg-sidebar px-2.5 pt-2 pb-1 text-[11px] font-medium text-muted-foreground">
                      {groupLabel(group)}
                    </div>
                  )}
                  {items.map((lut) => (
                    <button
                      key={lut.id}
                      className={`filter-item ${currentLut === lut.id ? "filter-active" : ""}`}
                      onClick={() => onSelectLut(lut.id)}
                    >
                      <span className="min-w-0 flex-1 truncate text-left">
                        {lutLabel(lut.name)}
                      </span>
                      {currentLut === lut.id && (
                        <Check size={13} className="shrink-0" />
                      )}
                    </button>
                  ))}
                </div>
              ))}
            </div>
          </div>

          <div className="shrink-0 space-y-3 border-t border-border px-4 py-3">
            <div
              onDoubleClick={() => {
                if (currentLut) onStrengthCommit(100);
              }}
              title="双击恢复 100%"
            >
              <div className="mb-1 flex justify-between text-xs">
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
                disabled={!currentLut}
                onValueChange={onStrengthChange}
                onValueCommitted={onStrengthCommit}
              />
            </div>
            <label className="flex cursor-pointer items-center justify-between gap-3">
              <span className="min-w-0">
                <span className="block text-xs">人像优化</span>
                <span className="block truncate text-[11px] text-muted-foreground">
                  {portrait.hint}
                </span>
              </span>
              <Switch
                aria-label="人像优化"
                checked={portrait.checked}
                disabled={portrait.disabled}
                onCheckedChange={onPortraitChange}
              />
            </label>
            {syncCount > 0 && (
              <Button
                size="sm"
                variant="secondary"
                className="w-full"
                onClick={onSync}
              >
                同步到已选照片 ({syncCount})
              </Button>
            )}
          </div>
        </>
      )}
    </aside>
  );
}
