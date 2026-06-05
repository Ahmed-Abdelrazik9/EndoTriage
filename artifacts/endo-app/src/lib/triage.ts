export type TriageLevel = "urgent" | "high" | "moderate" | "routine";

export const TRIAGE_COLORS: Record<TriageLevel, string> = {
  urgent:   "bg-red-100 text-red-800 border-red-200",
  high:     "bg-amber-100 text-amber-800 border-amber-200",
  moderate: "bg-blue-100 text-blue-800 border-blue-200",
  routine:  "bg-green-100 text-green-800 border-green-200",
};

export const TRIAGE_DOT: Record<TriageLevel, string> = {
  urgent:   "bg-red-500",
  high:     "bg-amber-500",
  moderate: "bg-blue-500",
  routine:  "bg-green-500",
};

export const STAGE_COLORS: Record<string, string> = {
  "Stage I":   "bg-emerald-50 text-emerald-700 border-emerald-200",
  "Stage II":  "bg-yellow-50 text-yellow-700 border-yellow-200",
  "Stage III": "bg-orange-50 text-orange-700 border-orange-200",
  "Stage IV":  "bg-red-50 text-red-700 border-red-200",
};

export const APPROACH_LABELS: Record<string, string> = {
  medical: "Medical",
  surgical: "Surgical",
  combined: "Combined",
  "watchful-waiting": "Watchful Waiting",
};

export const STATUS_COLORS: Record<string, string> = {
  active:    "bg-primary/10 text-primary border-primary/20",
  completed: "bg-green-100 text-green-700 border-green-200",
  "on-hold": "bg-muted text-muted-foreground border-border",
};

export function formatDate(dateStr: string | null | undefined): string {
  if (!dateStr) return "—";
  try {
    return new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", year: "numeric" }).format(new Date(dateStr));
  } catch {
    return dateStr;
  }
}

export function timeAgo(isoStr: string): string {
  const diff = Date.now() - new Date(isoStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}
