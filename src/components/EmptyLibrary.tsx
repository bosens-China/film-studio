import { Sparkles, Upload } from "lucide-react";
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
      <div className="grid w-full max-w-4xl grid-cols-1 gap-6 lg:grid-cols-12">
        {/* Left: Dropzone */}
        <button
          onClick={onAddPhotos}
          className="group flex flex-col items-center justify-center rounded-xl border border-dashed border-border bg-card/50 p-8 text-center transition hover:border-foreground/30 hover:bg-card lg:col-span-7"
        >
          <span className="mb-4 flex size-12 items-center justify-center rounded-lg border border-border bg-secondary text-foreground transition group-hover:scale-105">
            <Upload size={20} />
          </span>
          <span className="text-base font-semibold text-foreground">
            从照片开始，发现不一样的色彩
          </span>
          <span className="mt-1.5 text-xs text-muted-foreground">
            拖拽图片到这里，或点击选择多张照片
          </span>
          <span className="mt-5 inline-flex h-8 items-center rounded-md bg-primary px-4 text-xs font-medium text-primary-foreground">
            添加照片
          </span>
          <span className="mt-4 text-[11px] text-muted-foreground/70">
            支持常见图片格式 · 图片不会上传
          </span>
        </button>

        {/* Right: Instant Sample Photos */}
        <div className="flex flex-col justify-between rounded-xl border border-border bg-card p-5 lg:col-span-5">
          <div>
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-1.5 text-xs font-semibold text-foreground">
                <Sparkles size={14} className="text-amber-400" />
                没有手头照片？试试内置胶片样张
              </span>
              <span className="text-[11px] text-muted-foreground">
                4 张高清样片
              </span>
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              一键载入人像、街拍与风光样片，立即体验分组管理、批量调色与 2×2
              网格对比。
            </p>

            <div className="mt-4 grid grid-cols-2 gap-2.5">
              {samplePhotos.map((sample) => (
                <button
                  key={sample.id}
                  onClick={() => void onLoadSamples([sample], false)}
                  disabled={!!busy}
                  className="group relative aspect-[4/3] overflow-hidden rounded-lg border border-border bg-muted text-left"
                >
                  <img
                    src={sample.url}
                    alt={sample.title}
                    className="h-full w-full object-cover transition duration-300 group-hover:scale-105"
                  />
                  <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent p-2">
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
          </div>

          <Button
            variant="secondary"
            className="mt-4 w-full"
            disabled={!!busy}
            onClick={() => void onLoadSamples(samplePhotos, true)}
          >
            <Sparkles size={14} />
            一键载入全部 4 张示例样张
          </Button>
        </div>
      </div>
    </div>
  );
}
