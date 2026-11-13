import type { Dispatch, SetStateAction } from "react";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuSub,
  ContextMenuSubContent,
  ContextMenuSubTrigger,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";
import { PhotoPreview } from "@/components/PhotoPreview";
import { PortraitBadge } from "@/components/PortraitBadge";
import { nameOf } from "@/lib/luts";
import { original, type Grade } from "@/lib/renderer";
import { openKeyboardMenu } from "@/lib/keyboard-menu";
import type { Photo } from "@/lib/workspace-types";
import { useWorkspaceStore } from "@/stores/workspace";

export function PhotoGrid({
  visible,
  group,
  setDraggingPhotoIds,
  openPhoto,
  exportPhotos,
  applyGradeToIds,
}: {
  visible: Photo[];
  group: string;
  setDraggingPhotoIds: Dispatch<SetStateAction<string[]>>;
  openPhoto: (photo: Photo) => void;
  exportPhotos: (photos: Photo[]) => Promise<void>;
  applyGradeToIds: (ids: string[], grade: Partial<Grade>) => void;
}) {
  const selected = useWorkspaceStore((s) => s.selected);
  const groups = useWorkspaceStore((s) => s.groups);
  const selectPhoto = useWorkspaceStore((s) => s.selectPhoto);
  const assignPhotosToGroup = useWorkspaceStore((s) => s.assignPhotosToGroup);
  const removePhotos = useWorkspaceStore((s) => s.removePhotos);
  const showGroupBadge =
    group === "all" && new Set(visible.map((p) => p.group)).size > 1;
  return (
    <div className="min-h-0 flex-1 overflow-y-auto p-5">
      {visible.length ? (
        <div className="grid grid-cols-[repeat(auto-fill,minmax(240px,1fr))] gap-4">
          {visible.map((photo) => {
            const isSelected = selected.includes(photo.id);
            const groupObj = groups.find((g) => g.id === photo.group);
            return (
              <ContextMenu key={photo.id}>
                <ContextMenuTrigger
                  tabIndex={0}
                  onKeyDown={openKeyboardMenu}
                  aria-label={`照片 ${photo.file.name} 的操作菜单`}
                  draggable
                  onDragStart={() => {
                    const ids = isSelected ? selected : [photo.id];
                    setDraggingPhotoIds(ids);
                  }}
                  onDragEnd={() => setDraggingPhotoIds([])}
                  className={`group relative overflow-hidden rounded-lg border bg-card transition-colors ${
                    isSelected
                      ? "border-foreground/80 ring-1 ring-foreground/80"
                      : "border-border hover:border-foreground/25"
                  }`}
                >
                  <div className="relative aspect-[4/3] overflow-hidden bg-muted/40">
                    <button
                      aria-label={`查看 ${photo.file.name}`}
                      className="h-full w-full cursor-pointer"
                      onClick={() => openPhoto(photo)}
                    >
                      <PhotoPreview
                        file={photo.file}
                        grade={photo.grade}
                        maxSide={600}
                        className="h-full w-full object-cover"
                      />
                    </button>
                    <label className="absolute top-1.5 left-1.5 flex size-8 cursor-pointer items-center justify-center">
                      <input
                        type="checkbox"
                        aria-label={`选择 ${photo.file.name}`}
                        checked={isSelected}
                        onChange={() => selectPhoto(photo.id)}
                        className="size-4 cursor-pointer rounded accent-primary"
                      />
                    </label>
                    {(photo.grade.lut || (groupObj && showGroupBadge)) && (
                      <div className="pointer-events-none absolute inset-x-2 bottom-2 flex items-center justify-between gap-1.5 text-[11px]">
                        {photo.grade.lut ? (
                          <span className="truncate rounded bg-black/65 px-1.5 py-0.5 font-medium text-zinc-100 backdrop-blur-xs">
                            {nameOf(photo.grade.lut)}
                          </span>
                        ) : (
                          <span />
                        )}
                        {groupObj && showGroupBadge && (
                          <span className="shrink-0 rounded bg-black/65 px-1.5 py-0.5 text-zinc-300">
                            {groupObj.name}
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                  <div
                    onClick={() => openPhoto(photo)}
                    className="flex cursor-pointer items-center justify-between gap-2 px-3 py-2"
                  >
                    <span
                      title={photo.file.name}
                      className="truncate text-xs font-medium"
                    >
                      {photo.file.name}
                    </span>
                    <span className="flex shrink-0 items-center gap-1.5 text-[11px] tabular-nums text-muted-foreground">
                      {photo.grade.portrait && !!photo.faces && (
                        <PortraitBadge />
                      )}
                      {photo.grade.lut
                        ? `${photo.grade.strength}%`
                        : photo.grade.portrait && photo.faces
                          ? null
                          : "原图"}
                    </span>
                  </div>
                </ContextMenuTrigger>
                <ContextMenuContent>
                  <ContextMenuItem onClick={() => openPhoto(photo)}>
                    查看照片
                  </ContextMenuItem>
                  <ContextMenuItem onClick={() => selectPhoto(photo.id)}>
                    {isSelected ? "取消选择" : "选择照片"}
                  </ContextMenuItem>
                  <ContextMenuItem onClick={() => void exportPhotos([photo])}>
                    导出这张照片
                  </ContextMenuItem>
                  {(photo.grade.lut || photo.grade.portrait) && (
                    <ContextMenuItem
                      onClick={() => applyGradeToIds([photo.id], original)}
                    >
                      还原为原图
                    </ContextMenuItem>
                  )}
                  <ContextMenuSub>
                    <ContextMenuSubTrigger>移动到分组</ContextMenuSubTrigger>
                    <ContextMenuSubContent>
                      <ContextMenuItem
                        onClick={() => assignPhotosToGroup([photo.id], "")}
                      >
                        未分组
                      </ContextMenuItem>
                      {groups.map((g) => (
                        <ContextMenuItem
                          key={g.id}
                          onClick={() => assignPhotosToGroup([photo.id], g.id)}
                        >
                          {g.name}
                        </ContextMenuItem>
                      ))}
                    </ContextMenuSubContent>
                  </ContextMenuSub>
                  <ContextMenuSeparator />
                  <ContextMenuItem
                    variant="destructive"
                    onClick={() => removePhotos([photo.id])}
                  >
                    移除照片
                  </ContextMenuItem>
                </ContextMenuContent>
              </ContextMenu>
            );
          })}
        </div>
      ) : (
        <div className="flex h-48 flex-col items-center justify-center gap-2 text-sm text-muted-foreground">
          <p>这个分组还没有照片</p>
          <p className="text-xs text-muted-foreground/70">
            可以从「全部照片」或「未分组」拖拽图片到左侧分组，或直接在此导入新照片
          </p>
        </div>
      )}
    </div>
  );
}
