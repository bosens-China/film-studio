import { useState, type DragEvent } from "react";

export function usePhotoDrag(
  importFiles: (files: FileList | File[], groupId?: string) => Promise<void>,
  assignPhotosToGroup: (ids: string[], groupId: string) => void,
) {
  const [draggingFiles, setDraggingFiles] = useState(false);
  const [draggingPhotoIds, setDraggingPhotoIds] = useState<string[]>([]);
  const [dragOverGroupId, setDragOverGroupId] = useState<string | null>(null);
  function handleGlobalDragOver(event: DragEvent) {
    event.preventDefault();
    if (event.dataTransfer.types.includes("Files")) {
      setDraggingFiles(true);
    }
  }

  function handleGlobalDrop(event: DragEvent) {
    event.preventDefault();
    setDraggingFiles(false);
    setDragOverGroupId(null);
    if (event.dataTransfer.files?.length) {
      void importFiles(event.dataTransfer.files);
    }
  }

  function handleGroupDrop(event: DragEvent, targetGroupId: string) {
    event.preventDefault();
    event.stopPropagation();
    setDragOverGroupId(null);
    setDraggingFiles(false);
    if (event.dataTransfer.files?.length) {
      void importFiles(event.dataTransfer.files, targetGroupId);
      return;
    }
    if (draggingPhotoIds.length > 0) {
      assignPhotosToGroup(draggingPhotoIds, targetGroupId);
      setDraggingPhotoIds([]);
    }
  }

  return {
    draggingFiles,
    setDraggingFiles,
    setDraggingPhotoIds,
    dragOverGroupId,
    setDragOverGroupId,
    handleGlobalDragOver,
    handleGlobalDrop,
    handleGroupDrop,
  };
}
