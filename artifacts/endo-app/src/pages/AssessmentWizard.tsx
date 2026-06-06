import { useState } from "react";
import { Link, useParams, useLocation } from "wouter";
import { useGetPatient, useCreateAssessment, getListPatientAssessmentsQueryKey, getListPatientsQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import TriageBadge from "@/components/TriageBadge";
import StageBadge from "@/components/StageBadge";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, ArrowRight, CheckCircle2, Activity } from "lucide-react";
import { cn } from "@/lib/utils";

type TriageLevel = "urgent" | "high" | "moderate" | "routine";

type Pathway = "medical" | "surgery_general" | "surgery_specialist" | "chronic_pain" | "combined" | "watchful_waiting";

function computePreview(d: FormState): {
  triageLevel: TriageLevel;
  triageScore: number;
  suggestedStage: string;
  suggestedPathway: Pathway;
  pathwayJustification: string;
  mdtRequired: boolean;
  bsgeReferral: boolean;
  mriRequired: boolean;
  avoidGnRH: boolean;
  fertilityReferral: boolean;
  painClinic: boolean;
  psychSupport: boolean;
} {
  let score = 0;
  const maxPain = Math.max(d.dysmenorrhea, d.chronicPelvicPain, d.dyspareunia, d.dyschezia, d.dysuria);
  score += maxPain * 2;
  score += d.impactOnQuality * 2;
  if (d.infertilityHistory) score += 15;
  if (d.previousSurgery) score += 10;
  if (d.familyHistory) score += 8;
  if (d.symptomDurationMonths > 24) score += 10;
  else if (d.symptomDurationMonths > 12) score += 6;
  else if (d.symptomDurationMonths > 6) score += 3;
  if (d.irregularBleeding) score += 5;
  if (d.bloating) score += 2;
  if (d.fatigue) score += 2;

  let triageLevel: TriageLevel;
  if (score >= 70) triageLevel = "urgent";
  else if (score >= 45) triageLevel = "high";
  else if (score >= 25) triageLevel = "moderate";
  else triageLevel = "routine";

  const severePain = d.dysmenorrhea >= 7 || d.chronicPelvicPain >= 7;
  const deepPain = d.dyspareunia >= 7 || d.dyschezia >= 7;
  let suggestedStage: string;
  if (score >= 70 || (severePain && deepPain && d.infertilityHistory)) suggestedStage = "Stage IV";
  else if (score >= 45 || (severePain && (d.infertilityHistory || d.previousSurgery))) suggestedStage = "Stage III";
  else if (score >= 25 || severePain) suggestedStage = "Stage II";
  else suggestedStage = "Stage I";

  // Pathway determination
  const deepEndoSuspected = d.bowelInvolvement || d.bladderInvolvement || d.uretericInvolvement;
  const persistentSymptoms = d.symptomDurationMonths > 6 && (d.previousSurgery || score >= 25);
  const firstPresentation = d.symptomDurationMonths <= 6 && !d.previousSurgery;

  let suggestedPathway: Pathway = "medical";
  const reasons: string[] = [];
  let mdtRequired = false;
  let bsgeReferral = false;
  let mriRequired = false;
  let avoidGnRH = false;
  let fertilityReferral = false;
  let painClinic = false;
  let psychSupport = false;

  if (deepEndoSuspected) {
    suggestedPathway = "surgery_specialist";
    if (d.bowelInvolvement) reasons.push("Bowel involvement");
    if (d.bladderInvolvement) reasons.push("Bladder involvement");
    if (d.uretericInvolvement) reasons.push("Ureteric involvement");
    mdtRequired = true;
    bsgeReferral = true;
    mriRequired = true;
  } else if (d.negativeLaparoscopy && d.chronicPainPredominant) {
    suggestedPathway = "chronic_pain";
    reasons.push("Chronic pain predominant with negative laparoscopy");
    painClinic = true;
    psychSupport = true;
  } else if (persistentSymptoms && !deepEndoSuspected && !d.symptomsControlledOnMedication) {
    suggestedPathway = "surgery_general";
    reasons.push("Persistent symptoms not responding to medical management");
  } else if (firstPresentation || d.symptomsControlledOnMedication) {
    suggestedPathway = "medical";
    if (firstPresentation) reasons.push("First presentation");
    if (d.symptomsControlledOnMedication) reasons.push("Symptoms controlled on medication");
  }

  if (d.fertilityPriority) {
    avoidGnRH = true;
    fertilityReferral = true;
    reasons.push("Fertility priority — avoid GnRH, consider fertility referral");
  }

  if (d.previousSurgery && persistentSymptoms) {
    bsgeReferral = true;
    reasons.push("Recurrent symptoms after previous surgery");
  }

  const pathwayJustification = reasons.join("; ");

  return {
    triageLevel, triageScore: score, suggestedStage,
    suggestedPathway, pathwayJustification,
    mdtRequired, bsgeReferral, mriRequired,
    avoidGnRH, fertilityReferral, painClinic, psychSupport,
  };
}

