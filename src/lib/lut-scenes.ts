export type LutScene = "all" | "portrait" | "landscape" | "general";

export const sceneLabels: Record<LutScene, string> = {
  all: "全部场景",
  portrait: "人像",
  landscape: "风景",
  general: "通用",
};

const generalIds = new Set([
  "Fuji Series/Provia.png",
  "Fuji Series/Astia.png",
  "Fuji Series/Classic Chrome.png",
  "Fuji Series/Classic Neg.png",
  "Fuji Series/Reala Ace.png",
  "Various/Natural Vivid.png",
]);

export function matchesScene(
  lut: { id: string; group: string; name: string },
  scene: LutScene,
) {
  if (scene === "all") return true;
  if (scene === "portrait") {
    return (
      lut.group === "ON1 Portrait" ||
      lut.name.includes("Portrait") ||
      lut.name === "Studio Skin Tone Shaper"
    );
  }
  if (scene === "landscape") {
    return (
      lut.group === "ON1 Landscape" ||
      lut.group === "ON1 Nature & Wildlife" ||
      lut.name === "Lush Nature" ||
      lut.id === "Fuji Series/Velvia.png"
    );
  }
  return generalIds.has(lut.id);
}
