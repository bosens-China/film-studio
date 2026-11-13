import { PhotoPreview } from "@/components/PhotoPreview";
import type { Photo } from "@/lib/workspace-types";
import { useWorkspaceStore } from "@/stores/workspace";

export function PhotoFilmstrip({
  activeId,
  openPhoto,
}: {
  activeId: string;
  openPhoto: (photo: Photo) => void;
}) {
  const photos = useWorkspaceStore((s) => s.photos);
  const selected = useWorkspaceStore((s) => s.selected);
  const selectPhoto = useWorkspaceStore((s) => s.selectPhoto);
  return (
    <div className="flex h-24 shrink-0 items-center gap-2.5 overflow-x-auto border-t border-border bg-sidebar px-5">
      {photos.map((p) => (
        <div
          key={p.id}
          className={`relative h-16 w-24 shrink-0 overflow-hidden rounded-md border-2 transition ${
            p.id === activeId
              ? "border-foreground"
              : "border-transparent opacity-70 hover:opacity-100"
          }`}
        >
          <button
            aria-label={`查看 ${p.file.name}`}
            onClick={() => openPhoto(p)}
            className="h-full w-full"
          >
            <PhotoPreview
              file={p.file}
              grade={p.grade}
              maxSide={240}
              className="h-full w-full object-cover"
            />
          </button>
          <label className="absolute top-0 right-0 flex size-8 cursor-pointer items-center justify-center">
            <input
              type="checkbox"
              aria-label={`选择 ${p.file.name}`}
              checked={selected.includes(p.id)}
              onChange={() => selectPhoto(p.id)}
              className="size-4 cursor-pointer accent-primary"
            />
          </label>
        </div>
      ))}
    </div>
  );
}
