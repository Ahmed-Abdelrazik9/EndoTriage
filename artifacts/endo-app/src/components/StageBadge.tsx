import { cn } from "@/lib/utils";
import { STAGE_COLORS } from "@/lib/triage";

export default function StageBadge({ stage }: { stage: string | null | undefined }) {
  if (!stage) return <span className="text-muted-foreground text-xs">Unclassified</span>;
  return (
    <span className={cn(
      "inline-flex items-center text-xs font-medium border rounded-full px-2.5 py-1",
      STAGE_COLORS[stage] ?? "bg-muted text-muted-foreground border-border"
    )}>
      {stage}
    </span>
  );
}
