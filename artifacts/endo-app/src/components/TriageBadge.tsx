import { cn } from "@/lib/utils";
import { TRIAGE_COLORS, TRIAGE_DOT, type TriageLevel } from "@/lib/triage";

export default function TriageBadge({ level, size = "md" }: { level: string | null | undefined; size?: "sm" | "md" }) {
  if (!level) return <span className="text-muted-foreground text-xs">—</span>;
  const l = level as TriageLevel;
  return (
    <span className={cn(
      "inline-flex items-center gap-1.5 font-medium border rounded-full",
      TRIAGE_COLORS[l] ?? "bg-muted text-muted-foreground border-border",
      size === "sm" ? "text-[10px] px-2 py-0.5" : "text-xs px-2.5 py-1"
    )}>
      <span className={cn("rounded-full shrink-0", TRIAGE_DOT[l] ?? "bg-muted-foreground", size === "sm" ? "w-1.5 h-1.5" : "w-2 h-2")} />
      {level.charAt(0).toUpperCase() + level.slice(1)}
    </span>
  );
}
