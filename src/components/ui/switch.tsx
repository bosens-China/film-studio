import { Switch as SwitchPrimitive } from "@base-ui/react/switch";
import { cn } from "cn";

function Switch({ className, ...props }: SwitchPrimitive.Root.Props) {
  return (
    <SwitchPrimitive.Root
      data-slot="switch"
      className={cn(
        "relative inline-flex h-4.5 w-8 shrink-0 cursor-pointer items-center rounded-full border border-transparent bg-input p-px transition-colors outline-none focus-visible:ring-3 focus-visible:ring-ring/50 data-checked:bg-primary data-disabled:cursor-not-allowed data-disabled:opacity-40",
        className,
      )}
      {...props}
    >
      <SwitchPrimitive.Thumb className="block size-3.5 rounded-full bg-foreground shadow-sm transition-transform data-checked:translate-x-3.5 data-checked:bg-primary-foreground" />
    </SwitchPrimitive.Root>
  );
}

export { Switch };
