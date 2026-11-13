import { Download, ImagePlus, Images, ShieldCheck, X } from "lucide-react";
import { Button } from "@/components/ui/button";

export function WorkbenchHeader({
  isNotFound,
  busy,
  error,
  exportDisabled,
  exportLabel,
  onHome,
  onAddPhotos,
  onExport,
  onExportVariants,
  variantCount,
  onDismissError,
}: {
  isNotFound: boolean;
  busy: string;
  error: string;
  exportDisabled: boolean;
  exportLabel: string;
  onHome: () => void;
  onAddPhotos: () => void;
  onExport: () => void;
  onExportVariants?: () => void;
  variantCount: number;
  onDismissError: () => void;
}) {
  return (
    <>
      <header className="flex h-13 shrink-0 items-center justify-between border-b border-border bg-sidebar px-4">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onHome}
            className="flex items-center gap-3 text-left transition hover:opacity-85"
          >
            <div className="flex size-7 items-center justify-center rounded-md border border-border bg-secondary text-foreground">
              <Images size={15} />
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-sm font-semibold tracking-tight">
                拾光滤镜
              </span>
              <span className="text-[10px] font-medium tracking-widest text-muted-foreground uppercase">
                FILM STUDIO
              </span>
            </div>
          </button>
          <div className="ml-2 hidden items-center gap-1.5 rounded-full border border-border bg-background/60 px-2.5 py-0.5 text-xs text-muted-foreground sm:flex">
            <ShieldCheck size={12} className="text-emerald-400" />
            <span>照片仅在本地处理 · 刷新即清空</span>
          </div>
        </div>

        {!isNotFound && (
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={onAddPhotos}>
              <ImagePlus size={14} /> 添加照片
            </Button>
            {onExportVariants && (
              <Button
                variant="outline"
                size="sm"
                disabled={!!busy || variantCount === 0}
                onClick={onExportVariants}
              >
                导出全部滤镜 ZIP ({variantCount})
              </Button>
            )}
            <Button size="sm" disabled={exportDisabled} onClick={onExport}>
              <Download size={14} />
              {exportLabel}
            </Button>
          </div>
        )}
      </header>

      {/* Alert & Status Banners */}
      {error && (
        <div
          role="alert"
          className="flex items-center justify-between border-b border-destructive/30 bg-destructive/15 px-4 py-1.5 text-xs text-destructive"
        >
          <span>{error}</span>
          <Button
            variant="ghost"
            size="icon-xs"
            aria-label="关闭提示"
            onClick={onDismissError}
          >
            <X size={14} />
          </Button>
        </div>
      )}
      {busy && (
        <div
          role="status"
          className="border-b border-border bg-secondary px-4 py-1.5 text-xs text-foreground"
        >
          {busy}
        </div>
      )}
    </>
  );
}
