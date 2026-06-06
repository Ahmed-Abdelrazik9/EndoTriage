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
  surgery_general: "Surgery (General Gynaecology)",
  surgery_specialist: "Surgery (Specialist BSGE)",
};

export const PATHWAY_LABELS: Record<string, string> = {
  medical: "Medical Management",
  surgery_general: "General Surgery",
  surgery_specialist: "Specialist BSGE",
  combined: "Combined Care",
  watchful_waiting: "Watchful Waiting",
  chronic_pain: "Chronic Pain & Psych",
};

export const PATHWAY_COLORS: Record<string, string> = {
  medical: "bg-blue-100 text-blue-800 border-blue-200",
  surgery_general: "bg-amber-100 text-amber-800 border-amber-200",
  surgery_specialist: "bg-purple-100 text-purple-800 border-purple-200",
  combined: "bg-rose-100 text-rose-800 border-rose-200",
  watchful_waiting: "bg-green-100 text-green-800 border-green-200",
  chronic_pain: "bg-teal-100 text-teal-800 border-teal-200",
};

export const CARE_STATE_LABELS: Record<string, string> = {
  referral_received: "Referral Received",
  clinic_review: "Clinic Review",
  imaging_completed: "Imaging Completed",
  triage_decision: "Triage Decision",
  medication_started: "Medication Started",
  medication_changed: "Medication Changed",
  waiting_list_added: "Waiting List Added",
  mdt_discussed: "MDT Discussed",
  surgery_scheduled: "Surgery Scheduled",
  surgery_completed: "Surgery Completed",
  post_op_review: "Post-Op Review",
  follow_up_ongoing: "Follow-Up Ongoing",
  recurrence_detected: "Recurrence Detected",
  discharged: "Discharged",
  long_term_management: "Long-Term Management",
};

export const CARE_STATE_COLORS: Record<string, string> = {
  referral_received: "bg-slate-100 text-slate-800 border-slate-200",
  clinic_review: "bg-blue-100 text-blue-800 border-blue-200",
  imaging_completed: "bg-cyan-100 text-cyan-800 border-cyan-200",
  triage_decision: "bg-amber-100 text-amber-800 border-amber-200",
  medication_started: "bg-emerald-100 text-emerald-800 border-emerald-200",
  medication_changed: "bg-teal-100 text-teal-800 border-teal-200",
  waiting_list_added: "bg-orange-100 text-orange-800 border-orange-200",
  mdt_discussed: "bg-violet-100 text-violet-800 border-violet-200",
  surgery_scheduled: "bg-pink-100 text-pink-800 border-pink-200",
  surgery_completed: "bg-rose-100 text-rose-800 border-rose-200",
  post_op_review: "bg-indigo-100 text-indigo-800 border-indigo-200",
  follow_up_ongoing: "bg-sky-100 text-sky-800 border-sky-200",
  recurrence_detected: "bg-red-100 text-red-800 border-red-200",
  discharged: "bg-gray-100 text-gray-800 border-gray-200",
  long_term_management: "bg-green-100 text-green-800 border-green-200",
};

export const TIER_LABELS: Record<string, string> = {
  tier1: "Tier 1: First-Line",
  tier2: "Tier 2: Second-Line",
  tier3: "Tier 3: Third-Line",
  analgesia: "Analgesia",
};

export const TIER_COLORS: Record<string, string> = {
  tier1: "bg-green-100 text-green-800 border-green-200",
  tier2: "bg-amber-100 text-amber-800 border-amber-200",
  tier3: "bg-red-100 text-red-800 border-red-200",
  analgesia: "bg-blue-100 text-blue-800 border-blue-200",
};

export const FORMULARY_COLORS: Record<string, string> = {
  green: "bg-green-50 text-green-700 border-green-200",
  amber: "bg-amber-50 text-amber-700 border-amber-200",
  red: "bg-red-50 text-red-700 border-red-200",
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
