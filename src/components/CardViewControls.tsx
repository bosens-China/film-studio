import { RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { maxCardZoom, minCardZoom } from "@/hooks/useCardView";

type Props = {
  label: string;
  zoom: number;
  onZoomChange: (zoom: number) => void;
  onReset: () => void;
};

export function CardViewControls({
  label,
  zoom,
  onZoomChange,
  onReset,
}: Props) {
  return (
    <div
      className="absolute top-2 right-2 flex items-center gap-2 rounded-md border border-border bg-background/90 px-2 py-1 text-xs opacity-0 shadow-sm transition-opacity group-hover:opacity-100 focus-within:opacity-100"
      title="滚轮缩放，拖动平移"
    >
      <Slider
        aria-label={`${label}缩放`}
        min={minCardZoom}
        max={maxCardZoom}
        step={0.1}
        value={zoom}
        onValueChange={onZoomChange}
        className="w-16"
      />
      <Button
        variant="ghost"
        size="xs"
        aria-label={`重置${label}视图`}
        title="重置缩放与位置"
        onClick={onReset}
        className="gap-1 px-1 tabular-nums"
      >
        <RotateCcw size={11} />
        {Math.round(zoom * 100)}%
      </Button>
    </div>
  );
}
