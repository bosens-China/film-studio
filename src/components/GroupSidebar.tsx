import type { DragEvent, Dispatch, SetStateAction } from "react";
import {
  Check,
  Folder,
  FolderPlus,
  Images,
  LayoutGrid,
  Trash2,
  X,
} from "lucide-react";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { openKeyboardMenu } from "@/lib/keyboard-menu";
import type { Photo } from "@/lib/workspace-types";
import { useWorkspaceStore } from "@/stores/workspace";

export function GroupSidebar({
  group,
  dragOverGroupId,
  setDragOverGroupId,
  handleGroupDrop,
  selectGroupView,
  creatingGroup,
  setCreatingGroup,
  newGroup,
  setNewGroup,
  createGroup,
  deleteGroup,
  exportPhotos,
}: {
  group: string;
  dragOverGroupId: string | null;
  setDragOverGroupId: Dispatch<SetStateAction<string | null>>;
  handleGroupDrop: (event: DragEvent, groupId: string) => void;
  selectGroupView: (groupId: string) => void;
  creatingGroup: boolean;
  setCreatingGroup: (value: boolean) => void;
  newGroup: string;
  setNewGroup: Dispatch<SetStateAction<string>>;
  createGroup: () => void;
  deleteGroup: (id: string) => void;
  exportPhotos: (photos: Photo[]) => Promise<void>;
}) {
  const photos = useWorkspaceStore((s) => s.photos);
  const groups = useWorkspaceStore((s) => s.groups);
  const setSelected = useWorkspaceStore((s) => s.setSelected);
  return (
    <aside className="flex w-56 shrink-0 flex-col border-r border-border bg-sidebar px-3 py-4">
      <div className="mb-2 px-2 text-xs font-semibold tracking-wider text-muted-foreground uppercase">
        照片图库
      </div>
      <div className="space-y-0.5">
        <button
          className={`side-item ${group === "all" ? "side-active" : ""}`}
          onClick={() => selectGroupView("all")}
        >
          <Images size={14} /> 全部照片 <span>{photos.length}</span>
        </button>
        <button
          className={`side-item ${group === "ungrouped" ? "side-active" : ""} ${
            dragOverGroupId === "" ? "ring-1 ring-primary bg-accent" : ""
          }`}
          onDragOver={(e) => {
            e.preventDefault();
            setDragOverGroupId("");
          }}
          onDragLeave={() => setDragOverGroupId(null)}
          onDrop={(e) => handleGroupDrop(e, "")}
          onClick={() => selectGroupView("ungrouped")}
        >
          <LayoutGrid size={14} /> 未分组{" "}
          <span>{photos.filter((p) => !p.group).length}</span>
        </button>
      </div>

      <div className="mt-6 mb-2 flex items-center justify-between px-2">
        <span className="text-xs font-semibold tracking-wider text-muted-foreground uppercase">
          我的分组
        </span>
        <Button
          variant="ghost"
          size="icon-sm"
          aria-label="新建分组"
          title="新建分组"
          onClick={() => setCreatingGroup(true)}
          className="text-muted-foreground"
        >
          <FolderPlus size={14} />
        </Button>
      </div>

      {creatingGroup && (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            createGroup();
          }}
          className="mb-2 flex items-center gap-1 px-1"
        >
          <Input
            autoFocus
            aria-label="分组名称"
            value={newGroup}
            onChange={(e) => setNewGroup(e.target.value)}
            placeholder="分组名称"
            className="min-w-0"
          />
          <Button
            type="submit"
            variant="ghost"
            size="icon-sm"
            aria-label="确认创建分组"
          >
            <Check size={14} />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            aria-label="取消创建分组"
            onClick={() => setCreatingGroup(false)}
            className="text-muted-foreground"
          >
            <X size={14} />
          </Button>
        </form>
      )}

      <div className="min-h-0 flex-1 space-y-0.5 overflow-y-auto">
        {groups.length === 0 && !creatingGroup && (
          <div className="px-2 py-3 text-xs leading-relaxed text-muted-foreground">
            点击右上角 + 创建分组，支持将照片直接拖拽到分组归类。
          </div>
        )}
        {groups.map((g) => {
          const groupPhotos = photos.filter((p) => p.group === g.id);
          return (
            <ContextMenu key={g.id}>
              <ContextMenuTrigger
                tabIndex={0}
                onKeyDown={openKeyboardMenu}
                aria-label={`分组 ${g.name} 的操作菜单`}
                onDragOver={(e) => {
                  e.preventDefault();
                  setDragOverGroupId(g.id);
                }}
                onDragLeave={() => setDragOverGroupId(null)}
                onDrop={(e) => handleGroupDrop(e, g.id)}
                className={`group side-item ${group === g.id ? "side-active" : ""} ${
                  dragOverGroupId === g.id
                    ? "ring-1 ring-primary bg-accent"
                    : ""
                }`}
              >
                <button
                  className="flex min-w-0 flex-1 items-center gap-2.5 text-left"
                  onClick={() => selectGroupView(g.id)}
                >
                  <Folder size={14} className="shrink-0" />
                  <span className="truncate">{g.name}</span>
                </button>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-xs"
                  className="opacity-0 transition-opacity group-hover:opacity-100 focus:opacity-100 hover:text-destructive"
                  aria-label={`删除分组 ${g.name}`}
                  onClick={() => deleteGroup(g.id)}
                >
                  <Trash2 size={13} />
                </Button>
                <span>{groupPhotos.length}</span>
              </ContextMenuTrigger>
              <ContextMenuContent>
                <ContextMenuItem onClick={() => selectGroupView(g.id)}>
                  查看分组
                </ContextMenuItem>
                <ContextMenuItem
                  disabled={groupPhotos.length === 0}
                  onClick={() => {
                    setSelected(groupPhotos.map((p) => p.id));
                    selectGroupView(g.id);
                  }}
                >
                  全选该组照片以调整滤镜 ({groupPhotos.length})
                </ContextMenuItem>
                <ContextMenuItem
                  disabled={groupPhotos.length === 0}
                  onClick={() => void exportPhotos(groupPhotos)}
                >
                  导出该组照片 ({groupPhotos.length})
                </ContextMenuItem>
                <ContextMenuSeparator />
                <ContextMenuItem
                  variant="destructive"
                  onClick={() => deleteGroup(g.id)}
                >
                  删除分组
                </ContextMenuItem>
              </ContextMenuContent>
            </ContextMenu>
          );
        })}
      </div>

      <div className="mt-auto border-t border-border pt-3 px-2 text-xs leading-relaxed text-muted-foreground">
        <div className="font-medium text-foreground/90">纯本地暗房模式</div>
        <p className="mt-0.5">
          勾选照片可批量预览和应用滤镜；点击照片始终进入详情。
        </p>
      </div>
    </aside>
  );
}
