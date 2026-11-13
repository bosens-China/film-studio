import {
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
} from "react";
import type { CardTransform } from "@/lib/workspace-types";

export const defaultCardTransform: CardTransform = {
  zoom: 1,
  pan: { x: 0, y: 0 },
};

export function useCardView() {
  const [viewZoom, setViewZoom] = useState(1);
  const [cardTransforms, setCardTransforms] = useState<
    Record<string, CardTransform>
  >({});
  const [panningKey, setPanningKey] = useState<string | null>(null);
  const panOrigin = useRef({ key: "", x: 0, y: 0, clientX: 0, clientY: 0 });
  const didDrag = useRef(false);

  function getCardTransform(key: string): CardTransform {
    return cardTransforms[key] ?? defaultCardTransform;
  }

  function updateCardTransform(
    key: string,
    updater: (current: CardTransform) => CardTransform,
  ) {
    setCardTransforms((prev) => ({
      ...prev,
      [key]: updater(prev[key] ?? defaultCardTransform),
    }));
  }

  function startCardPan(
    cardKey: string,
    activateCard: () => void,
    event: ReactPointerEvent<HTMLElement>,
  ) {
    if (event.button !== 0) return;
    activateCard();
    const current = getCardTransform(cardKey);
    event.currentTarget.setPointerCapture(event.pointerId);
    panOrigin.current = {
      key: cardKey,
      x: current.pan.x,
      y: current.pan.y,
      clientX: event.clientX,
      clientY: event.clientY,
    };
    didDrag.current = false;
    setPanningKey(cardKey);
  }

  function moveCardPan(event: ReactPointerEvent<HTMLElement>) {
    if (!panningKey || panOrigin.current.key !== panningKey) return;
    const dx = event.clientX - panOrigin.current.clientX;
    const dy = event.clientY - panOrigin.current.clientY;
    if (Math.hypot(dx, dy) > 4) didDrag.current = true;
    if (didDrag.current) {
      const targetKey = panOrigin.current.key;
      const nextX = panOrigin.current.x + dx;
      const nextY = panOrigin.current.y + dy;
      updateCardTransform(targetKey, (existing) => ({
        ...existing,
        pan: { x: nextX, y: nextY },
      }));
    }
  }

  function endCardPan(event: ReactPointerEvent<HTMLElement>) {
    if (!panningKey) return;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    setPanningKey(null);
  }

  function consumeDrag() {
    const dragged = didDrag.current;
    didDrag.current = false;
    return dragged;
  }

  return {
    viewZoom,
    setViewZoom,
    cardTransforms,
    setCardTransforms,
    getCardTransform,
    updateCardTransform,
    startCardPan,
    moveCardPan,
    endCardPan,
    consumeDrag,
  };
}
