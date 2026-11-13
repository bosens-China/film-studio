import type { Grade } from "./renderer";

export type Photo = { id: string; file: File; group: string; grade: Grade };
export type Group = { id: string; name: string };
export type CompareMode = "single" | "side" | "grid";
export type CardTransform = { zoom: number; pan: { x: number; y: number } };