interface FormState {
  assessmentDate: string;
  dysmenorrhea: number;
  chronicPelvicPain: number;
  dyspareunia: number;
  dyschezia: number;
  dysuria: number;
  infertilityHistory: boolean;
  previousSurgery: boolean;
  familyHistory: boolean;
  symptomDurationMonths: number;
  impactOnQuality: number;
  irregularBleeding: boolean;
  bloating: boolean;
  fatigue: boolean;
  bowelInvolvement: boolean;
  bladderInvolvement: boolean;
  uretericInvolvement: boolean;
  fertilityPriority: boolean;
  negativeLaparoscopy: boolean;
  chronicPainPredominant: boolean;
  symptomsControlledOnMedication: boolean;
  previousTreatmentHistory: string;
  clinicianNotes: string;
}

const defaultForm: FormState = {
  assessmentDate: new Date().toISOString().split("T")[0],
  dysmenorrhea: 0,
  chronicPelvicPain: 0,
  dyspareunia: 0,
  dyschezia: 0,
  dysuria: 0,
  infertilityHistory: false,
  previousSurgery: false,
  familyHistory: false,
  symptomDurationMonths: 0,
  impactOnQuality: 0,
  irregularBleeding: false,
  bloating: false,
  fatigue: false,
  bowelInvolvement: false,
  bladderInvolvement: false,
  uretericInvolvement: false,
  fertilityPriority: false,
  negativeLaparoscopy: false,
  chronicPainPredominant: false,
  symptomsControlledOnMedication: false,
  previousTreatmentHistory: "",
  clinicianNotes: "",
};

const STEPS = ["Pain Scores", "Risk Factors", "Deep Endometriosis", "Pathway Modifiers", "Review"];

function PainSlider({
  label, description, value, onChange,
}: { label: string; description: string; value: number; onChange: (v: number) => void }) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <div>
          <Label className="text-sm font-medium">{label}</Label>
          <p className="text-xs text-muted-foreground">{description}</p>
        </div>
        <span className={cn(
          "text-xl font-bold w-10 text-right",
          value >= 7 ? "text-red-500" : value >= 4 ? "text-amber-500" : "text-green-600"
        )}>{value}</span>
      </div>
      <Slider
        min={0} max={10} step={1}
        value={[value]}
        onValueChange={([v]) => onChange(v)}
        className="cursor-pointer"
      />
      <div className="flex justify-between text-[10px] text-muted-foreground">
        <span>None</span><span>Moderate</span><span>Severe</span>
      </div>
    </div>
  );
}

function BooleanToggle({ label, description, value, onChange }: { label: string; description: string; value: boolean; onChange: (v: boolean) => void }) {
  return (
    <div className="flex items-center justify-between py-3 border-b last:border-0">
      <div>
        <Label className="text-sm font-medium cursor-pointer">{label}</Label>
        <p className="text-xs text-muted-foreground">{description}</p>
      </div>
      <Switch checked={value} onCheckedChange={onChange} />
    </div>
  );
}

