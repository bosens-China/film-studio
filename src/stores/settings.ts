import { create } from "zustand";
import { persist } from "zustand/middleware";

export type PanelSide = "left" | "right";
export type PanelView = "library" | "compare";
type Panels = Record<PanelView, Record<PanelSide, boolean>>;

type SettingsState = {
  autoPortrait: boolean;
  setAutoPortrait: (value: boolean) => void;
  panels: Panels;
  togglePanel: (view: PanelView, side: PanelSide) => void;
};

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      autoPortrait: true,
      setAutoPortrait: (autoPortrait) => set({ autoPortrait }),
      panels: {
        library: { left: true, right: true },
        compare: { left: false, right: true },
      },
      togglePanel: (view, side) =>
        set((state) => ({
          panels: {
            ...state.panels,
            [view]: {
              ...state.panels[view],
              [side]: !state.panels[view][side],
            },
          },
        })),
    }),
    { name: "film-studio-settings" },
  ),
);
