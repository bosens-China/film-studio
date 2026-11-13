import type { KeyboardEvent } from "react";

export function openKeyboardMenu(event: KeyboardEvent<HTMLDivElement>) {
  if (event.key !== "ContextMenu" && !(event.shiftKey && event.key === "F10"))
    return;
  event.preventDefault();
  const rect = event.currentTarget.getBoundingClientRect();
  event.currentTarget.dispatchEvent(
    new MouseEvent("contextmenu", {
      bubbles: true,
      cancelable: true,
      clientX: rect.left + 12,
      clientY: rect.top + 12,
    }),
  );
}
