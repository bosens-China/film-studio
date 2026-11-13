import { create } from "zustand";
import type { Dispatch, SetStateAction } from "react";
import type { Group, Photo } from "@/lib/workspace-types";
import type { Grade } from "@/lib/renderer";

type GradeChange = {
  id: string;
  before: Partial<Grade>;
  after: Partial<Grade>;
};

const historyLimit = 100;

type WorkspaceState = {
  photos: Photo[];
  groups: Group[];
  selected: string[];
  activeId: string;
  past: GradeChange[][];
  future: GradeChange[][];
  setPhotos: Dispatch<SetStateAction<Photo[]>>;
  setGroups: Dispatch<SetStateAction<Group[]>>;
  setSelected: Dispatch<SetStateAction<string[]>>;
  setActiveId: Dispatch<SetStateAction<string>>;
  selectPhoto: (id: string) => void;
  assignPhotosToGroup: (ids: string[], groupId: string) => void;
  removePhotos: (ids: string[]) => void;
  removeGroup: (id: string) => void;
  applyGrade: (ids: string[], patch: Partial<Grade>) => boolean;
  setFaces: (id: string, faces: number, autoPortrait: boolean) => void;
  undo: () => void;
  redo: () => void;
};

function restore(
  photos: Photo[],
  changes: GradeChange[],
  key: "before" | "after",
) {
  const byId = new Map(changes.map((change) => [change.id, change[key]]));
  return photos.map((photo) => {
    const grade = byId.get(photo.id);
    return grade ? { ...photo, grade: { ...photo.grade, ...grade } } : photo;
  });
}

export const useWorkspaceStore = create<WorkspaceState>()((set) => ({
  photos: [],
  groups: [],
  selected: [],
  activeId: "",
  past: [],
  future: [],
  setPhotos: (value) =>
    set((s) => ({
      photos: typeof value === "function" ? value(s.photos) : value,
    })),
  setGroups: (value) =>
    set((s) => ({
      groups: typeof value === "function" ? value(s.groups) : value,
    })),
  setSelected: (value) =>
    set((s) => ({
      selected: typeof value === "function" ? value(s.selected) : value,
    })),
  setActiveId: (value) =>
    set((s) => ({
      activeId: typeof value === "function" ? value(s.activeId) : value,
    })),
  selectPhoto: (id) =>
    set((s) => ({
      selected: s.selected.includes(id)
        ? s.selected.filter((item) => item !== id)
        : [...s.selected, id],
    })),
  assignPhotosToGroup: (ids, groupId) =>
    set((s) => ({
      photos: s.photos.map((photo) =>
        ids.includes(photo.id) ? { ...photo, group: groupId } : photo,
      ),
    })),
  removePhotos: (ids) =>
    set((s) => ({
      photos: s.photos.filter((photo) => !ids.includes(photo.id)),
      selected: s.selected.filter((id) => !ids.includes(id)),
      activeId: ids.includes(s.activeId) ? "" : s.activeId,
    })),
  applyGrade: (ids, patch) => {
    let changed = false;
    set((s) => {
      const changes: GradeChange[] = [];
      const photos = s.photos.map((photo) => {
        if (!ids.includes(photo.id)) return photo;
        const after = { ...photo.grade, ...patch };
        const fields = (Object.keys(patch) as (keyof Grade)[]).filter(
          (key) => after[key] !== photo.grade[key],
        );
        if (!fields.length) return photo;
        changes.push({
          id: photo.id,
          before: Object.fromEntries(
            fields.map((key) => [key, photo.grade[key]]),
          ),
          after: Object.fromEntries(fields.map((key) => [key, after[key]])),
        });
        return {
          ...photo,
          grade: after,
          portraitTouched: photo.portraitTouched || "portrait" in patch,
        };
      });
      if (!changes.length) return {};
      changed = true;
      return {
        photos,
        past: [...s.past, changes].slice(-historyLimit),
        future: [],
      };
    });
    return changed;
  },
  setFaces: (id, faces, autoPortrait) =>
    set((s) => ({
      photos: s.photos.map((photo) =>
        photo.id !== id
          ? photo
          : {
              ...photo,
              faces,
              grade:
                autoPortrait && faces > 0 && !photo.portraitTouched
                  ? { ...photo.grade, portrait: true }
                  : photo.grade,
            },
      ),
    })),
  undo: () =>
    set((s) => {
      const changes = s.past.at(-1);
      if (!changes) return {};
      return {
        photos: restore(s.photos, changes, "before"),
        past: s.past.slice(0, -1),
        future: [...s.future, changes],
      };
    }),
  redo: () =>
    set((s) => {
      const changes = s.future.at(-1);
      if (!changes) return {};
      return {
        photos: restore(s.photos, changes, "after"),
        past: [...s.past, changes],
        future: s.future.slice(0, -1),
      };
    }),
  removeGroup: (id) =>
    set((s) => ({
      groups: s.groups.filter((group) => group.id !== id),
      photos: s.photos.map((photo) =>
        photo.group === id ? { ...photo, group: "" } : photo,
      ),
    })),
}));
