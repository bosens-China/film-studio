import { useEffect, useRef, useState, type ChangeEvent } from "react";
import { Button } from "@/components/ui/button";
import { useNavigate, useRouterState } from "@tanstack/react-router";
import { PhotoLightbox } from "@/components/PhotoLightbox";
import { FilterInspector } from "@/components/FilterInspector";
import { EmptyLibrary } from "@/components/EmptyLibrary";
import { GroupSidebar } from "@/components/GroupSidebar";
import { PhotoGrid } from "@/components/PhotoGrid";
import { CompareStage } from "@/components/CompareStage";
import { WorkspaceToolbar } from "@/components/WorkspaceToolbar";
import { WorkbenchHeader } from "@/components/WorkbenchHeader";
import { DeleteGroupDialog } from "@/components/DeleteGroupDialog";
import { original, type Grade } from "@/lib/renderer";
import { nameOf } from "@/lib/luts";

import type { Photo, CompareMode } from "@/lib/workspace-types";
import { useWorkspaceStore } from "@/stores/workspace";
import { useCardView } from "@/hooks/useCardView";
import { usePhotoFiles } from "@/hooks/usePhotoFiles";
import { usePhotoGrade } from "@/hooks/usePhotoGrade";
import { usePhotoDrag } from "@/hooks/usePhotoDrag";
import { useGroupActions } from "@/hooks/useGroupActions";

