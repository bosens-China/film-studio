import { Slider as SliderPrimitive } from "@base-ui/react/slider";
import { cn } from "cn";

type SliderProps = Omit<SliderPrimitive.Root.Props<number>, "aria-label"> & {
  "aria-label"?: string;
  thumbClassName?: string;
};

function Slider({
  className,
  thumbClassName,
  "aria-label": ariaLabel,
  ...props
}: SliderProps) {
  return (
    <SliderPrimitive.Root
      data-slot="slider"
      className={cn(
        "relative flex w-full touch-none items-center select-none data-disabled:opacity-50",
        className,
      )}
      {...props}
    >
      <SliderPrimitive.Control className="relative flex h-6 w-full cursor-pointer items-center">
        <SliderPrimitive.Track className="relative h-1.5 w-full grow overflow-hidden rounded-full bg-secondary">
          <SliderPrimitive.Indicator className="h-full rounded-full bg-primary transition-[width] duration-75" />
        </SliderPrimitive.Track>
        <SliderPrimitive.Thumb
          getAriaLabel={ariaLabel ? () => ariaLabel : undefined}
          className={cn(
            "block size-3.5 shrink-0 rounded-full border border-primary/50 bg-primary shadow-sm ring-ring/50 transition-[transform,box-shadow] hover:scale-110 focus-visible:ring-3 focus-visible:outline-none data-dragging:scale-110 data-dragging:ring-3",
            thumbClassName,
          )}
        />
      </SliderPrimitive.Control>
    </SliderPrimitive.Root>
  );
}

export { Slider };
