import { useState, useEffect } from "react";
import { Link, useParams, useLocation } from "wouter";
import {
  useGetPatient,
  useCreateManagementPlan,
  useListMedications,
  useGetManagementPlanRecommendation,
  getListManagementPlansQueryKey,
  getListPatientsQueryKey,
  useGetPatientCarePathway,
  useAddCarePathwayEvent,
  getGetPatientCarePathwayQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import {
  ArrowLeft, X, Plus, Lightbulb, ShieldCheck, AlertTriangle,
  Baby, HeartCrack, Hospital, Pencil, CheckCircle2, FlaskConical,
  ScanLine, Microscope, Stethoscope, Clock, ChevronRight,
} from "lucide-react";
import { PATHWAY_COLORS, PATHWAY_LABELS, CARE_STATE_LABELS, CARE_STATE_COLORS, formatDate } from "@/lib/triage";
import { cn } from "@/lib/utils";

const SURGICAL_OPTIONS = [
  "Laparoscopic excision of endometriosis",
  "Laparoscopic ablation/fulguration",
  "Ovarian cystectomy (endometrioma)",
  "Hysterectomy with bilateral salpingo-oophorectomy",
  "Adhesiolysis",
  "Uterine nerve ablation (LUNA)",
  "Presacral neurectomy",
];

const LIFESTYLE_OPTIONS = [
  "Anti-inflammatory diet",
  "Regular low-impact exercise",
  "Heat therapy for pain management",
  "Stress reduction techniques",
  "Sleep hygiene optimization",
  "Physiotherapy / pelvic floor therapy",
  "Psychological support / counselling",
  "Acupuncture",
  "Omega-3 supplementation",
];

const CARE_STATES = [
  "referral_received", "clinic_review", "imaging_completed", "triage_decision",
  "medication_started", "medication_changed", "waiting_list_added", "mdt_discussed",
  "surgery_scheduled", "surgery_completed", "post_op_review", "follow_up_ongoing",
  "recurrence_detected", "discharged", "long_term_management",
];

const PATHWAYS = ["medical", "surgery_general", "surgery_specialist", "combined", "watchful_waiting"];

const STEP_LABELS: Record<number, string> = {
  1: "Step 1 — First-line",
  2: "Step 2 — Second-line",
  3: "Step 3 — Specialist",
};

const STEP_COLORS: Record<number, string> = {
  1: "bg-emerald-100 text-emerald-800 border-emerald-300",
  2: "bg-amber-100 text-amber-800 border-amber-300",
  3: "bg-rose-100 text-rose-800 border-rose-300",
};

export default function CreatePlan() {
  const { id } = useParams<{ id: string }>();
  const patientId = parseInt(id);
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: patient, isLoading: patLoading } = useGetPatient(patientId, {
    query: { enabled: !!patientId, queryKey: ["getPatient", patientId] as const },
  });
  const { data: allMeds } = useListMedications();
  const { data: recommendation, isLoading: recLoading } = useGetManagementPlanRecommendation(
    { patientId: patientId },
    { query: { enabled: !!patientId, queryKey: ["recommend", patientId] as const } }
  );
  const mutation = useCreateManagementPlan();

  const { data: pathway, isLoading: pathLoading } = useGetPatientCarePathway(patientId, {
    query: { enabled: !!patientId, queryKey: ["getPatientCarePathway", patientId] as const },
  });
  const pathwayMutation = useAddCarePathwayEvent();

  const [aiApplied, setAiApplied] = useState(false);
  const [overriddenFields, setOverriddenFields] = useState<Set<string>>(new Set());
  const [rxOverrides, setRxOverrides] = useState<Record<string, Record<string, string>>>({});
  const [rxEditMode, setRxEditMode] = useState<Set<string>>(new Set());

  const [form, setForm] = useState({
    status: "active",
    approach: "",
    selectedMeds: [] as string[],
    surgicalOptions: [] as string[],
    lifestyleOptions: [] as string[],
    followUpWeeks: "",
    nextReviewDate: "",
    goals: "",
    clinicianNotes: "",
    customMed: "",
  });

  const [pathwayForm, setPathwayForm] = useState({
    state: "",
    eventDate: new Date().toISOString().split("T")[0],
    clinician: "",
    notes: "",
    pathwayAssigned: "",
  });

  // ── Auto-apply AI recommendation when it loads ────────────────────────────
  useEffect(() => {
    if (recommendation && !aiApplied) {
      setForm((f) => ({
        ...f,
        approach: recommendation.recommendedApproach ?? "",
        selectedMeds: recommendation.recommendedMedications ?? [],
        surgicalOptions: recommendation.recommendedSurgicalOptions ?? [],
        lifestyleOptions: recommendation.recommendedLifestyle ?? [],
        followUpWeeks: recommendation.recommendedFollowUpWeeks
          ? String(recommendation.recommendedFollowUpWeeks)
          : "",
        goals: recommendation.recommendedGoals ?? "",
      }));
      setAiApplied(true);
    }
  }, [recommendation, aiApplied]);

  function markOverride(field: string) {
    setOverriddenFields((prev) => new Set([...prev, field]));
  }

  function toggleItem(list: string[], item: string): string[] {
    return list.includes(item) ? list.filter((x) => x !== item) : [...list, item];
  }

  function addCustomMed() {
    if (form.customMed.trim() && !form.selectedMeds.includes(form.customMed.trim())) {
      setForm((f) => ({ ...f, selectedMeds: [...f.selectedMeds, f.customMed.trim()], customMed: "" }));
      markOverride("selectedMeds");
    }
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.approach) {
      toast({ title: "Approach required", description: "Please select a management approach.", variant: "destructive" });
      return;
    }
    mutation.mutate(
      {
        data: {
          patientId,
          status: form.status,
          approach: form.approach,
          pathway: recommendation?.recommendedPathway ?? undefined,
          pathwayRationale: recommendation?.pathwayRationale ?? undefined,
          investigationFindings: recommendation?.investigationFindings
            ? (typeof recommendation.investigationFindings === "string"
                ? recommendation.investigationFindings
                : JSON.stringify(recommendation.investigationFindings))
            : undefined,
          recommendedPathway: recommendation?.recommendedPathway ?? undefined,
          medications: form.selectedMeds,
          surgicalOptions: form.surgicalOptions,
          lifestyleRecommendations: form.lifestyleOptions,
          followUpWeeks: form.followUpWeeks ? parseInt(form.followUpWeeks) : undefined,
          nextReviewDate: form.nextReviewDate || undefined,
          goals: form.goals || undefined,
          clinicianNotes: form.clinicianNotes || undefined,
        },
      },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListManagementPlansQueryKey({ patientId }) });
          queryClient.invalidateQueries({ queryKey: getListPatientsQueryKey() });
          toast({ title: "Management plan created" });
          navigate(`/patients/${patientId}`);
        },
        onError: () => {
          toast({ title: "Error", description: "Failed to create plan.", variant: "destructive" });
        },
      }
    );
  }

  function handlePathwaySubmit() {
    if (!pathwayForm.state) {
      toast({ title: "State required", description: "Please select a care pathway state.", variant: "destructive" });
      return;
    }
    pathwayMutation.mutate(
      { id: patientId, data: pathwayForm },
      {
        onSuccess: () => {
          toast({ title: "Pathway event added", description: `State updated to ${CARE_STATE_LABELS[pathwayForm.state]}.` });
          queryClient.invalidateQueries({ queryKey: getGetPatientCarePathwayQueryKey(patientId) });
          queryClient.invalidateQueries({ queryKey: ["getPatient", patientId] });
          setPathwayForm({ state: "", eventDate: new Date().toISOString().split("T")[0], clinician: "", notes: "", pathwayAssigned: "" });
        },
        onError: () => {
          toast({ title: "Error", description: "Failed to add event.", variant: "destructive" });
        },
      }
    );
  }

  if (patLoading || pathLoading) return <Skeleton className="h-48 w-full max-w-2xl" />;

  const step = recommendation?.treatmentStep;
  const aiMeds = recommendation?.recommendedMedications ?? [];
  const events = (pathway?.events ?? []).slice().reverse();
  const currentState = patient?.carePathwayState ?? "referral_received";
  const currentPathway = patient?.currentPathway;

  return (
    <div className="max-w-2xl space-y-5">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" asChild>
          <Link href={`/patients/${patientId}`}><ArrowLeft className="w-4 h-4 mr-1" />Back</Link>
        </Button>
      </div>

      <div>
        <h1 className="text-2xl font-bold tracking-tight">Clinical Plan</h1>
        {patient && <p className="text-sm text-muted-foreground mt-0.5">{patient.firstName} {patient.lastName}</p>}
      </div>

      {/* Loading skeleton */}
      {recLoading && <Skeleton className="h-40 w-full" />}

      {/* NICE NG73 Recommendation card */}
      {recommendation && (
        <Card className="shadow-sm border-l-4 border-l-rose-400 bg-rose-50/40">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Lightbulb className="w-4 h-4 text-rose-500" />
              NICE NG73 Clinical Recommendation
            </CardTitle>
            <CardDescription>
              Derived from clinical assessment + investigation findings. Pre-filled below — modify any field as needed.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {/* Pathway + step badges */}
            <div className="flex flex-wrap items-center gap-2">
              <Badge className={PATHWAY_COLORS[recommendation.recommendedPathway] || "bg-muted text-muted-foreground"}>
                {PATHWAY_LABELS[recommendation.recommendedPathway] || recommendation.recommendedPathway}
              </Badge>
              {step && (
                <span className={`inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full border ${STEP_COLORS[step] ?? ""}`}>
                  <FlaskConical className="w-3 h-3" />
                  {STEP_LABELS[step] ?? `Step ${step}`}
                </span>
              )}
            </div>

            {/* Pathway rationale */}
            <p className="text-sm text-muted-foreground leading-relaxed">{recommendation.pathwayRationale}</p>

            {/* Step rationale */}
            {recommendation.treatmentStepRationale && (
              <div className="bg-white/70 border border-rose-200 rounded-md px-3 py-2 text-sm text-rose-900">
                <span className="font-medium">Medication step: </span>{recommendation.treatmentStepRationale}
              </div>
            )}

            {/* Investigation findings context */}
            {recommendation.investigationFindings && (
              <div className="bg-white/70 border border-rose-200 rounded-md px-3 py-2 text-sm text-rose-900">
                <div className="flex items-center gap-1.5 font-medium text-rose-700 mb-1">
                  <Microscope className="w-3.5 h-3.5" />
                  Investigation Findings
                </div>
                <div className="text-muted-foreground text-xs leading-relaxed">
                  {(() => {
                    try {
                      const findings = typeof recommendation.investigationFindings === "string"
                        ? JSON.parse(recommendation.investigationFindings)
                        : recommendation.investigationFindings;
                      const parts: string[] = [];
                      if (findings.tvus) {
                        const t = findings.tvus;
                        const bits = [];
                        if (t.completed) bits.push("TVUS completed");
                        if (t.endometrioma) bits.push("Endometrioma seen");
                        if (t.deepEndometriosis) bits.push("Deep endometriosis");
                        if (t.adenomyosis) bits.push("Adenomyosis");
                        if (t.normal) bits.push("TVUS normal");
                        if (bits.length) parts.push(bits.join("; "));
                      }
                      if (findings.mri) {
                        const m = findings.mri;
                        const bits = [];
                        if (m.completed) bits.push("MRI completed");
                        if (m.deepEndometriosis) bits.push("Deep endometriosis");
                        if (m.endometrioma) bits.push("Endometrioma");
                        if (m.uretericInvolvement) bits.push("Ureteric involvement");
                        if (m.bowelInvolvement) bits.push("Bowel involvement");
                        if (m.bladderInvolvement) bits.push("Bladder involvement");
                        if (bits.length) parts.push(bits.join("; "));
                      }
                      if (findings.laparoscopy) {
                        const l = findings.laparoscopy;
                        const bits = [];
                        if (l.completed) bits.push("Laparoscopy completed");
                        if (l.rafsStage) bits.push(`rAFS Stage ${l.rafsStage}`);
                        if (l.enzianScore) bits.push(`ENZIAN ${l.enzianScore}`);
                        if (bits.length) parts.push(bits.join("; "));
                      }
                      if (findings.ca125) {
                        const c = findings.ca125;
                        if (c.completed && c.value) parts.push(`CA-125: ${c.value} U/mL`);
                      }
                      return parts.length ? parts.join(" | ") : "Investigations recorded";
                    } catch {
                      return "Investigations recorded";
                    }
                  })()}
                </div>
              </div>
            )}

            {/* Clinical flags */}
            <div className="flex flex-wrap gap-2">
              {recommendation.mdtRequired && (
                <Badge variant="outline" className="flex items-center gap-1 border-amber-400 text-amber-700">
                  <AlertTriangle className="w-3 h-3" />MDT Required
                </Badge>
              )}
              {recommendation.bsgeReferral && (
                <Badge variant="outline" className="flex items-center gap-1 border-blue-400 text-blue-700">
                  <Hospital className="w-3 h-3" />BSGE Referral
                </Badge>
              )}
              {recommendation.fertilityReferral && (
                <Badge variant="outline" className="flex items-center gap-1 border-purple-400 text-purple-700">
                  <Baby className="w-3 h-3" />Fertility Referral
                </Badge>
              )}
              {recommendation.avoidGnRH && (
                <Badge variant="outline" className="flex items-center gap-1 border-red-400 text-red-700">
                  <ShieldCheck className="w-3 h-3" />Avoid GnRH
                </Badge>
              )}
              {recommendation.painClinic && (
                <Badge variant="outline" className="flex items-center gap-1 border-orange-400 text-orange-700">
                  <HeartCrack className="w-3 h-3" />Pain Clinic
                </Badge>
              )}
            </div>

            {/* Surgical route determination */}
            {recommendation.surgicalRoute && (
              <div className="bg-white/70 border border-rose-200 rounded-md px-3 py-2.5 text-sm space-y-1.5">
                <div className="flex items-center gap-2 flex-wrap">
                  <ScanLine className="w-3.5 h-3.5 text-rose-600 flex-shrink-0" />
                  <span className="font-medium text-rose-700">Surgical Route (NICE NG73 §1.5):</span>
                  <Badge
                    variant="outline"
                    className={recommendation.surgicalRoute === "specialist"
                      ? "border-blue-400 text-blue-700 bg-blue-50"
                      : "border-green-400 text-green-700 bg-green-50"}
                  >
                    <Hospital className="w-3 h-3 mr-1" />
                    {recommendation.surgicalRoute === "specialist"
                      ? "Specialist Centre (BSGE-accredited)"
                      : "Pooled List — General Gynaecologist"}
                  </Badge>
                </div>
                {recommendation.surgicalRouteCriteria && recommendation.surgicalRouteCriteria.length > 0 && (
                  <ul className="text-xs text-muted-foreground pl-5 list-disc space-y-0.5">
                    {recommendation.surgicalRouteCriteria.map((c, i) => (
                      <li key={i}>{c}</li>
                    ))}
                  </ul>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* AI applied banner */}
      {aiApplied && (
        <div className="flex items-center gap-2 text-sm text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-2">
          <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
          <span>
            NICE NG73 recommendation pre-loaded into the form.
            {overriddenFields.size > 0 && (
              <span className="ml-1 font-medium">You have modified {overriddenFields.size} field{overriddenFields.size > 1 ? "s" : ""}.</span>
            )}
          </span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">

        {/* Approach & Status */}
        <Card className="shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              Plan Overview
              {aiApplied && !overriddenFields.has("approach") && (
                <span className="text-xs font-normal text-rose-600 bg-rose-100 px-1.5 py-0.5 rounded">AI</span>
              )}
              {overriddenFields.has("approach") && (
                <span className="text-xs font-normal text-amber-700 bg-amber-100 px-1.5 py-0.5 rounded flex items-center gap-0.5">
                  <Pencil className="w-2.5 h-2.5" />Modified
                </span>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Management Approach *</Label>
                <Select
                  value={form.approach}
                  onValueChange={(v) => {
                    setForm((f) => ({ ...f, approach: v }));
                    if (v !== recommendation?.recommendedApproach) markOverride("approach");
                  }}
                >
                  <SelectTrigger><SelectValue placeholder="Select approach" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="medical">Medical</SelectItem>
                    <SelectItem value="surgical">Surgical</SelectItem>
                    <SelectItem value="combined">Combined</SelectItem>
                    <SelectItem value="watchful-waiting">Watchful Waiting</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Plan Status</Label>
                <Select value={form.status} onValueChange={(v) => setForm((f) => ({ ...f, status: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="on-hold">On Hold</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="flex items-center gap-2">
                  Follow-up (weeks)
                  {aiApplied && !overriddenFields.has("followUpWeeks") && form.followUpWeeks && (
                    <span className="text-xs text-rose-600 bg-rose-100 px-1.5 py-0.5 rounded">AI</span>
                  )}
                </Label>
                <Input
                  type="number" min="1" max="104"
                  value={form.followUpWeeks}
                  onChange={(e) => {
                    setForm((f) => ({ ...f, followUpWeeks: e.target.value }));
                    if (e.target.value !== String(recommendation?.recommendedFollowUpWeeks ?? "")) markOverride("followUpWeeks");
                  }}
                  placeholder="e.g. 12"
                />
              </div>
              <div className="space-y-1.5">
                <Label>Next Review Date</Label>
                <Input type="date" value={form.nextReviewDate} onChange={(e) => setForm((f) => ({ ...f, nextReviewDate: e.target.value }))} />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="flex items-center gap-2">
                Treatment Goals
                {aiApplied && !overriddenFields.has("goals") && form.goals && (
                  <span className="text-xs text-rose-600 bg-rose-100 px-1.5 py-0.5 rounded">AI</span>
                )}
                {overriddenFields.has("goals") && (
                  <span className="text-xs text-amber-700 bg-amber-100 px-1.5 py-0.5 rounded flex items-center gap-0.5">
                    <Pencil className="w-2.5 h-2.5" />Modified
                  </span>
                )}
              </Label>
              <Textarea
                value={form.goals}
                onChange={(e) => {
                  setForm((f) => ({ ...f, goals: e.target.value }));
                  if (e.target.value !== (recommendation?.recommendedGoals ?? "")) markOverride("goals");
                }}
                placeholder="e.g. Pain reduction to VAS ≤3, preserve fertility, improve QoL..."
                rows={3}
              />
            </div>
          </CardContent>
        </Card>

        {/* Medications */}
        <Card className="shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              Medications
              {step && (
                <span className={`text-xs font-semibold px-2 py-0.5 rounded-full border ${STEP_COLORS[step] ?? ""}`}>
                  {STEP_LABELS[step]}
                </span>
              )}
              {overriddenFields.has("selectedMeds") && (
                <span className="text-xs font-normal text-amber-700 bg-amber-100 px-1.5 py-0.5 rounded flex items-center gap-0.5">
                  <Pencil className="w-2.5 h-2.5" />Modified
                </span>
              )}
            </CardTitle>
            {recommendation?.medicationRationale && (
              <CardDescription className="leading-relaxed">
                {recommendation.medicationRationale}
              </CardDescription>
            )}
          </CardHeader>
          <CardContent className="space-y-4">
            {form.selectedMeds.length > 0 && (
              <div className="space-y-2">
                {form.selectedMeds.map((medName) => {
                  const bnfRx = (recommendation?.prescriptions ?? []).find((p) => p.name === medName);
                  const override = rxOverrides[medName] ?? {};
                  const rx = bnfRx
                    ? {
                        dose: override.dose ?? bnfRx.dose,
                        route: override.route ?? bnfRx.route,
                        frequency: override.frequency ?? bnfRx.frequency,
                        duration: override.duration ?? bnfRx.duration,
                        courseNotes: override.courseNotes ?? bnfRx.courseNotes,
                        bnfReference: override.bnfReference ?? bnfRx.bnfReference,
                      }
                    : null;
                  const isAi = aiMeds.includes(medName);
                  const isEditing = rxEditMode.has(medName);
                  const hasOverride = Object.keys(override).length > 0;

                  function updateOverride(field: string, val: string) {
                    setRxOverrides((prev) => ({
                      ...prev,
                      [medName]: { ...prev[medName], [field]: val },
                    }));
                    markOverride("prescriptions");
                  }

                  return rx ? (
                    <div
                      key={medName}
                      className={`rounded-lg border px-4 py-3 text-sm space-y-2 ${isAi ? "border-rose-300 bg-rose-50/60" : "border-border bg-muted/30"}`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2 flex-wrap">
                          {isAi && <span className="text-rose-500 font-bold text-xs">✦</span>}
                          <span className="font-semibold text-sm">{medName}</span>
                          {isAi && (
                            <span className="text-xs bg-rose-100 text-rose-700 px-1.5 py-0.5 rounded font-medium">NICE Step {step}</span>
                          )}
                          {hasOverride && (
                            <span className="text-xs bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded flex items-center gap-0.5">
                              <Pencil className="w-2.5 h-2.5" />Edited
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-1.5 flex-shrink-0">
                          <button
                            type="button"
                            className="text-xs text-muted-foreground hover:text-foreground border border-border rounded px-2 py-0.5 flex items-center gap-1"
                            onClick={() => setRxEditMode((prev) => {
                              const next = new Set(prev);
                              if (next.has(medName)) next.delete(medName);
                              else next.add(medName);
                              return next;
                            })}
                          >
                            <Pencil className="w-3 h-3" />{isEditing ? "Done" : "Edit"}
                          </button>
                          <button
                            type="button"
                            className="text-muted-foreground hover:text-destructive"
                            onClick={() => {
                              setForm((f) => ({ ...f, selectedMeds: f.selectedMeds.filter((x) => x !== medName) }));
                              markOverride("selectedMeds");
                            }}
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      </div>

                      {isEditing ? (
                        <div className="space-y-2 pt-1 border-t border-border/40">
                          <div className="grid grid-cols-2 gap-2">
                            <div className="space-y-0.5">
                              <label className="text-xs font-medium text-muted-foreground">Dose</label>
                              <Input
                                className="h-7 text-xs"
                                value={rx.dose}
                                onChange={(e) => updateOverride("dose", e.target.value)}
                              />
                            </div>
                            <div className="space-y-0.5">
                              <label className="text-xs font-medium text-muted-foreground">Route</label>
                              <Input
                                className="h-7 text-xs"
                                value={rx.route}
                                onChange={(e) => updateOverride("route", e.target.value)}
                              />
                            </div>
                            <div className="space-y-0.5">
                              <label className="text-xs font-medium text-muted-foreground">Frequency</label>
                              <Input
                                className="h-7 text-xs"
                                value={rx.frequency}
                                onChange={(e) => updateOverride("frequency", e.target.value)}
                              />
                            </div>
                            <div className="space-y-0.5">
                              <label className="text-xs font-medium text-muted-foreground">Duration</label>
                              <Input
                                className="h-7 text-xs"
                                value={rx.duration}
                                onChange={(e) => updateOverride("duration", e.target.value)}
                              />
                            </div>
                          </div>
                          <div className="space-y-0.5">
                            <label className="text-xs font-medium text-muted-foreground">Course Notes</label>
                            <Textarea
                              className="text-xs min-h-0"
                              rows={2}
                              value={rx.courseNotes}
                              onChange={(e) => updateOverride("courseNotes", e.target.value)}
                            />
                          </div>
                          <div className="space-y-0.5">
                            <label className="text-xs font-medium text-muted-foreground">BNF Reference</label>
                            <Input
                              className="h-7 text-xs"
                              value={rx.bnfReference}
                              onChange={(e) => updateOverride("bnfReference", e.target.value)}
                            />
                          </div>
                        </div>
                      ) : (
                        <>
                          <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs text-muted-foreground">
                            <div><span className="font-medium text-foreground">Dose:</span> {rx.dose}</div>
                            <div><span className="font-medium text-foreground">Route:</span> {rx.route}</div>
                            <div><span className="font-medium text-foreground">Frequency:</span> {rx.frequency}</div>
                            <div><span className="font-medium text-foreground">Duration:</span> {rx.duration}</div>
                          </div>
                          {rx.courseNotes && (
                            <p className="text-xs text-muted-foreground leading-relaxed border-t border-border/50 pt-2">{rx.courseNotes}</p>
                          )}
                          <p className="text-xs text-blue-600 font-medium">{rx.bnfReference}</p>
                        </>
                      )}
                    </div>
                  ) : (
                    <div
                      key={medName}
                      className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-sm border mr-1.5 ${isAi ? "border-rose-300 bg-rose-50 text-rose-800" : "bg-muted text-foreground border-border"}`}
                    >
                      {isAi && <span className="text-rose-500 font-bold">✦</span>}
                      {medName}
                      <button
                        type="button"
                        onClick={() => {
                          setForm((f) => ({ ...f, selectedMeds: f.selectedMeds.filter((x) => x !== medName) }));
                          markOverride("selectedMeds");
                        }}
                      >
                        <X className="w-3 h-3 ml-0.5" />
                      </button>
                    </div>
                  );
                })}
              </div>
            )}

            {aiMeds.length > 0 && (
              <p className="text-xs text-rose-600 flex items-center gap-1">
                <span className="font-bold">✦</span> NICE NG73 Step {step} recommendations with BNF dosing — click <Pencil className="w-3 h-3 mx-0.5" /> Edit to customise dose/frequency/duration
              </p>
            )}

            <div className="space-y-1 max-h-52 overflow-y-auto border rounded-md p-3">
              {(allMeds ?? []).map((med) => {
                const isAiRec = aiMeds.includes(med.name);
                return (
                  <label
                    key={med.id}
                    className={`flex items-start gap-2.5 cursor-pointer p-1.5 rounded transition-colors ${isAiRec ? "bg-rose-50 hover:bg-rose-100 border border-rose-200" : "hover:bg-muted/40"}`}
                  >
                    <Checkbox
                      checked={form.selectedMeds.includes(med.name)}
                      onCheckedChange={() => {
                        setForm((f) => ({ ...f, selectedMeds: toggleItem(f.selectedMeds, med.name) }));
                        markOverride("selectedMeds");
                      }}
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-medium">{med.name}</span>
                        {isAiRec && (
                          <span className="text-xs bg-rose-100 text-rose-700 px-1.5 py-0.5 rounded font-medium">
                            NICE Step {step}
                          </span>
                        )}
                        <span className="text-xs text-muted-foreground">{med.category}</span>
                        {med.evidenceLevel && (
                          <span className="text-xs text-muted-foreground">· Evidence {med.evidenceLevel}</span>
                        )}
                      </div>
                    </div>
                  </label>
                );
              })}
            </div>

            <div className="flex gap-2">
              <Input
                value={form.customMed}
                onChange={(e) => setForm((f) => ({ ...f, customMed: e.target.value }))}
                placeholder="Add custom medication..."
                onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addCustomMed())}
              />
              <Button type="button" variant="outline" size="sm" onClick={addCustomMed}>
                <Plus className="w-4 h-4" />
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Surgical options */}
        {(form.approach === "surgical" || form.approach === "combined") && (
          <Card className="shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                Surgical Options
                {aiApplied && form.surgicalOptions.length > 0 && !overriddenFields.has("surgicalOptions") && (
                  <span className="text-xs text-rose-600 bg-rose-100 px-1.5 py-0.5 rounded">AI</span>
                )}
                {overriddenFields.has("surgicalOptions") && (
                  <span className="text-xs text-amber-700 bg-amber-100 px-1.5 py-0.5 rounded flex items-center gap-0.5">
                    <Pencil className="w-2.5 h-2.5" />Modified
                  </span>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {SURGICAL_OPTIONS.map((opt) => {
                  const isAiRec = (recommendation?.recommendedSurgicalOptions ?? []).includes(opt);
                  return (
                    <label
                      key={opt}
                      className={`flex items-center gap-2.5 cursor-pointer p-1.5 rounded ${isAiRec ? "bg-rose-50 border border-rose-200" : "hover:bg-muted/40"}`}
                    >
                      <Checkbox
                        checked={form.surgicalOptions.includes(opt)}
                        onCheckedChange={() => {
                          setForm((f) => ({ ...f, surgicalOptions: toggleItem(f.surgicalOptions, opt) }));
                          markOverride("surgicalOptions");
                        }}
                      />
                      <span className="text-sm">{opt}</span>
                      {isAiRec && <span className="text-xs text-rose-600 bg-rose-100 px-1.5 py-0.5 rounded ml-auto">NICE</span>}
                    </label>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Lifestyle recommendations */}
        <Card className="shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              Lifestyle Recommendations
              {aiApplied && form.lifestyleOptions.length > 0 && !overriddenFields.has("lifestyleOptions") && (
                <span className="text-xs text-rose-600 bg-rose-100 px-1.5 py-0.5 rounded">AI</span>
              )}
              {overriddenFields.has("lifestyleOptions") && (
                <span className="text-xs text-amber-700 bg-amber-100 px-1.5 py-0.5 rounded flex items-center gap-0.5">
                  <Pencil className="w-2.5 h-2.5" />Modified
                </span>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {LIFESTYLE_OPTIONS.map((opt) => {
                const isAiRec = (recommendation?.recommendedLifestyle ?? []).includes(opt);
                return (
                  <label
                    key={opt}
                    className={`flex items-center gap-2.5 cursor-pointer p-1.5 rounded ${isAiRec ? "bg-rose-50 border border-rose-200" : "hover:bg-muted/40"}`}
                  >
                    <Checkbox
                      checked={form.lifestyleOptions.includes(opt)}
                      onCheckedChange={() => {
                        setForm((f) => ({ ...f, lifestyleOptions: toggleItem(f.lifestyleOptions, opt) }));
                        markOverride("lifestyleOptions");
                      }}
                    />
                    <span className="text-sm">{opt}</span>
                    {isAiRec && <span className="text-xs text-rose-600 bg-rose-100 px-1.5 py-0.5 rounded ml-auto">NICE</span>}
                  </label>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Clinician notes */}
        <Card className="shadow-sm">
          <CardContent className="pt-4">
            <div className="space-y-1.5">
              <Label>Clinician Notes / Override Rationale</Label>
              <Textarea
                value={form.clinicianNotes}
                onChange={(e) => setForm((f) => ({ ...f, clinicianNotes: e.target.value }))}
                placeholder="Document any deviations from the NICE NG73 recommendation and clinical rationale here..."
                rows={3}
              />
            </div>
          </CardContent>
        </Card>

        <div className="flex gap-3">
          <Button type="submit" disabled={mutation.isPending}>
            {mutation.isPending ? "Creating..." : "Save Management Plan"}
          </Button>
          <Button type="button" variant="outline" asChild>
            <Link href={`/patients/${patientId}`}>Cancel</Link>
          </Button>
        </div>
      </form>

      {/* ── Care Pathway Section ───────────────────────────────────────────── */}
      <div className="pt-6 border-t border-border">
        <div className="flex items-center gap-2 mb-4">
          <Stethoscope className="w-5 h-5 text-muted-foreground" />
          <h2 className="text-lg font-semibold tracking-tight">Care Pathway</h2>
          <p className="text-xs text-muted-foreground ml-1">NHS pathway tracking</p>
        </div>

        {/* Current state */}
        <Card className="shadow-sm border-l-4 border-l-primary mb-4">
          <CardContent className="p-5">
            <div className="flex items-center gap-3 flex-wrap">
              <span className="text-sm text-muted-foreground">Current state:</span>
              <span className={cn("inline-flex items-center text-sm font-medium border rounded-full px-3 py-1", CARE_STATE_COLORS[currentState] ?? "bg-muted")}>
                {CARE_STATE_LABELS[currentState] ?? currentState}
              </span>
              {currentPathway && (
                <span className={cn("inline-flex items-center text-sm font-medium border rounded-full px-3 py-1", PATHWAY_COLORS[currentPathway] ?? "bg-muted")}>
                  {PATHWAY_LABELS[currentPathway] ?? currentPathway}
                </span>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Add event form */}
        <Card className="shadow-sm mb-4">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Plus className="w-4 h-4" /> Add Pathway Event
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs font-medium">New State</Label>
                <Select value={pathwayForm.state} onValueChange={(v) => setPathwayForm((f) => ({ ...f, state: v }))}>
                  <SelectTrigger><SelectValue placeholder="Select state" /></SelectTrigger>
                  <SelectContent>
                    {CARE_STATES.map((s) => (
                      <SelectItem key={s} value={s}>{CARE_STATE_LABELS[s] ?? s}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label className="text-xs font-medium">Event Date</Label>
                <Input type="date" value={pathwayForm.eventDate} onChange={(e) => setPathwayForm((f) => ({ ...f, eventDate: e.target.value }))} />
              </div>
              <div className="space-y-1">
                <Label className="text-xs font-medium">Clinician</Label>
                <Input value={pathwayForm.clinician} onChange={(e) => setPathwayForm((f) => ({ ...f, clinician: e.target.value }))} placeholder="Dr. Name" />
              </div>
              <div className="space-y-1">
                <Label className="text-xs font-medium">Assign Pathway</Label>
                <Select value={pathwayForm.pathwayAssigned} onValueChange={(v) => setPathwayForm((f) => ({ ...f, pathwayAssigned: v }))}>
                  <SelectTrigger><SelectValue placeholder="Optional" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None</SelectItem>
                    {PATHWAYS.map((p) => (
                      <SelectItem key={p} value={p}>{PATHWAY_LABELS[p] ?? p}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-1">
              <Label className="text-xs font-medium">Notes</Label>
              <Textarea value={pathwayForm.notes} onChange={(e) => setPathwayForm((f) => ({ ...f, notes: e.target.value }))} placeholder="Clinical notes, rationale, next steps..." rows={2} />
            </div>
            <Button onClick={handlePathwaySubmit} disabled={pathwayMutation.isPending} size="sm">
              {pathwayMutation.isPending ? "Adding..." : "Add Event"}
            </Button>
          </CardContent>
        </Card>

        {/* Timeline */}
        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Timeline</h3>
          {events.length === 0 ? (
            <Card className="shadow-sm">
              <CardContent className="py-10 text-center text-sm text-muted-foreground">
                No pathway events yet. Use the form above to record the first event.
              </CardContent>
            </Card>
          ) : (
            <div className="relative space-y-4 pl-6">
              {/* Vertical line */}
              <div className="absolute left-[11px] top-2 bottom-2 w-0.5 bg-border" />
              {events.map((event, i) => (
                <div key={event.id ?? i} className="relative">
                  <div className={cn("absolute left-[-18px] top-1 w-3 h-3 rounded-full border-2 border-background", CARE_STATE_COLORS[event.state]?.split(" ")[0]?.replace("bg-", "bg-") ?? "bg-muted")} />
                  <Card className="shadow-sm">
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className={cn("text-xs font-medium border rounded-full px-2 py-0.5", CARE_STATE_COLORS[event.state] ?? "bg-muted")}>
                              {CARE_STATE_LABELS[event.state] ?? event.state}
                            </span>
                            <span className="text-xs text-muted-foreground flex items-center gap-1">
                              <Clock className="w-3 h-3" />{formatDate(event.eventDate)}
                            </span>
                          </div>
                          {event.clinician && <p className="text-xs text-muted-foreground mt-1">{event.clinician}</p>}
                          {event.pathwayAssigned && (
                            <span className={cn("inline-block text-xs font-medium border rounded-full px-2 py-0.5 mt-1", PATHWAY_COLORS[event.pathwayAssigned] ?? "bg-muted")}>
                              {PATHWAY_LABELS[event.pathwayAssigned] ?? event.pathwayAssigned}
                            </span>
                          )}
                          {event.notes && <p className="text-xs text-muted-foreground mt-2 bg-muted/50 rounded p-2">{event.notes}</p>}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
