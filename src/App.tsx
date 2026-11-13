import { useEffect, useRef, useState, type ChangeEvent } from "react";
import { useEventListener } from "ahooks";
import { Button } from "@/components/ui/button";
import { useNavigate, useRouterState } from "@tanstack/react-router";
import { PhotoLightbox } from "@/components/PhotoLightbox";
import {
  FilterInspector,
  type PortraitControl,
} from "@/components/FilterInspector";
import { EmptyLibrary } from "@/components/EmptyLibrary";
import { GroupSidebar } from "@/components/GroupSidebar";
import { PhotoGrid } from "@/components/PhotoGrid";
import { CompareStage } from "@/components/CompareStage";
import { WorkspaceToolbar } from "@/components/WorkspaceToolbar";
import { WorkbenchHeader } from "@/components/WorkbenchHeader";
import { DeleteGroupDialog } from "@/components/DeleteGroupDialog";
import { SettingsDialog } from "@/components/SettingsDialog";
import { original, type Grade } from "@/lib/renderer";
import { nameOf } from "@/lib/luts";

import type { Photo, CompareMode } from "@/lib/workspace-types";
import { useWorkspaceStore } from "@/stores/workspace";
import { useSettingsStore } from "@/stores/settings";
import { useCardView } from "@/hooks/useCardView";
import { usePhotoFiles } from "@/hooks/usePhotoFiles";
import { slotFor, usePhotoGrade } from "@/hooks/usePhotoGrade";
import { usePhotoDrag } from "@/hooks/usePhotoDrag";
import { useGroupActions } from "@/hooks/useGroupActions";

const initialCandidates = [
  "Fuji Series/Classic Chrome.png",
  "Negative New/Portrait 400.png",
  "Fuji Series/Velvia.png",
];

function isEditable(target: EventTarget | null) {
  if (!(target instanceof HTMLElement)) return false;
  if (target.isContentEditable) return true;
  if (target.tagName === "TEXTAREA" || target.tagName === "SELECT") return true;
  return (
    target instanceof HTMLInputElement &&
    !["checkbox", "radio", "button"].includes(target.type)
  );
}

function ownsArrowKeys(target: EventTarget | null) {
  return (
    target instanceof HTMLElement &&
    !!target.closest(
      '[role="slider"],[role="combobox"],[role="listbox"],[role="menu"],[role="dialog"]',
    )
  );
}

function portraitControl(targets: Photo[]): PortraitControl {
  const detecting = targets.some((p) => p.faces === undefined);
  const withFaces = targets.filter((p) => p.faces);
  if (!withFaces.length)
    return {
      checked: false,
      disabled: true,
      hint: detecting ? "正在识别人脸…" : "未检测到人脸",
    };
  const checked = withFaces.every((p) => p.grade.portrait);
  if (targets.length === 1) {
    const [photo] = withFaces;
    return {
      checked,
      disabled: false,
      hint: `检测到 ${photo.faces} 张人脸${
        checked && !photo.portraitTouched ? " · 已自动开启" : ""
      }`,
    };
  }
  return {
    checked,
    disabled: false,
    hint: `${withFaces.length} / ${targets.length} 张含人脸${detecting ? " · 识别中" : ""}`,
  };
}

