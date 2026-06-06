import { useState } from "react";
import { Link, useParams } from "wouter";
import {
  useGetPatient,
  useListPatientSurgeries,
  useCreateSurgery,
  getListPatientSurgeriesQueryKey,
  useGetSurgicalTriage,
  useGetPatientInvestigations,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import {
  ArrowLeft, Plus, Scissors, Save, ChevronRight, Siren, AlertTriangle,
  CheckCircle2, XCircle, Hospital, Shield, UserCheck, Stethoscope,
  ScanLine, ClipboardList, Clock, Calendar,
} from "lucide-react";
import { formatDate, CARE_STATE_LABELS, CARE_STATE_COLORS, PATHWAY_LABELS, PATHWAY_COLORS } from "@/lib/triage";
import { cn } from "@/lib/utils";

const PROCEDURE_TYPES = [
  "Laparoscopic diagnostic",
  "Laparoscopic excision",
  "Laparoscopic ablation",
  "Laparoscopic cystectomy",
  "Laparoscopic adnexectomy",
  "Laparoscopic hysterectomy",
  "Open surgery",
  "Robotic surgery",
  "Other",
];

const RAFS_STAGES = ["Stage I", "Stage II", "Stage III", "Stage IV"];
const ENZIAN_SCORES = ["A1", "A2", "A3", "B1", "B2", "B3", "C1", "C2", "C3", "D1", "D2", "D3"];
const LOCATIONS = [
  "Peritoneal", "Ovarian (Right)", "Ovarian (Left)", "Rectovaginal", "Bowel", "Bladder", "Ureteric", "Diaphragm", "Other",
];

export default function Surgery() {
  const { id } = useParams<{ id: string }>();
  const patientId = parseInt(id);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: patient, isLoading: patLoading } = useGetPatient(patientId, {
    query: { enabled: !!patientId, queryKey: ["getPatient", patientId] as const },
  });
  const { data: surgeries, isLoading: surgLoading } = useListPatientSurgeries(patientId, {
    query: { enabled: !!patientId, queryKey: ["listPatientSurgeries", patientId] as const },
  });
  const mutation = useCreateSurgery();

  const { data: triage, isLoading: triageLoading } = useGetSurgicalTriage(
    { patientId },
    { query: { enabled: !!patientId, queryKey: ["surgicalTriage", patientId] as const } }
  );
  const { data: investigations } = useGetPatientInvestigations(patientId, {
    query: { enabled: !!patientId, queryKey: ["getPatientInvestigations", patientId] as const },
  });

  const [showForm, setShowForm] = useState(false);
  const [overriddenList, setOverriddenList] = useState<string | null>(null);
  const [showConfirm, setShowConfirm] = useState(false);

  const [form, setForm] = useState<{
    procedureType: string;
    plannedDate: string;
    actualDate: string;
    surgeon: string;
    surgeonGrade: string;
    centre: string;
    bsgeAccredited: boolean;
    rafsStage: string;
    enzianScore: string;
    locations: string[];
    endometriomaPresent: boolean;
    endometriomaRight: boolean;
    endometriomaLeft: boolean;
    endometriomaRightSize: string;
    endometriomaLeftSize: string;
    deepEndometriosis: boolean;
    deepEndometriosisLocation: string;
    adhesions: boolean;
    adhesionsSeverity: string;
    complications: boolean;
    complicationsDetails: string;
    estimatedBloodLoss: string;
    operativeTime: string;
    histologyConfirmed: boolean;
    histologyDetails: string;
    postOpHormonalPlan: string;
    followUpRequired: boolean;
    followUpWeeks: number;
    outcome: string;
    consentObtained: boolean;
    consentDate: string;
    mdtDiscussed: boolean;
    mdtDate: string;
    preOpNotes: string;
    intraOpNotes: string;
    postOpNotes: string;
  }>({
    procedureType: "",
    plannedDate: "",
    actualDate: "",
    surgeon: "",
    surgeonGrade: "",
    centre: "",
    bsgeAccredited: false,
    rafsStage: "",
    enzianScore: "",
    locations: [],
    endometriomaPresent: false,
    endometriomaRight: false,
    endometriomaLeft: false,
    endometriomaRightSize: "",
    endometriomaLeftSize: "",
    deepEndometriosis: false,
    deepEndometriosisLocation: "",
    adhesions: false,
    adhesionsSeverity: "",
    complications: false,
    complicationsDetails: "",
    estimatedBloodLoss: "",
    operativeTime: "",
    histologyConfirmed: false,
    histologyDetails: "",
    postOpHormonalPlan: "",
    followUpRequired: true,
    followUpWeeks: 6,
    outcome: "",
    consentObtained: false,
    consentDate: "",
    mdtDiscussed: false,
    mdtDate: "",
    preOpNotes: "",
    intraOpNotes: "",
    postOpNotes: "",
  });

  const recList = overriddenList ?? triage?.recommendedList;
  const isSpecialist = recList === "specialist";
  const poolMet = triage?.matchedPooledCount ?? 0;
  const specMet = triage?.matchedSpecialistCount ?? 0;

  function toggleLocation(loc: string) {
    setForm((f) => ({
      ...f,
      locations: (f.locations as string[]).includes(loc)
        ? (f.locations as string[]).filter((l) => l !== loc)
        : [...(f.locations as string[]), loc],
    }));
  }

  function handleSubmit() {
    if (!form.procedureType) {
      toast({ title: "Required", description: "Procedure type is required.", variant: "destructive" });
      return;
    }
    mutation.mutate(
      { id: patientId, data: { ...form, patientId } },
      {
        onSuccess: () => {
          toast({ title: "Surgery recorded", description: "Operative record saved successfully." });
          queryClient.invalidateQueries({ queryKey: getListPatientSurgeriesQueryKey(patientId) });
          setShowForm(false);
          setForm({
            procedureType: "", plannedDate: "", actualDate: "", surgeon: "", surgeonGrade: "", centre: "", bsgeAccredited: false,
            rafsStage: "", enzianScore: "", locations: [], endometriomaPresent: false, endometriomaRight: false, endometriomaLeft: false,
            endometriomaRightSize: "", endometriomaLeftSize: "", deepEndometriosis: false, deepEndometriosisLocation: "",
            adhesions: false, adhesionsSeverity: "", complications: false, complicationsDetails: "", estimatedBloodLoss: "",
            operativeTime: "", histologyConfirmed: false, histologyDetails: "", postOpHormonalPlan: "", followUpRequired: true,
            followUpWeeks: 6, outcome: "", consentObtained: false, consentDate: "", mdtDiscussed: false, mdtDate: "",
            preOpNotes: "", intraOpNotes: "", postOpNotes: "",
          } as typeof form);
        },
        onError: () => {
          toast({ title: "Error", description: "Failed to save surgery record.", variant: "destructive" });
        },
      }
    );
  }

  if (patLoading || surgLoading || triageLoading) {
    return (
      <div className="max-w-4xl space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-48 w-full" />
        <Skeleton className="h-48 w-full" />
      </div>
    );
  }

  return (
    <div className="max-w-4xl space-y-5">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" asChild>
          <Link href={`/patients/${patientId}`}><ArrowLeft className="w-4 h-4 mr-1" />Back</Link>
        </Button>
      </div>

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Surgery & Follow-up</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {patient ? `${patient.firstName} ${patient.lastName}` : ""} — Surgical triage, operative records & follow-up
          </p>
        </div>
        <Button size="sm" onClick={() => setShowForm(!showForm)}>
          <Plus className="w-4 h-4 mr-1.5" />{showForm ? "Cancel" : "Add Surgery"}
        </Button>
      </div>

      {/* ── Surgical Triage Section ───────────────────────────────────────────── */}
      {triage && (
        <>
          {/* NICE NG73 Recommendation Banner */}
          <Card className={cn(
            "shadow-sm border-l-4",
            isSpecialist ? "border-l-rose-500 bg-rose-50/40" : "border-l-blue-500 bg-blue-50/40"
          )}>
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                {isSpecialist ? (
                  <>
                    <AlertTriangle className="w-4 h-4 text-rose-600" />
                    Specialist (BSGE Centre) Recommended
                  </>
                ) : (
                  <>
                    <UserCheck className="w-4 h-4 text-blue-600" />
                    Pooled (General Gynaecology) Recommended
                  </>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-sm text-muted-foreground leading-relaxed">
                {triage.recommendationRationale}
              </p>
              <div className="flex flex-wrap gap-2">
                {triage.mdtRequired && (
                  <Badge variant="outline" className="flex items-center gap-1 border-amber-400 text-amber-700">
                    <AlertTriangle className="w-3 h-3" />MDT Required
                  </Badge>
                )}
                {triage.bsgeReferral && (
                  <Badge variant="outline" className="flex items-center gap-1 border-rose-400 text-rose-700">
                    <Hospital className="w-3 h-3" />BSGE Referral
                  </Badge>
                )}
                <Badge variant="outline" className="flex items-center gap-1">
                  <Scissors className="w-3 h-3" />{triage.surgeonGrade}
                </Badge>
                <Badge variant="outline" className="flex items-center gap-1">
                  <Shield className="w-3 h-3" />{triage.listStatus}
                </Badge>
              </div>
            </CardContent>
          </Card>

          {/* Override status banner */}
          {overriddenList && (
            <div className="flex items-center gap-2 text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
              <AlertTriangle className="w-4 h-4 flex-shrink-0" />
              <span>
                Clinician override active: patient placed on{" "}
                <strong>{overriddenList === "specialist" ? "Specialist" : "Pooled"}</strong>{" "}
                list against the AI recommendation.
              </span>
              <Button type="button" variant="ghost" size="sm" className="h-6 px-2 text-xs ml-auto" onClick={() => setOverriddenList(null)}>
                Remove Override
              </Button>
            </div>
          )}

          {/* Criteria Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Pooled Criteria */}
            <Card className="shadow-sm">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full bg-blue-500 inline-block" />
                  Pooled List — General Gynaecology
                </CardTitle>
                <CardDescription className="text-xs">
                  NICE NG73 §1.5: Peritoneal/superficial endo only; endometrioma &lt;3cm without deep endo features; failed medical management
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-2">
                {triage.pooledCriteria?.map((c, i) => (
                  <div
                    key={i}
                    className={cn(
                      "flex items-start gap-3 rounded-lg p-2.5 border transition-colors",
                      c.met
                        ? "bg-blue-50 border-blue-200 text-blue-900"
                        : "bg-muted/20 border-transparent text-muted-foreground"
                    )}
                  >
                    {c.met ? (
                      <CheckCircle2 className="w-4 h-4 text-blue-600 mt-0.5 shrink-0" />
                    ) : (
                      <XCircle className="w-4 h-4 text-muted-foreground mt-0.5 shrink-0" />
                    )}
                    <div className="flex-1">
                      <div className="text-sm font-medium">{c.label}</div>
                      <div className="text-xs opacity-80 mt-0.5">{c.criterion}</div>
                      <div className="text-[10px] text-muted-foreground mt-1">{c.source}</div>
                    </div>
                    {c.met && (
                      <span className="text-[10px] font-semibold bg-blue-100 text-blue-800 px-2 py-0.5 rounded-full shrink-0">
                        MATCHED
                      </span>
                    )}
                  </div>
                ))}
                <div className="text-xs text-muted-foreground pt-1">
                  Matched: <strong>{poolMet}</strong> of {triage.pooledCriteria?.length}
                </div>
              </CardContent>
            </Card>

            {/* Specialist Criteria */}
            <Card className="shadow-sm">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full bg-rose-500 inline-block" />
                  Specialist List — BSGE Centre
                </CardTitle>
                <CardDescription className="text-xs">
                  NICE NG73 §1.5: Deep endo ≥5mm; bowel/bladder/ureter involvement; large endometrioma with deep endo features; extrapelvic; recurrent after general surgery; hydronephrosis
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-2">
                {triage.specialistCriteria?.map((c, i) => (
                  <div
                    key={i}
                    className={cn(
                      "flex items-start gap-3 rounded-lg p-2.5 border transition-colors",
                      c.met
                        ? "bg-rose-50 border-rose-200 text-rose-900"
                        : "bg-muted/20 border-transparent text-muted-foreground"
                    )}
                  >
                    {c.met ? (
                      <CheckCircle2 className="w-4 h-4 text-rose-600 mt-0.5 shrink-0" />
                    ) : (
                      <XCircle className="w-4 h-4 text-muted-foreground mt-0.5 shrink-0" />
                    )}
                    <div className="flex-1">
                      <div className="text-sm font-medium">{c.label}</div>
                      <div className="text-xs opacity-80 mt-0.5">{c.criterion}</div>
                      <div className="text-[10px] text-muted-foreground mt-1">{c.source}</div>
                    </div>
                    {c.met && (
                      <span className="text-[10px] font-semibold bg-rose-100 text-rose-800 px-2 py-0.5 rounded-full shrink-0">
                        MATCHED
                      </span>
                    )}
                  </div>
                ))}
                <div className="text-xs text-muted-foreground pt-1">
                  Matched: <strong>{specMet}</strong> of {triage.specialistCriteria?.length}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Investigation summary */}
          {investigations && (
            <Card className="shadow-sm">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Current Investigation Summary</CardTitle>
              </CardHeader>
              <CardContent className="text-sm text-muted-foreground">
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  <div>
                    <span className="text-[10px] uppercase text-muted-foreground">TVUS</span>
                    <div className="text-sm font-medium">{investigations.tvusCompleted ? "Completed" : "Not done"}</div>
                    {investigations.tvusDeepEndometriosis && <div className="text-xs text-rose-600">Deep endo found</div>}
                    {investigations.tvusEndometrioma && <div className="text-xs text-rose-600">Endometrioma present</div>}
                  </div>
                  <div>
                    <span className="text-[10px] uppercase text-muted-foreground">MRI</span>
                    <div className="text-sm font-medium">{investigations.mriCompleted ? "Completed" : "Not done"}</div>
                    {investigations.mriBowelInvolvement && <div className="text-xs text-rose-600">Bowel involvement</div>}
                    {investigations.mriBladderInvolvement && <div className="text-xs text-rose-600">Bladder involvement</div>}
                    {investigations.mriUretericInvolvement && <div className="text-xs text-rose-600">Ureteric involvement</div>}
                  </div>
                  <div>
                    <span className="text-[10px] uppercase text-muted-foreground">Laparoscopy</span>
                    <div className="text-sm font-medium">{investigations.laparoscopyCompleted ? "Completed" : "Not done"}</div>
                    {investigations.laparoscopyRafsStage && <div className="text-xs text-rose-600">{investigations.laparoscopyRafsStage}</div>}
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Action buttons */}
          <div className="flex flex-col gap-3">
            <div className="flex flex-wrap gap-3">
              <Button
                size="sm"
                className={cn(
                  isSpecialist ? "bg-rose-600 hover:bg-rose-700" : "bg-blue-600 hover:bg-blue-700"
                )}
                onClick={() => {
                  setShowConfirm(true);
                  toast({
                    title: `${isSpecialist ? "Specialist" : "Pooled"} list selected`,
                    description: "Patient added to the recommended surgical list per NICE NG73 §1.5.",
                  });
                }}
              >
                <CheckCircle2 className="w-4 h-4 mr-1.5" />
                Accept AI Recommendation — {isSpecialist ? "Specialist" : "Pooled"}
              </Button>

              <Button
                size="sm"
                variant="outline"
                className={cn(
                  isSpecialist ? "border-blue-400 text-blue-700" : "border-rose-400 text-rose-700"
                )}
                onClick={() => {
                  const other = isSpecialist ? "pooled" : "specialist";
                  setOverriddenList(other);
                  toast({
                    title: "Clinician override",
                    description: `Patient placed on ${other} list. Document rationale in notes.`,
                    variant: "destructive",
                  });
                }}
              >
                <AlertTriangle className="w-4 h-4 mr-1.5" />
                Override — Place on {isSpecialist ? "Pooled" : "Specialist"}
              </Button>
            </div>

            {/* Confirm + Notes */}
            {showConfirm && (
              <Card className="shadow-sm border-l-4 border-l-emerald-400 bg-emerald-50/30">
                <CardContent className="pt-4 space-y-3">
                  <p className="text-sm text-emerald-900">
                    <strong>Confirmed.</strong> Patient placed on{" "}
                    <strong>{isSpecialist ? "Specialist (BSGE Centre)" : "Pooled (General Gynaecology)"}</strong>{" "}
                    surgical waiting list.
                  </p>
                  <p className="text-xs text-emerald-800">
                    Surgeon grade: {triage.surgeonGrade} • List status: {triage.listStatus}
                    {triage.mdtRequired && " • MDT required"}
                    {triage.bsgeReferral && " • BSGE referral required"}
                  </p>
                </CardContent>
              </Card>
            )}
          </div>
        </>
      )}

      {/* No triage data */}
      {!triage && (
        <Card className="shadow-sm">
          <CardContent className="py-10 text-center">
            <Stethoscope className="w-8 h-8 mx-auto text-muted-foreground/30 mb-3" />
            <p className="text-sm text-muted-foreground mb-1">
              No assessment and investigations found for surgical triage.
            </p>
            <p className="text-xs text-muted-foreground">
              Complete Assessment and Investigations to compute NICE NG73 surgical triage.
            </p>
            <div className="flex gap-3 justify-center mt-4">
              <Button asChild size="sm">
                <Link href={`/patients/${patientId}/assess`}>
                  <Stethoscope className="w-4 h-4 mr-1" />Assessment
                </Link>
              </Button>
              <Button asChild size="sm" variant="outline">
                <Link href={`/patients/${patientId}/investigations`}>
                  <ScanLine className="w-4 h-4 mr-1" />Investigations
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* ── Operative Records Section ───────────────────────────────────────────── */}
      <div className="pt-6 border-t border-border">
        <div className="flex items-center gap-2 mb-4">
          <Scissors className="w-5 h-5 text-muted-foreground" />
          <h2 className="text-lg font-semibold tracking-tight">Operative Records</h2>
        </div>

        {/* Add surgery form */}
        {showForm && (
          <Card className="shadow-sm mb-4">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <Scissors className="w-4 h-4" /> New Operative Record
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs font-medium">Procedure Type</Label>
                  <select
                    className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm"
                    value={form.procedureType}
                    onChange={(e) => setForm((f) => ({ ...f, procedureType: e.target.value }))}
                  >
                    <option value="">Select type</option>
                    {PROCEDURE_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs font-medium">Planned Date</Label>
                  <Input type="date" value={form.plannedDate} onChange={(e) => setForm((f) => ({ ...f, plannedDate: e.target.value }))} />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs font-medium">Actual Date</Label>
                  <Input type="date" value={form.actualDate} onChange={(e) => setForm((f) => ({ ...f, actualDate: e.target.value }))} />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs font-medium">Surgeon</Label>
                  <Input value={form.surgeon} onChange={(e) => setForm((f) => ({ ...f, surgeon: e.target.value }))} placeholder="Dr. Name" />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs font-medium">Surgeon Grade</Label>
                  <Input value={form.surgeonGrade} onChange={(e) => setForm((f) => ({ ...f, surgeonGrade: e.target.value }))} placeholder="e.g. ST6, Consultant" />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs font-medium">Centre</Label>
                  <Input value={form.centre} onChange={(e) => setForm((f) => ({ ...f, centre: e.target.value }))} placeholder="Hospital name" />
                </div>
              </div>

              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <Checkbox id="bsgeAccredited" checked={form.bsgeAccredited} onCheckedChange={(c) => setForm((f) => ({ ...f, bsgeAccredited: c === true }))} />
                  <Label htmlFor="bsgeAccredited" className="text-sm font-normal">BSGE Accredited Centre</Label>
                </div>
                <div className="flex items-center gap-2">
                  <Checkbox id="mdtDiscussed" checked={form.mdtDiscussed} onCheckedChange={(c) => setForm((f) => ({ ...f, mdtDiscussed: c === true }))} />
                  <Label htmlFor="mdtDiscussed" className="text-sm font-normal">MDT Discussed</Label>
                </div>
                <div className="flex items-center gap-2">
                  <Checkbox id="consentObtained" checked={form.consentObtained} onCheckedChange={(c) => setForm((f) => ({ ...f, consentObtained: c === true }))} />
                  <Label htmlFor="consentObtained" className="text-sm font-normal">Consent Obtained</Label>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs font-medium">rAFS Stage</Label>
                  <select className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm" value={form.rafsStage} onChange={(e) => setForm((f) => ({ ...f, rafsStage: e.target.value }))}>
                    <option value="">Select</option>
                    {RAFS_STAGES.map((s) => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs font-medium">ENZIAN Score</Label>
                  <select className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm" value={form.enzianScore} onChange={(e) => setForm((f) => ({ ...f, enzianScore: e.target.value }))}>
                    <option value="">Select</option>
                    {ENZIAN_SCORES.map((s) => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs font-medium">Operative Time</Label>
                  <Input value={form.operativeTime} onChange={(e) => setForm((f) => ({ ...f, operativeTime: e.target.value }))} placeholder="e.g. 120 min" />
                </div>
              </div>

              <div className="space-y-1">
                <Label className="text-xs font-medium">Endometriosis Locations</Label>
                <div className="flex flex-wrap gap-2">
                  {LOCATIONS.map((loc) => (
                    <label key={loc} className={cn("flex items-center gap-1.5 px-3 py-1.5 rounded-md border text-sm cursor-pointer transition-colors", (form.locations as string[]).includes(loc) ? "bg-primary/10 border-primary/30" : "bg-muted/30 border-border")}>
                      <input type="checkbox" className="sr-only" checked={(form.locations as string[]).includes(loc)} onChange={() => toggleLocation(loc)} />
                      {loc}
                    </label>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs font-medium">Endometrioma Right Size</Label>
                  <Input value={form.endometriomaRightSize} onChange={(e) => setForm((f) => ({ ...f, endometriomaRightSize: e.target.value }))} placeholder="e.g. 3.2 cm" />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs font-medium">Endometrioma Left Size</Label>
                  <Input value={form.endometriomaLeftSize} onChange={(e) => setForm((f) => ({ ...f, endometriomaLeftSize: e.target.value }))} placeholder="e.g. 2.1 cm" />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs font-medium">Estimated Blood Loss</Label>
                  <Input value={form.estimatedBloodLoss} onChange={(e) => setForm((f) => ({ ...f, estimatedBloodLoss: e.target.value }))} placeholder="e.g. 200 mL" />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs font-medium">Follow-up (weeks)</Label>
                  <Input type="number" value={form.followUpWeeks} onChange={(e) => setForm((f) => ({ ...f, followUpWeeks: parseInt(e.target.value) || 0 }))} />
                </div>
              </div>

              <div className="space-y-1">
                <Label className="text-xs font-medium">Intra-operative Notes</Label>
                <Textarea value={form.intraOpNotes} onChange={(e) => setForm((f) => ({ ...f, intraOpNotes: e.target.value }))} placeholder="Detailed operative description..." rows={3} />
              </div>

              <Button onClick={handleSubmit} disabled={mutation.isPending}>
                <Save className="w-4 h-4 mr-2" />
                {mutation.isPending ? "Saving..." : "Save Surgery Record"}
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Surgery list */}
        <div className="space-y-3">
          {(surgeries ?? []).length === 0 && !showForm ? (
            <Card className="shadow-sm">
              <CardContent className="py-10 text-center text-sm text-muted-foreground">
                No surgery records yet. Click "Add Surgery" to create the first operative record.
              </CardContent>
            </Card>
          ) : (
            (surgeries ?? []).slice().reverse().map((s) => (
              <Card key={s.id} className="shadow-sm">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-semibold">{s.procedureType}</span>
                        {s.bsgeAccredited && <span className="text-[10px] font-medium bg-purple-100 text-purple-800 border border-purple-200 rounded-full px-2 py-0.5">BSGE</span>}
                        {s.rafsStage && <span className="text-[10px] font-medium bg-muted border rounded-full px-2 py-0.5">{s.rafsStage}</span>}
                        {s.enzianScore && <span className="text-[10px] font-medium bg-muted border rounded-full px-2 py-0.5">ENZIAN {s.enzianScore}</span>}
                      </div>
                      <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                        {s.actualDate && <span>Date: {formatDate(s.actualDate)}</span>}
                        {s.surgeon && <span>Surgeon: {s.surgeon}</span>}
                        {s.centre && <span>Centre: {s.centre}</span>}
                      </div>
                      {s.locations && s.locations.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-2">
                          {s.locations.map((loc: string, i: number) => (
                            <span key={i} className="text-[10px] font-medium bg-muted border rounded-full px-2 py-0.5">{loc}</span>
                          ))}
                        </div>
                      )}
                      {s.intraOpNotes && <p className="text-xs text-muted-foreground mt-2 bg-muted/50 rounded p-2">{s.intraOpNotes}</p>}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