const initialCandidates = [
  "Fuji Series/Classic Chrome.png",
  "Negative New/Portrait 400.png",
  "Fuji Series/Velvia.png",
];

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

  const [mode, setMode] = useState<CompareMode>("single");
  const [draft, setDraft] = useState<Grade>(original);
  const [batchPreview, setBatchPreview] = useState<{
    selection: string;
    grade: Grade;
  } | null>(null);
  const [candidates, setCandidates] = useState(initialCandidates);
  const [activeSlot, setActiveSlot] = useState<number>(0);
  const [sideActiveIndex, setSideActiveIndex] = useState<0 | 1>(1);
  const [gridActiveIndex, setGridActiveIndex] = useState<number>(1);

  const cardView = useCardView();
  const { setViewZoom, setCardTransforms } = cardView;
  const [peekingOriginal, setPeekingOriginal] = useState(false);
  const [lightbox, setLightbox] = useState<{ lut: string } | null>(null);

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
  const currentGroupObj = groups.find((g) => g.id === group);
  const previewingSelection =
    view === "library" &&
    selected.length > 0 &&
    batchPreview?.selection === selected.join("\0");
  const currentDraft =
    view === "library"
      ? previewingSelection
        ? batchPreview!.grade
        : (photos.find((photo) => photo.id === selected[0])?.grade ?? draft)
      : draft;
  const targetDescription =
    view === "compare"
      ? active
        ? `当前照片 · ${active.file.name}`
        : "未选择照片"
      : `已勾选 ${selected.length} 张照片`;

  // In 2x2 grid mode, the right filter list's active state is synchronized with the focused slot's filter!
  const currentInspectorLut =
    view === "compare" && mode === "grid"
      ? (candidates[activeSlot] ?? "")
      : currentDraft.lut;

  const exportVariants = candidates
    .map((lut, index) => ({ lut, index }))
    .filter(({ lut }) => lut !== "");

  const activeCardKey =
    mode === "single"
      ? "single"
      : mode === "side"
        ? `side-${sideActiveIndex}`
        : `grid-${gridActiveIndex}`;

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
      // oxlint-disable-next-line react/set-state-in-effect
      setDraft({ ...photo.grade });
      setViewZoom(1);
      setCardTransforms({});
      setLightbox(null);
    }
  }, [routeId, photos, setActiveId, setViewZoom, setCardTransforms]);

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
    setDraft(
      view === "library" && previewingSelection && selected.includes(photo.id)
        ? { ...batchPreview!.grade }
        : { ...photo.grade },
    );
    lastRouteId.current = photo.id;
    setViewZoom(1);
    setCardTransforms({});
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

  const { applyGradeToIds, apply, handleSelectLut, handleStrengthChange } =
    usePhotoGrade({
      view,
      mode,
      draft: currentDraft,
      setDraft,
      activeSlot,
      currentInspectorLut,
      setGridActiveIndex,
      setCandidates,
      setDirty,
      setBatchPreview,
    });

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

  function openLightboxForLut(lutId: string) {
    setLightbox({ lut: lutId });
  }

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

  const onFile = (event: ChangeEvent<HTMLInputElement>) => {
    if (event.target.files) void importFiles(event.target.files);
    event.target.value = "";
  };

  const showFilterSidebar =
    (view === "compare" && !!active) ||
    (view === "library" && selected.length > 0);

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
          view === "compare" ? "导出当前视图" : `导出所选 (${selected.length})`
        }
        variantCount={exportVariants.length}
        onExportVariants={
          view === "compare" && mode === "grid" && active
            ? () => {
                void exportPhotos(
                  exportVariants.map(({ lut }) => ({
                    ...active,
                    grade: { lut, strength: draft.strength },
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
        onAddPhotos={() => inputRef.current?.click()}
        onDismissError={() => setError("")}
        onExport={() =>
          void exportPhotos(
            view === "compare" && active
              ? [
                  {
                    ...active,
                    grade: {
                      lut:
                        (mode === "grid" && gridActiveIndex === 0) ||
                        (mode === "side" && sideActiveIndex === 0)
                          ? ""
                          : mode === "grid"
                            ? currentInspectorLut
                            : draft.lut,
                      strength: draft.strength,
                    },
                  },
                ]
              : photos.filter((p) => selected.includes(p.id)),
          )
        }
      />

      {/* Main 3-Column Full-Width Studio Area or 404 Page */}
      {isNotFound ? (
        <main className="flex flex-1 flex-col items-center justify-center px-6 text-center">
          <div className="w-full max-w-md rounded-xl border border-border bg-card p-8 shadow-sm">
            <div className="mx-auto mb-3 inline-flex rounded-md border border-border bg-secondary px-2.5 py-1 text-xs font-semibold tracking-widest text-muted-foreground">
              404 NOT FOUND
            </div>
            <h1 className="text-3xl font-bold tracking-tight text-foreground">
              404
            </h1>
            <p className="mt-2 text-sm font-medium text-foreground">
              页面不存在或会话数据已清空
            </p>
            <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">
              你访问的分组、照片详情或页面地址不存在。本地编辑的照片与分组仅保存在当前会话中，刷新页面后将会重置。
            </p>
            <Button className="mt-6" onClick={() => selectGroupView("all")}>
              返回首页
            </Button>
          </div>
        </main>
      ) : (
        <div className="flex min-h-0 flex-1">
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

          {/* Center Workspace: Full-Width Grid or Compare Stage */}
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
              setMode={setMode}
              draft={draft}
              candidates={candidates}
              setCandidates={setCandidates}
              activeSlot={activeSlot}
              setPeekingOriginal={setPeekingOriginal}
              openLightboxForLut={openLightboxForLut}
              gridActiveIndex={gridActiveIndex}
              sideActiveIndex={sideActiveIndex}
              cardView={cardView}
            />

            {/* Main Stage Body */}
            {photos.length === 0 ? (
              <EmptyLibrary
                busy={!!busy}
                onAddPhotos={() => inputRef.current?.click()}
                onLoadSamples={(samples, all) => void loadSamples(samples, all)}
              />
            ) : view === "library" ? (
              <PhotoGrid
                visible={visible}
                previewGrade={previewingSelection ? batchPreview!.grade : null}
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
                  draft={draft}
                  setDraft={setDraft}
                  candidates={candidates}
                  setCandidates={setCandidates}
                  activeCardKey={activeCardKey}
                  cardView={cardView}
                  peekingOriginal={peekingOriginal}
                  setSideActiveIndex={setSideActiveIndex}
                  setGridActiveIndex={setGridActiveIndex}
                  setActiveSlot={setActiveSlot}
                  setDirty={setDirty}
                  openLightboxForLut={openLightboxForLut}
                  openPhoto={openPhoto}
                />
              )
            )}
          </main>

          <FilterInspector
            show={showFilterSidebar}
            view={view}
            mode={mode}
            activeId={active?.id}
            selected={selected}
            visibleIds={visible.map((photo) => photo.id)}
            hasCurrentGroup={!!currentGroupObj}
            targetDescription={targetDescription}
            previewPending={
              view === "library"
                ? previewingSelection
                : !!active &&
                  (active.grade.lut !== currentInspectorLut ||
                    active.grade.strength !== draft.strength)
            }
            currentInspectorLut={currentInspectorLut}
            strength={currentDraft.strength}
            gridActiveIndex={gridActiveIndex}
            onSlotChange={(slot) => {
              setActiveSlot(slot);
              setGridActiveIndex(slot + 1);
              const slotLut = candidates[slot] ?? "";
              setDraft((d) => ({ ...d, lut: slotLut }));
            }}
            handleSelectLut={handleSelectLut}
            handleStrengthChange={handleStrengthChange}
            apply={apply}
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

      {lightbox && active && (
        <PhotoLightbox
          file={active.file}
          strength={draft.strength}
          lightbox={lightbox}
          onClose={() => setLightbox(null)}
          onChangeLut={(lut) => setLightbox({ lut })}
        />
      )}

      {/* Drag Overlay */}
      {draggingFiles && (
        <div className="pointer-events-none fixed inset-3 z-50 flex items-center justify-center rounded-xl border-2 border-dashed border-foreground/40 bg-background/90 text-base font-medium text-foreground backdrop-blur-xs">
          松开鼠标以导入照片到当前视图（或拖入左侧指定分组）
        </div>
      )}
    </div>
  );
}
