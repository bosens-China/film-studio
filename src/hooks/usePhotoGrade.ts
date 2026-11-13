import type { Dispatch, SetStateAction } from "react";
import type { Grade } from "@/lib/renderer";
import type { CompareMode } from "@/lib/workspace-types";
import { useWorkspaceStore } from "@/stores/workspace";

/** Grid slot that receives a newly chosen filter: the adopted one, else the first empty one. */
export function slotFor(candidates: string[], appliedLut: string) {
  const adopted = appliedLut ? candidates.indexOf(appliedLut) : -1;
  if (adopted >= 0) return adopted;
  const empty = candidates.indexOf("");
  return empty >= 0 ? empty : 0;
}

export function usePhotoGrade({
  view,
  mode,
  activeId,
  gridSlot,
  setCandidates,
  setDirty,
}: {
  view: "library" | "compare";
  mode: CompareMode;
  activeId: string;
  gridSlot: number;
  setCandidates: Dispatch<SetStateAction<string[]>>;
  setDirty: Dispatch<SetStateAction<boolean>>;
}) {
  const selected = useWorkspaceStore((s) => s.selected);
  const photos = useWorkspaceStore((s) => s.photos);
  const applyGrade = useWorkspaceStore((s) => s.applyGrade);
  const targets =
    view === "library" ? selected : activeId ? [activeId] : ([] as string[]);

  function applyGradeToIds(ids: string[], patch: Partial<Grade>) {
    const changed = ids.length > 0 && applyGrade(ids, patch);
    if (changed) setDirty(true);
    return changed;
  }

  function selectLut(lut: string) {
    if (view === "compare" && mode === "grid" && lut) {
      setCandidates((prev) => {
        if (prev.includes(lut)) return prev;
        return prev.map((c, i) => (i === gridSlot ? lut : c));
      });
    }
    return applyGradeToIds(targets, { lut });
  }

  function commitStrength(strength: number) {
    return applyGradeToIds(targets, { strength });
  }

  function setPortrait(portrait: boolean) {
    return applyGradeToIds(
      portrait
        ? targets.filter((id) => photos.find((p) => p.id === id)?.faces)
        : targets,
      { portrait },
    );
  }

  function syncToSelected(grade: Grade) {
    applyGradeToIds(
      selected.filter((id) => id !== activeId),
      grade,
    );
  }

  return {
    applyGradeToIds,
    selectLut,
    commitStrength,
    setPortrait,
    syncToSelected,
  };
}
