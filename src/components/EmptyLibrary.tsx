import { Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { samplePhotos, type SamplePhotoMeta } from "@/lib/samples";

export function EmptyLibrary({
  busy,
  onAddPhotos,
  onLoadSamples,
}: {
  busy: boolean;
  onAddPhotos: () => void;
  onLoadSamples: (samples: SamplePhotoMeta[], all: boolean) => void;
}) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center overflow-y-auto p-6">
      <div className="grid w-full max-w-4xl grid-cols-1 gap-4 lg:grid-cols-12">
        <button
          onClick={onAddPhotos}
          className="group flex flex-col items-center justify-center rounded-lg border border-dashed border-border p-8 text-center transition-colors hover:border-foreground/30 hover:bg-card/60 lg:col-span-7"
        >
          <Upload size={20} className="mb-3 text-muted-foreground" />
          <span className="text-sm font-medium text-foreground">导入照片</span>
          <span className="mt-1 text-xs text-muted-foreground">
            拖放图片到此处，或点击选择文件
          </span>
          <span className="mt-4 text-[11px] text-muted-foreground/70">
            照片只在本地处理，不会上传
          </span>
        </button>

        <div className="flex flex-col rounded-lg border border-border p-4 lg:col-span-5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-foreground">
              示例样张
            </span>
            <span className="text-[11px] text-muted-foreground">
              人像 · 街拍 · 风光
            </span>
          </div>
          <div className="mt-3 grid grid-cols-2 gap-2">
            {samplePhotos.map((sample) => (
              <button
                key={sample.id}
                onClick={() => void onLoadSamples([sample], false)}
                disabled={!!busy}
                className="group relative aspect-[4/3] overflow-hidden rounded-md border border-border bg-muted text-left"
              >
                <img
                  src={sample.url}
                  alt={sample.title}
                  className="h-full w-full object-cover opacity-90 transition-opacity group-hover:opacity-100"
                />
                <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/75 to-transparent px-2 pt-4 pb-1.5">
                  <div className="text-[11px] font-medium text-white">
                    {sample.title}
                  </div>
                  <div className="text-[10px] text-zinc-300">
                    {sample.category}
                  </div>
                </div>
              </button>
            ))}
          </div>
          <Button
            variant="secondary"
            size="sm"
            className="mt-3 w-full"
            disabled={!!busy}
            onClick={() => void onLoadSamples(samplePhotos, true)}
          >
            载入全部 {samplePhotos.length} 张示例
          </Button>
        </div>
      </div>
    </div>
  );
}
