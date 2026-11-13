import { create } from "zustand";
import type { Dispatch, SetStateAction } from "react";
import type { Group, Photo } from "@/lib/workspace-types";
import type { Grade } from "@/lib/renderer";

type WorkspaceState = {
  photos: Photo[];
  groups: Group[];
  selected: string[];
  activeId: string;
  setPhotos: Dispatch<SetStateAction<Photo[]>>;
  setGroups: Dispatch<SetStateAction<Group[]>>;
  setSelected: Dispatch<SetStateAction<string[]>>;
  setActiveId: Dispatch<SetStateAction<string>>;
  selectPhoto: (id: string) => void;
  assignPhotosToGroup: (ids: string[], groupId: string) => void;
  removePhotos: (ids: string[]) => void;
  removeGroup: (id: string) => void;
  applyGrade: (ids: string[], grade: Grade) => void;
};

export const useWorkspaceStore = create<WorkspaceState>()((set) => ({
  photos: [],
  groups: [],
  selected: [],
  activeId: "",
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
  applyGrade: (ids, grade) =>
    set((s) => ({
      photos: s.photos.map((photo) =>
        ids.includes(photo.id) ? { ...photo, grade: { ...grade } } : photo,
      ),
    })),
  removeGroup: (id) =>
    set((s) => ({
      groups: s.groups.filter((group) => group.id !== id),
      photos: s.photos.map((photo) =>
        photo.group === id ? { ...photo, group: "" } : photo,
      ),
    })),
}));