export default function App() {
  const photos = useWorkspaceStore((s) => s.photos);
  const groups = useWorkspaceStore((s) => s.groups);
  const [libraryFilter, setLibraryFilter] = useState<"all" | "ungrouped">(
    "all",
  );
  const [compareReturnGroup, setCompareReturnGroup] = useState("");
  const selected = useWorkspaceStore((s) => s.selected);
  const activeId = useWorkspaceStore((s) => s.activeId);
  const setActiveId = useWorkspaceStore((s) => s.setActiveId);
  const assignPhotosToGroup = useWorkspaceStore((s) => s.assignPhotosToGroup);
  const canUndo = useWorkspaceStore((s) => s.past.length > 0);
  const canRedo = useWorkspaceStore((s) => s.future.length > 0);
  const undo = useWorkspaceStore((s) => s.undo);
  const redo = useWorkspaceStore((s) => s.redo);
  const navigate = useNavigate();
  const pathname = useRouterState({
    select: (state) => state.location.pathname,
  });
  const routeId = pathname.startsWith("/photos/")
    ? pathname.slice("/photos/".length)
    : "";
  const routeGroupId = pathname.startsWith("/groups/")
    ? pathname.slice("/groups/".length)
    : "";
  const hasKnownPhoto = !routeId || photos.some((p) => p.id === routeId);
  const hasKnownGroup =
    !routeGroupId || groups.some((g) => g.id === routeGroupId);
  const isUnknownRoute =
    pathname !== "/" &&
    pathname !== "/404" &&
    !pathname.startsWith("/photos/") &&
    !pathname.startsWith("/groups/");
  const isNotFound =
    pathname === "/404" || isUnknownRoute || !hasKnownPhoto || !hasKnownGroup;
  const group = routeGroupId
    ? routeGroupId
    : routeId
      ? compareReturnGroup || libraryFilter
      : libraryFilter;
  const view = routeId ? "compare" : "library";
  const lastRouteId = useRef("");
  const hasPhotos = photos.length > 0;
  const panels = useSettingsStore((s) => s.panels[view]);
  const togglePanel = useSettingsStore((s) => s.togglePanel);

  const [mode, setMode] = useState<CompareMode>("single");
  const [dragStrength, setDragStrength] = useState<number | null>(null);
  const [candidates, setCandidates] = useState(initialCandidates);
  const [adoptedSlot, setAdoptedSlot] = useState<number | null>(null);
  const cardView = useCardView();
  const { resetView } = cardView;
  const [peekingOriginal, setPeekingOriginal] = useState(false);
  const [lightbox, setLightbox] = useState<{ grade: Grade } | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);

  const [error, setError] = useState("");
  const [busy, setBusy] = useState("");
  const [dirty, setDirty] = useState(false);

  const inputRef = useRef<HTMLInputElement>(null);
  const active = photos.find((photo) => photo.id === (routeId || activeId));
  const visible = photos.filter(
    (photo) =>
      group === "all" ||
      (group === "ungrouped" ? !photo.group : photo.group === group),
  );
  const selectedPhotos = photos.filter((p) => selected.includes(p.id));
  const currentGroupObj = groups.find((g) => g.id === group);
  const inGrid = view === "compare" && mode === "grid";

  const appliedGrade =
    view === "compare"
      ? (active?.grade ?? original)
      : (photos.find((photo) => photo.id === selected[0])?.grade ?? original);
  const viewGrade: Grade =
    dragStrength === null
      ? appliedGrade
      : { ...appliedGrade, strength: dragStrength };
  const targetLabel =
    view === "library"
      ? selected.length
        ? `已选 ${selected.length} 张`
        : "未选择照片"
      : "当前照片";

  const exportVariants = candidates
    .map((lut, index) => ({ lut, index }))
    .filter(({ lut }) => lut !== "");
  const gridSlot =
    adoptedSlot !== null && candidates[adoptedSlot] === viewGrade.lut
      ? adoptedSlot
      : slotFor(candidates, viewGrade.lut);

  const primaryCardKey =
    mode === "single"
      ? "single"
      : mode === "side"
        ? "side-1"
        : `grid-${gridSlot + 1}`;

  useEffect(() => {
    if (isNotFound && pathname !== "/404") {
      void navigate({ to: "/404", replace: true });
    }
  }, [isNotFound, pathname, navigate]);

  useEffect(() => {
    if (lastRouteId.current === routeId) return;
    lastRouteId.current = routeId;
    if (!routeId) return;
    const photo = photos.find((item) => item.id === routeId);
    if (photo) {
      // oxlint-disable-next-line react/set-state-in-effect
      setActiveId(photo.id);
      resetView();
      // oxlint-disable-next-line react/set-state-in-effect
      setAdoptedSlot(null);
      // oxlint-disable-next-line react/set-state-in-effect
      setLightbox(null);
    }
  }, [routeId, photos, setActiveId, resetView]);

  useEffect(() => {
    if (!dirty) return;
    const beforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", beforeUnload);
    return () => window.removeEventListener("beforeunload", beforeUnload);
  }, [dirty]);

  const { importFiles, loadSamples, exportPhotos } = usePhotoFiles({
    group,
    busy,
    setBusy,
    setError,
  });

  function selectGroupView(target: string) {
    setLightbox(null);
    if (target === "all" || target === "ungrouped") {
      setLibraryFilter(target);
      setCompareReturnGroup("");
      void navigate({ to: "/" });
    } else {
      setCompareReturnGroup(target);
      void navigate({ to: "/groups/$groupId", params: { groupId: target } });
    }
  }

  function openPhoto(photo: Photo) {
    setActiveId(photo.id);
    lastRouteId.current = photo.id;
    setDragStrength(null);
    setAdoptedSlot(null);
    resetView();
    setLightbox(null);
    if (view === "library") setCompareReturnGroup(routeGroupId);
    void navigate({ to: "/photos/$photoId", params: { photoId: photo.id } });
  }

  function showLibrary() {
    setLightbox(null);
    if (compareReturnGroup && groups.some((g) => g.id === compareReturnGroup)) {
      void navigate({
        to: "/groups/$groupId",
        params: { groupId: compareReturnGroup },
      });
    } else {
      void navigate({ to: "/" });
    }
  }

  const {
    applyGradeToIds,
    selectLut,
    commitStrength,
    setPortrait,
    syncToSelected,
  } = usePhotoGrade({
    view,
    mode,
    activeId: active?.id ?? "",
    gridSlot,
    setCandidates,
    setDirty,
  });

  function changeMode(next: CompareMode) {
    setMode(next);
    const lut = active?.grade.lut;
    if (next !== "grid" || !lut || candidates.includes(lut)) return;
    setCandidates((prev) => {
      const slot = slotFor(prev, "");
      return prev.map((c, i) => (i === slot ? lut : c));
    });
  }

  // Single view is only a first look; an edit moves to side-by-side so the original stays visible.
  function compareAfterEdit(changed: boolean) {
    if (changed && view === "compare" && mode === "single") setMode("side");
  }

  function changeGroup(id: string) {
    assignPhotosToGroup(selected, id);
  }

  const {
    newGroup,
    setNewGroup,
    creatingGroup,
    setCreatingGroup,
    groupToDelete,
    setGroupToDelete,
    createGroup,
    deleteGroup,
  } = useGroupActions({
    setError,
    setCompareReturnGroup,
    setLibraryFilter,
    routeGroupId,
    view,
  });

  const {
    draggingFiles,
    setDraggingFiles,
    setDraggingPhotoIds,
    dragOverGroupId,
    setDragOverGroupId,
    handleGlobalDragOver,
    handleGlobalDrop,
    handleGroupDrop,
  } = usePhotoDrag(importFiles, assignPhotosToGroup);

  useEventListener("keydown", (event: KeyboardEvent) => {
    if (isEditable(event.target)) return;
    const mod = event.metaKey || event.ctrlKey;
    const key = event.key.toLowerCase();
    if (mod && (key === "z" || key === "y")) {
      event.preventDefault();
      if (key === "y" || event.shiftKey) redo();
      else undo();
      return;
    }
    if (mod || event.altKey) return;
    if (
      (event.key === "[" || event.key === "]") &&
      hasPhotos &&
      !lightbox &&
      !settingsOpen
    ) {
      event.preventDefault();
      togglePanel(view, event.key === "[" ? "left" : "right");
      return;
    }
    if (view !== "compare" || !active || lightbox || settingsOpen) return;
    if (event.key === "\\") {
      event.preventDefault();
      setPeekingOriginal(true);
      return;
    }
    if (
      (event.key === "ArrowLeft" || event.key === "ArrowRight") &&
      !ownsArrowKeys(event.target)
    ) {
      const index = photos.findIndex((p) => p.id === active.id);
      const next = photos[index + (event.key === "ArrowRight" ? 1 : -1)];
      if (next) {
        event.preventDefault();
        openPhoto(next);
      }
    }
  });
  useEventListener("keyup", (event: KeyboardEvent) => {
    if (event.key === "\\") setPeekingOriginal(false);
  });
  useEventListener("blur", () => setPeekingOriginal(false));

  const onFile = (event: ChangeEvent<HTMLInputElement>) => {
    if (event.target.files) void importFiles(event.target.files);
    event.target.value = "";
  };

  const inspectorDisabled = view === "library" && selected.length === 0;
  const showGroupSidebar = hasPhotos && panels.left;
  const showFilterSidebar =
    hasPhotos && panels.right && (view === "library" || !!active);

  return (
    <div
      className="dark flex h-screen min-h-[640px] w-full flex-col overflow-hidden bg-background text-foreground select-none"
      onDragOver={handleGlobalDragOver}
      onDragLeave={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node)) {
          setDraggingFiles(false);
          setDragOverGroupId(null);
        }
      }}
      onDrop={handleGlobalDrop}
    >
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={onFile}
      />

      <WorkbenchHeader
        isNotFound={isNotFound}
        busy={busy}
        error={error}
        exportDisabled={
          !!busy || (view === "compare" ? !active : !selected.length)
        }
        exportLabel={
          view === "compare" ? "导出当前照片" : `导出所选 (${selected.length})`
        }
        variantCount={exportVariants.length}
        onExportVariants={
          inGrid && active
            ? () => {
                void exportPhotos(
                  exportVariants.map(({ lut }) => ({
                    ...active,
                    grade: { ...viewGrade, lut },
                  })),
                  {
                    archiveName: "滤镜对比.zip",
                    labels: exportVariants.map(
                      ({ lut, index }) => `槽位${index + 1}-${nameOf(lut)}`,
                    ),
                  },
                );
              }
            : undefined
        }
        onHome={() => selectGroupView("all")}
        onAddPhotos={
          view === "library" ? () => inputRef.current?.click() : undefined
        }
        onDismissError={() => setError("")}
        onOpenSettings={() => setSettingsOpen(true)}
        panels={
          hasPhotos && !isNotFound
            ? { ...panels, onToggle: (side) => togglePanel(view, side) }
            : undefined
        }
        onExport={() =>
          void exportPhotos(
            view === "compare" && active
              ? [{ ...active, grade: viewGrade }]
              : selectedPhotos,
          )
        }
      />

      {isNotFound ? (
        <main className="flex flex-1 flex-col items-center justify-center px-6 text-center">
          <div className="w-full max-w-sm">
            <h1 className="text-3xl font-semibold tracking-tight text-foreground">
              404
            </h1>
            <p className="mt-2 text-sm text-foreground">
              页面不存在或会话数据已清空
            </p>
            <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">
              照片与分组只保存在当前会话中，刷新页面后会重置。
            </p>
            <Button
              className="mt-6"
              size="sm"
              onClick={() => selectGroupView("all")}
            >
              返回首页
            </Button>
          </div>
        </main>
      ) : (
        <div className="flex min-h-0 flex-1">
          {showGroupSidebar && (
            <GroupSidebar
              group={group}
              dragOverGroupId={dragOverGroupId}
              setDragOverGroupId={setDragOverGroupId}
              handleGroupDrop={handleGroupDrop}
              selectGroupView={selectGroupView}
              creatingGroup={creatingGroup}
              setCreatingGroup={setCreatingGroup}
              newGroup={newGroup}
              setNewGroup={setNewGroup}
              createGroup={createGroup}
              deleteGroup={(id) =>
                setGroupToDelete(groups.find((item) => item.id === id) ?? null)
              }
              exportPhotos={exportPhotos}
            />
          )}

          <main className="flex min-w-0 flex-1 flex-col bg-background">
            <WorkspaceToolbar
              view={view}
              group={group}
              currentGroupObj={currentGroupObj}
              visible={visible}
              active={active}
              showLibrary={showLibrary}
              changeGroup={changeGroup}
              mode={mode}
              onModeChange={changeMode}
              setPeekingOriginal={setPeekingOriginal}
              onOpenLightbox={() => setLightbox({ grade: viewGrade })}
              primaryCardKey={primaryCardKey}
              cardView={cardView}
            />

            {photos.length === 0 ? (
              <EmptyLibrary
                busy={!!busy}
                onAddPhotos={() => inputRef.current?.click()}
                onLoadSamples={(samples, all) => void loadSamples(samples, all)}
              />
            ) : view === "library" ? (
              <PhotoGrid
                visible={visible}
                group={group}
                setDraggingPhotoIds={setDraggingPhotoIds}
                openPhoto={openPhoto}
                exportPhotos={exportPhotos}
                applyGradeToIds={applyGradeToIds}
              />
            ) : (
              active && (
                <CompareStage
                  active={active}
                  mode={mode}
                  grade={viewGrade}
                  candidates={candidates}
                  adoptedSlot={gridSlot}
                  setCandidates={setCandidates}
                  cardView={cardView}
                  peekingOriginal={peekingOriginal}
                  onAdoptLut={(lut, slot) => {
                    setAdoptedSlot(lut ? slot : null);
                    applyGradeToIds([active.id], { lut });
                  }}
                  openLightbox={(grade) => setLightbox({ grade })}
                  openPhoto={openPhoto}
                />
              )
            )}
          </main>

          <FilterInspector
            show={showFilterSidebar}
            disabled={inspectorDisabled}
            targetLabel={targetLabel}
            currentLut={viewGrade.lut}
            strength={viewGrade.strength}
            portrait={portraitControl(
              view === "compare" ? (active ? [active] : []) : selectedPhotos,
            )}
            canUndo={canUndo}
            canRedo={canRedo}
            syncCount={
              view === "compare" && active
                ? selected.filter((id) => id !== active.id).length
                : 0
            }
            onSelectLut={(lut) => {
              if (inGrid && lut !== appliedGrade.lut) {
                const existingSlot = candidates.indexOf(lut);
                setAdoptedSlot(
                  lut ? (existingSlot >= 0 ? existingSlot : gridSlot) : null,
                );
              }
              compareAfterEdit(selectLut(lut));
            }}
            onStrengthChange={setDragStrength}
            onStrengthCommit={(value) => {
              compareAfterEdit(commitStrength(value));
              setDragStrength(null);
            }}
            onPortraitChange={(on) => compareAfterEdit(setPortrait(on))}
            onUndo={undo}
            onRedo={redo}
            onSync={() => syncToSelected(appliedGrade)}
          />
        </div>
      )}

      {groupToDelete && (
        <DeleteGroupDialog
          name={groupToDelete.name}
          onCancel={() => setGroupToDelete(null)}
          onConfirm={() => {
            deleteGroup(groupToDelete.id);
            setGroupToDelete(null);
          }}
        />
      )}

      {settingsOpen && (
        <SettingsDialog onClose={() => setSettingsOpen(false)} />
      )}

      {lightbox && active && (
        <PhotoLightbox
          file={active.file}
          grade={lightbox.grade}
          onClose={() => setLightbox(null)}
          onChangeLut={(lut) =>
            setLightbox(
              (current) => current && { grade: { ...current.grade, lut } },
            )
          }
        />
      )}

      {draggingFiles && (
        <div className="pointer-events-none fixed inset-3 z-50 flex items-center justify-center rounded-xl border-2 border-dashed border-foreground/40 bg-background/90 text-sm font-medium text-foreground backdrop-blur-xs">
          松开以导入到当前视图，或拖到左侧分组
        </div>
      )}
    </div>
  );
}
