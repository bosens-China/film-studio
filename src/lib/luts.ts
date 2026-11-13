import { lutLabel } from "./lut-labels";
import manifest from "./luts.json";

const assets = import.meta.glob("../../film-emulator-luts/**/*.png", {
  eager: true,
  query: "?url",
  import: "default",
}) as Record<string, string>;

export const luts = manifest.map((item) => ({
  ...item,
  id: item.path,
  url: assets[`../../film-emulator-luts/${item.path}`],
}));
export const lutById = new Map(luts.map((lut) => [lut.id, lut]));

export const categories = [...new Set(luts.map((lut) => lut.group))];
export const nameOf = (id: string) => {
  const name = lutById.get(id)?.name;
  return name ? lutLabel(name) : "原图";
};
