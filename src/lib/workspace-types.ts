import type { Grade } from "./renderer";

export type Photo = {
  id: string;
  file: File;
  width: number;
  height: number;
  group: string;
  grade: Grade;
  /** Usable faces found on import; undefined while detection is running. */
  faces?: number;
  /** The user has set portrait retouching explicitly, so auto-enable must not override it. */
  portraitTouched?: boolean;
};
export type Group = { id: string; name: string };
export type CompareMode = "single" | "side" | "grid";
export type CardTransform = { zoom: number; pan: { x: number; y: number } };