export default function AssessmentWizard() {
  const { id } = useParams<{ id: string }>();
  const patientId = parseInt(id);
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [step, setStep] = useState(0);
  const [form, setForm] = useState<FormState>(defaultForm);

  const { data: patient, isLoading } = useGetPatient(patientId, {
    query: { enabled: !!patientId, queryKey: ["getPatient", patientId] as const },
  });
  const mutation = useCreateAssessment();
  const preview = computePreview(form);

  function update<K extends keyof FormState>(k: K, v: FormState[K]) {
    setForm((f) => ({ ...f, [k]: v }));
  }

  function handleSubmit() {
    mutation.mutate(
      {
        data: {
          patientId,
          assessmentDate: form.assessmentDate,
          dysmenorrhea: form.dysmenorrhea,
          chronicPelvicPain: form.chronicPelvicPain,
          dyspareunia: form.dyspareunia,
          dyschezia: form.dyschezia,
          dysuria: form.dysuria,
          infertilityHistory: form.infertilityHistory,
          previousSurgery: form.previousSurgery,
          familyHistory: form.familyHistory,
          symptomDurationMonths: form.symptomDurationMonths,
          impactOnQuality: form.impactOnQuality,
          irregularBleeding: form.irregularBleeding,
          bloating: form.bloating,
          fatigue: form.fatigue,
          bowelInvolvement: form.bowelInvolvement,
          bladderInvolvement: form.bladderInvolvement,
          uretericInvolvement: form.uretericInvolvement,
          fertilityPriority: form.fertilityPriority,
          negativeLaparoscopy: form.negativeLaparoscopy,
          chronicPainPredominant: form.chronicPainPredominant,
          symptomsControlledOnMedication: form.symptomsControlledOnMedication,
          previousTreatmentHistory: form.previousTreatmentHistory || undefined,
          clinicianNotes: form.clinicianNotes || undefined,
        },
      },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListPatientAssessmentsQueryKey(patientId) });
          queryClient.invalidateQueries({ queryKey: getListPatientsQueryKey() });
          toast({
            title: "Assessment saved",
            description: `Pathway: ${preview.suggestedPathway}, Triage: ${preview.triageLevel}, Score: ${preview.triageScore}`,
          });
          navigate(`/patients/${patientId}`);
        },
        onError: () => {
          toast({ title: "Error", description: "Failed to save assessment.", variant: "destructive" });
        },
      }
    );
  }

  if (isLoading) return <Skeleton className="h-48 w-full max-w-2xl" />;

  return (
    <div className="max-w-2xl space-y-5">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" asChild>
          <Link href={`/patients/${patientId}`}><ArrowLeft className="w-4 h-4 mr-1" />Back</Link>
        </Button>
      </div>

      <div>
        <h1 className="text-2xl font-bold tracking-tight">Symptom Assessment</h1>
        {patient && <p className="text-sm text-muted-foreground mt-0.5">{patient.firstName} {patient.lastName}</p>}
      </div>

      {/* Live triage score */}
      <Card className="shadow-sm border-primary/20 bg-primary/5">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Activity className="w-4 h-4 text-primary" />
              <span className="text-sm font-medium text-primary">Live Triage Preview</span>
            </div>
            <div className="flex items-center gap-3">
              <StageBadge stage={preview.suggestedStage} />
              <TriageBadge level={preview.triageLevel} />
              <span className="text-xs text-muted-foreground">Score: <strong className="text-foreground">{preview.triageScore}</strong></span>
            </div>
          </div>
          <div className="mt-2 h-1.5 rounded-full bg-muted overflow-hidden">
            <div
              className={cn(
                "h-full rounded-full transition-all duration-300",
                preview.triageLevel === "urgent" ? "bg-red-500" :
                preview.triageLevel === "high" ? "bg-amber-500" :
                preview.triageLevel === "moderate" ? "bg-blue-500" : "bg-green-500"
              )}
              style={{ width: `${Math.min(100, (preview.triageScore / 80) * 100)}%` }}
            />
          </div>
        </CardContent>
      </Card>

      {/* Step indicator */}
      <div className="flex items-center gap-2">
        {STEPS.map((s, i) => (
          <div key={s} className="flex items-center gap-2 flex-1">
            <div className={cn(
              "w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold shrink-0",
              i < step ? "bg-primary text-primary-foreground" :
              i === step ? "bg-primary text-primary-foreground ring-2 ring-primary/30" :
              "bg-muted text-muted-foreground"
            )}>
              {i < step ? <CheckCircle2 className="w-4 h-4" /> : i + 1}
            </div>
            <span className={cn("text-xs hidden sm:block", i === step ? "text-foreground font-medium" : "text-muted-foreground")}>{s}</span>
            {i < STEPS.length - 1 && <div className="flex-1 h-px bg-border" />}
          </div>
        ))}
      </div>

      {/* Step content */}
      <Card className="shadow-sm">
        {step === 0 && (
          <>
            <CardHeader>
              <CardTitle className="text-base">Pain Scores</CardTitle>
              <CardDescription>Rate the severity of each symptom from 0 (none) to 10 (severe)</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <PainSlider label="Dysmenorrhea" description="Painful menstruation" value={form.dysmenorrhea} onChange={(v) => update("dysmenorrhea", v)} />
              <PainSlider label="Chronic Pelvic Pain" description="Ongoing pelvic pain outside of menstruation" value={form.chronicPelvicPain} onChange={(v) => update("chronicPelvicPain", v)} />
              <PainSlider label="Dyspareunia" description="Pain during or after intercourse" value={form.dyspareunia} onChange={(v) => update("dyspareunia", v)} />
              <PainSlider label="Dyschezia" description="Pain during bowel movements" value={form.dyschezia} onChange={(v) => update("dyschezia", v)} />
              <PainSlider label="Dysuria" description="Pain during urination" value={form.dysuria} onChange={(v) => update("dysuria", v)} />
            </CardContent>
          </>
        )}

        {step === 1 && (
          <>
            <CardHeader>
              <CardTitle className="text-base">Risk Factors & History</CardTitle>
              <CardDescription>Clinical and personal history relevant to diagnosis and staging</CardDescription>
            </CardHeader>
            <CardContent>
              <BooleanToggle label="Infertility History" description="Known difficulty conceiving or infertility diagnosis" value={form.infertilityHistory} onChange={(v) => update("infertilityHistory", v)} />
              <BooleanToggle label="Previous Endometriosis Surgery" description="Prior laparoscopy or surgical treatment for endometriosis" value={form.previousSurgery} onChange={(v) => update("previousSurgery", v)} />
              <BooleanToggle label="Family History" description="First-degree relative with confirmed endometriosis" value={form.familyHistory} onChange={(v) => update("familyHistory", v)} />
              <BooleanToggle label="Irregular Bleeding" description="Intermenstrual bleeding or irregular cycle pattern" value={form.irregularBleeding} onChange={(v) => update("irregularBleeding", v)} />

              <div className="space-y-2 mt-4">
                <Label className="text-sm font-medium">Symptom Duration</Label>
                <p className="text-xs text-muted-foreground">How long has the patient been experiencing symptoms?</p>
                <div className="flex items-center gap-3">
                  <Slider
                    min={0} max={120} step={1}
                    value={[form.symptomDurationMonths]}
                    onValueChange={([v]) => update("symptomDurationMonths", v)}
                    className="flex-1 cursor-pointer"
                  />
                  <span className="text-sm font-medium w-24 text-right">
                    {form.symptomDurationMonths === 0 ? "< 1 month" :
                     form.symptomDurationMonths < 12 ? `${form.symptomDurationMonths} months` :
                     `${Math.floor(form.symptomDurationMonths / 12)}yr ${form.symptomDurationMonths % 12}mo`}
                  </span>
                </div>
              </div>
            </CardContent>
          </>
        )}

        {step === 2 && (
          <>
            <CardHeader>
              <CardTitle className="text-base">Deep Endometriosis Indicators</CardTitle>
              <CardDescription>Signs of deep infiltrating disease affecting bowel, bladder, or ureters</CardDescription>
            </CardHeader>
            <CardContent>
              <BooleanToggle label="Bowel Involvement" description="Symptoms suggesting bowel endometriosis (rectal bleeding, tenesmus, bowel obstruction symptoms)" value={form.bowelInvolvement} onChange={(v) => update("bowelInvolvement", v)} />
              <BooleanToggle label="Bladder Involvement" description="Bladder endometriosis symptoms (cyclical haematuria, urgency, bladder pain)" value={form.bladderInvolvement} onChange={(v) => update("bladderInvolvement", v)} />
              <BooleanToggle label="Ureteric Involvement" description="Ureteric obstruction signs (hydronephrosis, flank pain, renal function concerns)" value={form.uretericInvolvement} onChange={(v) => update("uretericInvolvement", v)} />

              <div className="space-y-2 mt-4">
                <Label className="text-sm font-medium">Symptom Duration</Label>
                <p className="text-xs text-muted-foreground">How long has the patient been experiencing symptoms?</p>
                <div className="flex items-center gap-3">
                  <Slider
                    min={0} max={120} step={1}
                    value={[form.symptomDurationMonths]}
                    onValueChange={([v]) => update("symptomDurationMonths", v)}
                    className="flex-1 cursor-pointer"
                  />
                  <span className="text-sm font-medium w-24 text-right">
                    {form.symptomDurationMonths === 0 ? "< 1 month" :
                     form.symptomDurationMonths < 12 ? `${form.symptomDurationMonths} months` :
                     `${Math.floor(form.symptomDurationMonths / 12)}yr ${form.symptomDurationMonths % 12}mo`}
                  </span>
                </div>
              </div>
            </CardContent>
          </>
        )}

        {step === 3 && (
          <>
            <CardHeader>
              <CardTitle className="text-base">Pathway Modifiers</CardTitle>
              <CardDescription>Factors that modify the recommended care pathway</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <BooleanToggle label="Fertility Priority" description="Patient is actively trying to conceive or wishes to preserve fertility (avoids GnRH, triggers fertility referral)" value={form.fertilityPriority} onChange={(v) => update("fertilityPriority", v)} />
              <BooleanToggle label="Negative Laparoscopy" description="Previous laparoscopy was negative for endometriosis" value={form.negativeLaparoscopy} onChange={(v) => update("negativeLaparoscopy", v)} />
              <BooleanToggle label="Chronic Pain Predominant" description="Pain is the primary complaint with minimal structural findings" value={form.chronicPainPredominant} onChange={(v) => update("chronicPainPredominant", v)} />
              <BooleanToggle label="Symptoms Controlled on Medication" description="Current medication regimen is controlling symptoms effectively" value={form.symptomsControlledOnMedication} onChange={(v) => update("symptomsControlledOnMedication", v)} />

              <PainSlider
                label="Quality of Life Impact"
                description="Overall impact of symptoms on daily functioning (0 = minimal, 10 = completely debilitating)"
                value={form.impactOnQuality}
                onChange={(v) => update("impactOnQuality", v)}
              />
              <BooleanToggle label="Bloating" description="Cyclical or persistent abdominal bloating ('endo belly')" value={form.bloating} onChange={(v) => update("bloating", v)} />
              <BooleanToggle label="Fatigue" description="Significant fatigue affecting daily activities" value={form.fatigue} onChange={(v) => update("fatigue", v)} />

              <div className="space-y-1.5">
                <Label htmlFor="prev-treatment" className="text-sm font-medium">Previous Treatment History</Label>
                <Textarea
                  id="prev-treatment"
                  value={form.previousTreatmentHistory}
                  onChange={(e) => update("previousTreatmentHistory", e.target.value)}
                  placeholder="e.g. 'COC for 6 months — good response', 'GnRH failed — side effects', 'Laparoscopy 2022 — recurrence'..."
                  rows={3}
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="notes" className="text-sm font-medium">Clinician Notes</Label>
                <Textarea
                  id="notes"
                  value={form.clinicianNotes}
                  onChange={(e) => update("clinicianNotes", e.target.value)}
                  placeholder="Additional clinical observations, examination findings, or context..."
                  rows={3}
                />
              </div>
            </CardContent>
          </>
        )}

        {step === 4 && (
          <>
            <CardHeader>
              <CardTitle className="text-base">Assessment Summary</CardTitle>
              <CardDescription>Review triage, pathway, and recommendations before submitting</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Pathway recommendation */}
              <div className="p-4 rounded-lg border bg-primary/5 border-primary/20">
                <p className="text-xs text-muted-foreground uppercase tracking-wide mb-2">Recommended Pathway</p>
                <div className="flex items-center gap-2">
                  <span className={cn("inline-flex items-center text-sm font-semibold border rounded-full px-3 py-1",
                    preview.suggestedPathway === "surgery_specialist" ? "bg-purple-100 text-purple-800 border-purple-200" :
                    preview.suggestedPathway === "surgery_general" ? "bg-amber-100 text-amber-800 border-amber-200" :
                    preview.suggestedPathway === "chronic_pain" ? "bg-teal-100 text-teal-800 border-teal-200" :
                    "bg-blue-100 text-blue-800 border-blue-200"
                  )}>
                    {preview.suggestedPathway === "medical" ? "Medical Management" :
                     preview.suggestedPathway === "surgery_general" ? "General Surgery" :
                     preview.suggestedPathway === "surgery_specialist" ? "Specialist BSGE" :
                     preview.suggestedPathway === "chronic_pain" ? "Chronic Pain & Psych" :
                     preview.suggestedPathway}
                  </span>
                </div>
                <p className="text-sm text-muted-foreground mt-2">{preview.pathwayJustification}</p>
              </div>

              {/* Triage */}
              <div className="grid grid-cols-2 gap-3 p-4 bg-muted/40 rounded-lg">
                <div>
                  <p className="text-xs text-muted-foreground uppercase tracking-wide">Suggested Stage</p>
                  <div className="mt-1"><StageBadge stage={preview.suggestedStage} /></div>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground uppercase tracking-wide">Triage Level</p>
                  <div className="mt-1"><TriageBadge level={preview.triageLevel} /></div>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground uppercase tracking-wide">Triage Score</p>
                  <p className="text-2xl font-bold mt-0.5">{preview.triageScore}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground uppercase tracking-wide">Symptom Duration</p>
                  <p className="text-sm font-medium mt-0.5">
                    {form.symptomDurationMonths === 0 ? "< 1 month" :
                     form.symptomDurationMonths < 12 ? `${form.symptomDurationMonths} months` :
                     `${Math.floor(form.symptomDurationMonths / 12)}yr ${form.symptomDurationMonths % 12}mo`}
                  </p>
                </div>
              </div>

              {/* Flags */}
              <div className="flex flex-wrap gap-1.5">
                {preview.mdtRequired && <span className="text-xs bg-violet-100 text-violet-800 rounded-full px-2.5 py-1 font-medium">MDT Required</span>}
                {preview.bsgeReferral && <span className="text-xs bg-purple-100 text-purple-800 rounded-full px-2.5 py-1 font-medium">BSGE Referral</span>}
                {preview.mriRequired && <span className="text-xs bg-cyan-100 text-cyan-800 rounded-full px-2.5 py-1 font-medium">MRI Required</span>}
                {preview.avoidGnRH && <span className="text-xs bg-rose-100 text-rose-800 rounded-full px-2.5 py-1 font-medium">Avoid GnRH</span>}
                {preview.fertilityReferral && <span className="text-xs bg-pink-100 text-pink-800 rounded-full px-2.5 py-1 font-medium">Fertility Referral</span>}
                {preview.painClinic && <span className="text-xs bg-teal-100 text-teal-800 rounded-full px-2.5 py-1 font-medium">Pain Clinic</span>}
                {preview.psychSupport && <span className="text-xs bg-indigo-100 text-indigo-800 rounded-full px-2.5 py-1 font-medium">Psych Support</span>}
                {form.infertilityHistory && <span className="text-xs bg-muted rounded-full px-2.5 py-1">Infertility History</span>}
                {form.previousSurgery && <span className="text-xs bg-muted rounded-full px-2.5 py-1">Previous Surgery</span>}
                {form.familyHistory && <span className="text-xs bg-muted rounded-full px-2.5 py-1">Family History</span>}
                {form.bowelInvolvement && <span className="text-xs bg-muted rounded-full px-2.5 py-1">Bowel Involvement</span>}
                {form.bladderInvolvement && <span className="text-xs bg-muted rounded-full px-2.5 py-1">Bladder Involvement</span>}
                {form.uretericInvolvement && <span className="text-xs bg-muted rounded-full px-2.5 py-1">Ureteric Involvement</span>}
                {form.fertilityPriority && <span className="text-xs bg-muted rounded-full px-2.5 py-1">Fertility Priority</span>}
                {form.negativeLaparoscopy && <span className="text-xs bg-muted rounded-full px-2.5 py-1">Negative Laparoscopy</span>}
                {form.chronicPainPredominant && <span className="text-xs bg-muted rounded-full px-2.5 py-1">Chronic Pain Predominant</span>}
                {form.symptomsControlledOnMedication && <span className="text-xs bg-muted rounded-full px-2.5 py-1">Controlled on Medication</span>}
              </div>

              {form.clinicianNotes && (
                <p className="text-sm text-muted-foreground bg-muted/50 rounded p-3">{form.clinicianNotes}</p>
              )}
            </CardContent>
          </>
        )}
      </Card>

      <div className="flex justify-between">
        <Button variant="outline" onClick={() => step === 0 ? null : setStep(step - 1)} disabled={step === 0}>
          <ArrowLeft className="w-4 h-4 mr-1" />Back
        </Button>
        {step < 4 ? (
          <Button onClick={() => setStep(step + 1)}>
            Next<ArrowRight className="w-4 h-4 ml-1" />
          </Button>
        ) : (
          <Button onClick={handleSubmit} disabled={mutation.isPending}>
            {mutation.isPending ? "Saving..." : "Submit Assessment"}
          </Button>
        )}
      </div>
    </div>
  );
}
