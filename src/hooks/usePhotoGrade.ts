import type { Dispatch, SetStateAction } from "react";
import type { Grade } from "@/lib/renderer";
import type { CompareMode } from "@/lib/workspace-types";
import { useWorkspaceStore } from "@/stores/workspace";

export function usePhotoGrade({
  view,
  mode,
  draft,
  setDraft,
  activeSlot,
  currentInspectorLut,
  setGridActiveIndex,
  setCandidates,
  setDirty,
  setBatchPreview,
}: {
  view: "library" | "compare";
  mode: CompareMode;
  draft: Grade;
  setDraft: Dispatch<SetStateAction<Grade>>;
  activeSlot: number;
  currentInspectorLut: string;
  setGridActiveIndex: Dispatch<SetStateAction<number>>;
  setCandidates: Dispatch<SetStateAction<string[]>>;
  setDirty: Dispatch<SetStateAction<boolean>>;
  setBatchPreview: Dispatch<
    SetStateAction<{ selection: string; grade: Grade } | null>
  >;
}) {
  const selected = useWorkspaceStore((s) => s.selected);
  const applyGrade = useWorkspaceStore((s) => s.applyGrade);
  function applyGradeToIds(ids: string[], nextGrade: Grade) {
    if (!ids.length) return;
    applyGrade(ids, nextGrade);
    setDirty(true);
  }

  function apply(ids: string[]) {
    const effectiveLut =
      view === "compare" && mode === "grid" ? currentInspectorLut : draft.lut;
    const gradeToApply: Grade = { lut: effectiveLut, strength: draft.strength };
    setDraft(gradeToApply);
    applyGradeToIds(ids, gradeToApply);
    if (selected.length > 0 && selected.every((id) => ids.includes(id)))
      setBatchPreview(null);
  }

  function handleSelectLut(lutId: string) {
    const nextGrade: Grade = { ...draft, lut: lutId };
    setDraft(nextGrade);

    setDirty(true);
    if (view === "compare" && mode === "grid") {
      setGridActiveIndex(activeSlot + 1);
      setCandidates((prev) =>
        prev.map((c, idx) => (idx === activeSlot ? lutId : c)),
      );
    } else if (view === "library") {
      setBatchPreview({ selection: selected.join("\0"), grade: nextGrade });
    }
  }

  function handleStrengthChange(nextStrength: number) {
    const nextGrade: Grade = {
      lut: currentInspectorLut,
      strength: nextStrength,
    };
    setDraft(nextGrade);
    setDirty(true);
    if (view === "library")
      setBatchPreview({ selection: selected.join("\0"), grade: nextGrade });
  }

  return { applyGradeToIds, apply, handleSelectLut, handleStrengthChange };
}
