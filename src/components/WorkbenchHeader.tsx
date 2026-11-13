import {
  ChevronDown,
  Download,
  ImagePlus,
  PanelLeft,
  PanelRight,
  Settings,
  X,
} from "lucide-react";
import { AppLogo } from "@/components/AppLogo";
import { Button } from "@/components/ui/button";
import { Menu, MenuContent, MenuItem, MenuTrigger } from "@/components/ui/menu";
import type { PanelSide } from "@/stores/settings";

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
  onOpenSettings,
  panels,
}: {
  isNotFound: boolean;
  busy: string;
  error: string;
  exportDisabled: boolean;
  exportLabel: string;
  onHome: () => void;
  onAddPhotos?: () => void;
  onExport: () => void;
  onExportVariants?: () => void;
  variantCount: number;
  onDismissError: () => void;
  onOpenSettings: () => void;
  panels?: {
    left: boolean;
    right: boolean;
    onToggle: (side: PanelSide) => void;
  };
}) {
  return (
    <>
      <header className="flex h-12 shrink-0 items-center justify-between border-b border-border bg-sidebar px-4">
        <button
          type="button"
          onClick={onHome}
          className="flex items-center gap-2.5 text-left transition hover:opacity-85"
        >
          <AppLogo size={20} className="shrink-0" />
          <span className="text-sm font-semibold tracking-tight">拾光滤镜</span>
        </button>

        <div className="flex items-center gap-2">
          {!isNotFound && (
            <>
              {onAddPhotos && (
                <Button variant="ghost" size="sm" onClick={onAddPhotos}>
                  <ImagePlus size={14} /> 添加照片
                </Button>
              )}
              <div className="flex items-center">
                <Button
                  size="sm"
                  disabled={exportDisabled}
                  onClick={onExport}
                  className={onExportVariants ? "rounded-r-none" : undefined}
                >
                  <Download size={14} />
                  {exportLabel}
                </Button>
                {onExportVariants && (
                  <Menu>
                    <MenuTrigger
                      render={
                        <Button
                          size="icon-sm"
                          aria-label="更多导出方式"
                          disabled={!!busy || variantCount === 0}
                          className="rounded-l-none border-l border-primary-foreground/20"
                        />
                      }
                    >
                      <ChevronDown size={14} />
                    </MenuTrigger>
                    <MenuContent>
                      <MenuItem onClick={onExportVariants}>
                        导出全部对比滤镜（ZIP · {variantCount} 张）
                      </MenuItem>
                    </MenuContent>
                  </Menu>
                )}
              </div>
              <span className="mx-1 h-5 w-px bg-border" aria-hidden="true" />
            </>
          )}
          {panels && (
            <>
              <Button
                variant="ghost"
                size="icon-sm"
                aria-label="分组栏"
                aria-pressed={panels.left}
                title={`${panels.left ? "隐藏" : "显示"}分组栏（[）`}
                onClick={() => panels.onToggle("left")}
                className={
                  panels.left ? "text-foreground" : "text-muted-foreground"
                }
              >
                <PanelLeft size={15} />
              </Button>
              <Button
                variant="ghost"
                size="icon-sm"
                aria-label="滤镜栏"
                aria-pressed={panels.right}
                title={`${panels.right ? "隐藏" : "显示"}滤镜栏（]）`}
                onClick={() => panels.onToggle("right")}
                className={
                  panels.right ? "text-foreground" : "text-muted-foreground"
                }
              >
                <PanelRight size={15} />
              </Button>
            </>
          )}
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label="设置"
            title="设置"
            onClick={onOpenSettings}
            className="text-muted-foreground"
          >
            <Settings size={15} />
          </Button>
        </div>
      </header>

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
