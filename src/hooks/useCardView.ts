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

export const minCardZoom = 1;
export const maxCardZoom = 4;

const linkedKey = "__linked";

type ViewState = {
  linked: boolean;
  transforms: Record<string, CardTransform>;
};

function storageKey(state: ViewState, key: string) {
  return state.linked ? linkedKey : key;
}

function readTransform(state: ViewState, key: string): CardTransform {
  return (
    state.transforms[storageKey(state, key)] ??
    state.transforms[linkedKey] ??
    defaultCardTransform
  );
}

function isDefault({ zoom, pan }: CardTransform) {
  return zoom === 1 && pan.x === 0 && pan.y === 0;
}

export function useCardView() {
  const [state, setState] = useState<ViewState>({
    linked: true,
    transforms: {},
  });
  const panOrigin = useRef({ key: "", x: 0, y: 0, clientX: 0, clientY: 0 });
  const panning = useRef(false);
  const didDrag = useRef(false);

  function getCardTransform(key: string): CardTransform {
    return readTransform(state, key);
  }

  function updateCardTransform(
    key: string,
    updater: (current: CardTransform) => CardTransform,
  ) {
    setState((prev) => ({
      ...prev,
      transforms: {
        ...prev.transforms,
        [storageKey(prev, key)]: updater(readTransform(prev, key)),
      },
    }));
  }

  function resetView() {
    setState((prev) => ({ ...prev, transforms: {} }));
  }

  /** Keeps the view from jumping by seeding the new mode with the given card's transform. */
  function setLinked(linked: boolean, fromKey: string) {
    setState((prev) => ({
      linked,
      transforms: { [linkedKey]: readTransform(prev, fromKey) },
    }));
  }

  function zoomAt(
    key: string,
    element: HTMLElement,
    clientX: number,
    clientY: number,
    factor: number,
  ) {
    const rect = element.getBoundingClientRect();
    const px = clientX - rect.left - rect.width / 2;
    const py = clientY - rect.top - rect.height / 2;
    updateCardTransform(key, (current) => {
      const zoom = Math.min(
        maxCardZoom,
        Math.max(minCardZoom, Number((current.zoom * factor).toFixed(3))),
      );
      if (zoom === minCardZoom) return defaultCardTransform;
      const ratio = zoom / current.zoom;
      return {
        zoom,
        pan: {
          x: px - (px - current.pan.x) * ratio,
          y: py - (py - current.pan.y) * ratio,
        },
      };
    });
  }

  function wheelZoomRef(key: string) {
    return (element: HTMLElement | null) => {
      if (!element) return;
      const onWheel = (event: WheelEvent) => {
        event.preventDefault();
        const delta =
          event.deltaY *
          (event.deltaMode === WheelEvent.DOM_DELTA_LINE ? 16 : 1);
        // Trackpad pinch arrives as ctrl+wheel with small deltas.
        const speed = event.ctrlKey ? 0.01 : 0.0015;
        zoomAt(
          key,
          element,
          event.clientX,
          event.clientY,
          Math.exp(-delta * speed),
        );
      };
      element.addEventListener("wheel", onWheel, { passive: false });
      return () => element.removeEventListener("wheel", onWheel);
    };
  }

  function startCardPan(
    cardKey: string,
    event: ReactPointerEvent<HTMLElement>,
  ) {
    if (event.button !== 0) return;
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
    panning.current = true;
  }

  function moveCardPan(event: ReactPointerEvent<HTMLElement>) {
    if (!panning.current) return;
    const dx = event.clientX - panOrigin.current.clientX;
    const dy = event.clientY - panOrigin.current.clientY;
    if (Math.hypot(dx, dy) > 4) didDrag.current = true;
    if (!didDrag.current) return;
    const { key, x, y } = panOrigin.current;
    updateCardTransform(key, (existing) => ({
      ...existing,
      pan: { x: x + dx, y: y + dy },
    }));
  }

  function endCardPan(event: ReactPointerEvent<HTMLElement>) {
    if (!panning.current) return;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    panning.current = false;
  }

  function consumeDrag() {
    const dragged = didDrag.current;
    didDrag.current = false;
    return dragged;
  }

  return {
    linked: state.linked,
    setLinked,
    isTransformed: Object.values(state.transforms).some((t) => !isDefault(t)),
    getCardTransform,
    updateCardTransform,
    resetView,
    wheelZoomRef,
    startCardPan,
    moveCardPan,
    endCardPan,
    consumeDrag,
  };
}
