import { Dialog } from "@base-ui/react/dialog";
import { ExternalLink, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { useSettingsStore } from "@/stores/settings";

const repoUrl = "https://github.com/bosens-China/film-studio";

const isMac =
  typeof navigator !== "undefined" &&
  /Mac|iPhone|iPad/.test(navigator.platform);
const mod = isMac ? "⌘" : "Ctrl";

const shortcuts: [string, string][] = [
  ["撤销 / 重做", `${mod} Z / ${mod} ⇧ Z`],
  ["按住查看原图", "\\"],
  ["上一张 / 下一张（详情页）", "← / →"],
  ["显示 / 隐藏分组栏、滤镜栏", "[ / ]"],
  ["打开右键菜单", "⇧ F10"],
];

export function SettingsDialog({ onClose }: { onClose: () => void }) {
  const autoPortrait = useSettingsStore((s) => s.autoPortrait);
  const setAutoPortrait = useSettingsStore((s) => s.setAutoPortrait);
  return (
    <Dialog.Root
      open
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <Dialog.Portal>
        <Dialog.Backdrop className="fixed inset-0 z-50 bg-black/70" />
        <Dialog.Popup className="fixed top-1/2 left-1/2 z-50 w-[min(28rem,calc(100vw-2rem))] -translate-x-1/2 -translate-y-1/2 rounded-xl border border-border bg-card text-foreground shadow-xl outline-none">
          <div className="flex items-center justify-between border-b border-border px-5 py-3.5">
            <Dialog.Title className="text-sm font-semibold">设置</Dialog.Title>
            <Dialog.Close
              render={
                <Button
                  variant="ghost"
                  size="icon-xs"
                  aria-label="关闭设置"
                  className="text-muted-foreground"
                />
              }
            >
              <X size={14} />
            </Dialog.Close>
          </div>

          <section className="px-5 py-4">
            <h3 className="text-xs font-medium text-muted-foreground">处理</h3>
            <label className="mt-3 flex cursor-pointer items-start justify-between gap-4">
              <span>
                <span className="block text-sm">
                  检测到人脸时自动开启人像优化
                </span>
                <span className="mt-1 block text-xs leading-relaxed text-muted-foreground">
                  导入后在本地识别人脸，开启轻度柔肤、去红和面部提亮。对之后导入的照片生效，每张照片仍可单独关闭。
                </span>
              </span>
              <Switch
                aria-label="检测到人脸时自动开启人像优化"
                checked={autoPortrait}
                onCheckedChange={setAutoPortrait}
                className="mt-0.5"
              />
            </label>
          </section>

          <section className="border-t border-border px-5 py-4">
            <h3 className="text-xs font-medium text-muted-foreground">
              快捷键
            </h3>
            <dl className="mt-2 space-y-1.5 text-sm">
              {shortcuts.map(([label, keys]) => (
                <div key={label} className="flex items-center justify-between">
                  <dt className="text-muted-foreground">{label}</dt>
                  <dd>
                    <kbd className="rounded border border-border bg-secondary px-1.5 py-0.5 font-sans text-xs tabular-nums">
                      {keys}
                    </kbd>
                  </dd>
                </div>
              ))}
            </dl>
          </section>

          <section className="border-t border-border px-5 py-4">
            <h3 className="text-xs font-medium text-muted-foreground">关于</h3>
            <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
              照片只在本地浏览器中处理，不会上传；刷新页面后照片和编辑状态会清空。
            </p>
            <a
              href={repoUrl}
              target="_blank"
              rel="noreferrer"
              className="mt-3 inline-flex items-center gap-1.5 text-sm text-foreground underline-offset-4 hover:underline"
            >
              GitHub · bosens-China/film-studio
              <ExternalLink size={12} className="text-muted-foreground" />
            </a>
          </section>
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
