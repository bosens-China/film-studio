import { Dialog } from "@base-ui/react/dialog";
import { Button } from "@/components/ui/button";

export function DeleteGroupDialog({
  name,
  onCancel,
  onConfirm,
}: {
  name: string;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  return (
    <Dialog.Root
      open
      onOpenChange={(open) => {
        if (!open) onCancel();
      }}
    >
      <Dialog.Portal>
        <Dialog.Backdrop className="fixed inset-0 z-50 bg-black/70" />
        <Dialog.Popup className="fixed top-1/2 left-1/2 z-50 w-[min(24rem,calc(100vw-2rem))] -translate-x-1/2 -translate-y-1/2 rounded-xl border border-border bg-card p-6 text-foreground shadow-xl outline-none">
          <Dialog.Title className="text-base font-semibold">
            删除分组“{name}”？
          </Dialog.Title>
          <Dialog.Description className="mt-2 text-sm text-muted-foreground">
            删除分组后，照片会回到未分组，不会删除照片。
          </Dialog.Description>
          <div className="mt-6 flex justify-end gap-2">
            <Dialog.Close render={<Button variant="outline" />}>
              取消
            </Dialog.Close>
            <Button variant="destructive" onClick={onConfirm}>
              删除分组
            </Button>
          </div>
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
