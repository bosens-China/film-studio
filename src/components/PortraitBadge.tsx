export function PortraitBadge({ className = "" }: { className?: string }) {
  return (
    <span
      title="已开启人像优化"
      className={`shrink-0 rounded-sm border border-current/25 px-1 text-[10px] leading-4 text-muted-foreground ${className}`}
    >
      人像
    </span>
  );
}
