import type { Dispatch, SetStateAction } from "react";
import { fetchSampleFile, type SamplePhotoMeta } from "@/lib/samples";
import { original, renderImage, resolveExportFormat } from "@/lib/renderer";
import { detectFaces } from "@/lib/portrait";
import type { Photo } from "@/lib/workspace-types";
import { useWorkspaceStore } from "@/stores/workspace";
import { useSettingsStore } from "@/stores/settings";

async function detectPortraits(photos: Photo[]) {
  for (const photo of photos) {
    const faces = await detectFaces(photo.file);
    useWorkspaceStore
      .getState()
      .setFaces(
        photo.id,
        faces.length,
        useSettingsStore.getState().autoPortrait,
      );
  }
}

function download(blob: Blob, name: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function usePhotoFiles({
  group,
  busy,
  setBusy,
  setError,
}: {
  group: string;
  busy: string;
  setBusy: Dispatch<SetStateAction<string>>;
  setError: Dispatch<SetStateAction<string>>;
}) {
  const groups = useWorkspaceStore((s) => s.groups);
  const activeId = useWorkspaceStore((s) => s.activeId);
  const setPhotos = useWorkspaceStore((s) => s.setPhotos);
  const setGroups = useWorkspaceStore((s) => s.setGroups);
  const setActiveId = useWorkspaceStore((s) => s.setActiveId);
  async function importFiles(files: FileList | File[], targetGroupId?: string) {
    const list = Array.from(files);
    if (!list.length) return;
    setBusy("正在导入图片…");
    setError("");
    const assignGroup =
      targetGroupId !== undefined
        ? targetGroupId
        : group === "all" || group === "ungrouped"
          ? ""
          : group;
    const added: Photo[] = [];
    const failed: string[] = [];
    for (const file of list) {
      if (!file.type.startsWith("image/")) {
        failed.push(file.name);
        continue;
      }
      try {
        const image = await createImageBitmap(file);
        const { width, height } = image;
        image.close();
        added.push({
          id: crypto.randomUUID(),
          file,
          width,
          height,
          group: assignGroup,
          grade: { ...original },
        });
      } catch {
        failed.push(file.name);
      }
    }
    setPhotos((prev) => [...prev, ...added]);
    void detectPortraits(added);
    if (!activeId && added[0]) setActiveId(added[0].id);
    if (failed.length) setError(`以下文件无法读取：${failed.join("、")}`);
    setBusy("");
  }

  async function loadSamples(
    items: SamplePhotoMeta[],
    withPresetGroup = false,
  ) {
    if (busy) return;
    setBusy("正在载入示例样片…");
    setError("");
    try {
      let sampleGroupId = group === "all" || group === "ungrouped" ? "" : group;
      if (withPresetGroup && items.length > 1) {
        const existing = groups.find((g) => g.name === "胶片样张");
        if (existing) {
          sampleGroupId = existing.id;
        } else {
          const newId = crypto.randomUUID();
          setGroups((prev) => [...prev, { id: newId, name: "胶片样张" }]);
          sampleGroupId = newId;
        }
      }
      const added: Photo[] = [];
      for (const item of items) {
        const file = await fetchSampleFile(item);
        const image = await createImageBitmap(file);
        const { width, height } = image;
        image.close();
        added.push({
          id: crypto.randomUUID(),
          file,
          width,
          height,
          group: sampleGroupId,
          grade: { ...original },
        });
      }
      setPhotos((prev) => [...prev, ...added]);
      void detectPortraits(added);
      if (!activeId && added[0]) setActiveId(added[0].id);
    } catch (err) {
      setError(err instanceof Error ? err.message : "示例图片加载失败");
    } finally {
      setBusy("");
    }
  }

  async function exportPhotos(
    targets: Photo[],
    options?: { archiveName: string; labels: string[] },
  ) {
    if (!targets.length || busy) return;
    setError("");
    try {
      const zip =
        targets.length > 1 || options
          ? new (await import("jszip")).default()
          : null;
      for (const [i, photo] of targets.entries()) {
        setBusy(`正在处理 ${i + 1} / ${targets.length}…`);
        const { ext } = resolveExportFormat(photo.file);
        const blob = await renderImage(
          photo.file,
          photo.grade,
          undefined,
          true,
        );
        const base =
          photo.file.name
            .replace(/\.[^.]+$/, "")
            .replace(/[\\/:*?"<>|]/g, "_") || "照片";
        if (!zip) {
          download(blob, `${base}-滤镜.${ext}`);
          break;
        }
        const label = options?.labels[i]?.replace(/[\\/:*?"<>|]/g, "_");
        zip.file(
          `${String(i + 1).padStart(3, "0")}-${base}${label ? `-${label}` : ""}.${ext}`,
          blob,
        );
      }
      if (zip) {
        setBusy("正在打包照片…");
        download(
          await zip.generateAsync({ type: "blob" }),
          options?.archiveName ?? "滤镜照片.zip",
        );
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "导出失败，请重试");
    } finally {
      setBusy("");
    }
  }

  return { importFiles, loadSamples, exportPhotos };
}
