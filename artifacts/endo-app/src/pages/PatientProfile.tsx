import { Link, useParams } from "wouter";
import {
  useGetPatient,
  useListPatientAssessments,
  useListManagementPlans,
  getListManagementPlansQueryKey,
} from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import TriageBadge from "@/components/TriageBadge";
import StageBadge from "@/components/StageBadge";
import { Badge } from "@/components/ui/badge";
import { formatDate, APPROACH_LABELS, STATUS_COLORS, CARE_STATE_LABELS, CARE_STATE_COLORS, PATHWAY_LABELS, PATHWAY_COLORS } from "@/lib/triage";
import {
  ArrowLeft, Stethoscope, ClipboardList, User, Calendar,
  Mail, Phone, ChevronRight, AlertCircle, ScanLine, Route, Scissors,
  Siren, FlaskConical,
} from "lucide-react";
import { cn } from "@/lib/utils";

export default function PatientProfile() {
  const { id } = useParams<{ id: string }>();
  const patientId = parseInt(id);

  const { data: patient, isLoading: patLoading } = useGetPatient(patientId, {
    query: { enabled: !!patientId, queryKey: ["getPatient", patientId] as const },
  });
  const { data: assessments, isLoading: assLoading } = useListPatientAssessments(patientId, {
    query: { enabled: !!patientId, queryKey: ["listPatientAssessments", patientId] as const },
  });
  const { data: plans, isLoading: plansLoading } = useListManagementPlans(
    { patientId },
    { query: { enabled: !!patientId, queryKey: getListManagementPlansQueryKey({ patientId }) } }
  );

  if (patLoading) {
    return (
      <div className="space-y-4 max-w-4xl">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-32 w-full rounded-xl" />
        <Skeleton className="h-48 w-full rounded-xl" />
      </div>
    );
  }

  if (!patient) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-3">
        <AlertCircle className="w-10 h-10 text-muted-foreground/40" />
        <p className="text-muted-foreground">Patient not found.</p>
        <Button asChild size="sm" variant="outline"><Link href="/patients">Back to Patients</Link></Button>
      </div>
    );
  }

  return (
    <div className="max-w-4xl space-y-5">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" asChild>
          <Link href="/patients"><ArrowLeft className="w-4 h-4 mr-1" />Patients</Link>
        </Button>
      </div>

      {/* Patient header card */}
      <Card className="shadow-sm">
        <CardContent className="p-5">
          <div className="flex items-start gap-4">
            <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
              <span className="text-xl font-bold text-primary">
                {patient.firstName[0]}{patient.lastName[0]}
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-xl font-bold">{patient.firstName} {patient.lastName}</h1>
                <StageBadge stage={patient.currentStage} />
                <TriageBadge level={patient.triageLevel} />
                {patient.carePathwayState && (
                  <span className={cn("inline-flex items-center text-xs font-medium border rounded-full px-2.5 py-1", CARE_STATE_COLORS[patient.carePathwayState] ?? "bg-muted")}>
                    {CARE_STATE_LABELS[patient.carePathwayState] ?? patient.carePathwayState}
                  </span>
                )}
                {patient.currentPathway && (
                  <span className={cn("inline-flex items-center text-xs font-medium border rounded-full px-2.5 py-1", PATHWAY_COLORS[patient.currentPathway] ?? "bg-muted")}>
                    {PATHWAY_LABELS[patient.currentPathway] ?? patient.currentPathway}
                  </span>
                )}
              </div>
              <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2 text-sm text-muted-foreground">
                <span className="flex items-center gap-1.5"><Calendar className="w-3.5 h-3.5" />{formatDate(patient.dateOfBirth)}</span>
                {patient.email && <span className="flex items-center gap-1.5"><Mail className="w-3.5 h-3.5" />{patient.email}</span>}
                {patient.phone && <span className="flex items-center gap-1.5"><Phone className="w-3.5 h-3.5" />{patient.phone}</span>}
                {patient.lastAssessmentDate && (
                  <span className="flex items-center gap-1.5"><Stethoscope className="w-3.5 h-3.5" />Last assessed: {formatDate(patient.lastAssessmentDate)}</span>
                )}
                {patient.referralDate && (
                  <span className="flex items-center gap-1.5"><Route className="w-3.5 h-3.5" />Referred: {formatDate(patient.referralDate)}</span>
                )}
                {patient.bsgeCentre && (
                  <span className="flex items-center gap-1.5"><Scissors className="w-3.5 h-3.5" />{patient.bsgeCentre}</span>
                )}
              </div>
              {patient.notes && (
                <p className="mt-2 text-sm text-muted-foreground bg-muted/50 rounded-md px-3 py-2">{patient.notes}</p>
              )}
            </div>
            <div className="flex flex-wrap gap-2 shrink-0">
              <Button size="sm" asChild title="Step 1: Clinical assessment — captures symptoms, suggests investigations">
                <Link href={`/patients/${patientId}/assess`}>
                  <Stethoscope className="w-4 h-4 mr-1.5" />Assess
                </Link>
              </Button>
              <Button size="sm" variant="outline" asChild title="Step 2: Record imaging and investigation results">
                <Link href={`/patients/${patientId}/investigations`}>
                  <ScanLine className="w-4 h-4 mr-1.5" />Investigations
                </Link>
              </Button>
              <Button size="sm" variant="outline" asChild title="Step 3: Management plan — based on assessment + investigations + pathway">
                <Link href={`/patients/${patientId}/plan`}>
                  <ClipboardList className="w-4 h-4 mr-1.5" />Management Plan
                </Link>
              </Button>
              <Button size="sm" variant="outline" asChild title="Surgical triage, operative records and follow-up management">
                <Link href={`/patients/${patientId}/surgery`}>
                  <Scissors className="w-4 h-4 mr-1.5" />Surgery & Follow-up
                </Link>
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* NICE NG73 Clinical Workflow */}
      <Card className="shadow-sm bg-muted/30 border-dashed">
        <CardContent className="py-3 px-4">
          <p className="text-[11px] text-muted-foreground uppercase tracking-wide font-medium mb-2">NICE NG73 Clinical Pathway</p>
          <div className="flex items-center gap-1 flex-wrap">
            <Link href={`/patients/${patientId}/assess`} className="flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-full bg-primary/10 text-primary hover:bg-primary/20 transition-colors">
              <Stethoscope className="w-3 h-3" />1. Assessment
            </Link>
            <ChevronRight className="w-3.5 h-3.5 text-muted-foreground" />
            <Link href={`/patients/${patientId}/investigations`} className="flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-full bg-cyan-100 text-cyan-800 hover:bg-cyan-200 transition-colors">
              <ScanLine className="w-3 h-3" />2. Investigations
            </Link>
            <ChevronRight className="w-3.5 h-3.5 text-muted-foreground" />
            <Link href={`/patients/${patientId}/plan`} className="flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-full bg-emerald-100 text-emerald-800 hover:bg-emerald-200 transition-colors">
              <ClipboardList className="w-3 h-3" />3. Management Plan
            </Link>
          </div>
          <p className="text-[10px] text-muted-foreground mt-1.5">Assessment suggests which investigations to order → Management plan is decided from both clinical picture and investigation findings</p>
        </CardContent>
      </Card>

      {/* Tabs: Assessments, Plans */}
      <Tabs defaultValue="assessments">
        <TabsList className="w-full sm:w-auto">
          <TabsTrigger value="assessments" className="flex-1 sm:flex-none">
            Assessments ({assLoading ? "…" : assessments?.length ?? 0})
          </TabsTrigger>
          <TabsTrigger value="plans" className="flex-1 sm:flex-none">
            Management Plans ({plansLoading ? "…" : plans?.length ?? 0})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="assessments" className="mt-4 space-y-3">
          {assLoading ? (
            <Skeleton className="h-32 w-full" />
          ) : (assessments?.length ?? 0) === 0 ? (
            <Card className="shadow-sm">
              <CardContent className="py-12 text-center">
                <Stethoscope className="w-8 h-8 mx-auto text-muted-foreground/30 mb-3" />
                <p className="text-sm text-muted-foreground mb-3">No assessments recorded yet.</p>
                <Button asChild size="sm">
                  <Link href={`/patients/${patientId}/assess`}>Start Assessment</Link>
                </Button>
              </CardContent>
            </Card>
          ) : (
            (assessments ?? []).slice().reverse().map((a) => (
              <Card key={a.id} className="shadow-sm">
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-sm font-semibold">{formatDate(a.assessmentDate)}</CardTitle>
                    <div className="flex items-center gap-2">
                      <StageBadge stage={a.suggestedStage} />
                      <TriageBadge level={a.triageLevel} />
                      <span className="text-xs text-muted-foreground">Score: <strong>{a.triageScore}</strong></span>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="grid grid-cols-3 sm:grid-cols-5 gap-3 text-xs mb-3">
                    {[
                      ["Dysmenorrhea", a.dysmenorrhea],
                      ["Pelvic Pain", a.chronicPelvicPain],
                      ["Dyspareunia", a.dyspareunia],
                      ["Dyschezia", a.dyschezia],
                      ["Dysuria", a.dysuria],
                    ].map(([label, val]) => (
                      <div key={String(label)} className="bg-muted/50 rounded-md p-2 text-center">
                        <div className="text-muted-foreground text-[10px] uppercase tracking-wide">{label}</div>
                        <div className={cn(
                          "text-lg font-bold mt-0.5",
                          Number(val) >= 7 ? "text-red-500" : Number(val) >= 4 ? "text-amber-500" : "text-foreground"
                        )}>{val}/10</div>
                      </div>
                    ))}
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {a.infertilityHistory && <Badge variant="outline" className="text-xs">Infertility History</Badge>}
                    {a.previousSurgery && <Badge variant="outline" className="text-xs">Previous Surgery</Badge>}
                    {a.familyHistory && <Badge variant="outline" className="text-xs">Family History</Badge>}
                    {a.irregularBleeding && <Badge variant="outline" className="text-xs">Irregular Bleeding</Badge>}
                    {a.bloating && <Badge variant="outline" className="text-xs">Bloating</Badge>}
                    {a.fatigue && <Badge variant="outline" className="text-xs">Fatigue</Badge>}
                  </div>
                  {a.clinicianNotes && (
                    <p className="mt-2 text-xs text-muted-foreground bg-muted/50 rounded p-2">{a.clinicianNotes}</p>
                  )}
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>

        <TabsContent value="plans" className="mt-4 space-y-3">
          {plansLoading ? (
            <Skeleton className="h-32 w-full" />
          ) : (plans?.length ?? 0) === 0 ? (
            <Card className="shadow-sm">
              <CardContent className="py-12 text-center">
                <ClipboardList className="w-8 h-8 mx-auto text-muted-foreground/30 mb-3" />
                <p className="text-sm text-muted-foreground mb-3">No management plans yet.</p>
                <Button asChild size="sm">
                  <Link href={`/patients/${patientId}/plan`}>Create Plan</Link>
                </Button>
              </CardContent>
            </Card>
          ) : (
            (plans ?? []).slice().reverse().map((plan) => (
              <Card key={plan.id} className="shadow-sm">
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold capitalize">{APPROACH_LABELS[plan.approach ?? ""] ?? plan.approach ?? "Not specified"}</span>
                      <span className={cn("text-xs font-medium border rounded-full px-2.5 py-0.5", STATUS_COLORS[plan.status] ?? "bg-muted text-muted-foreground")}>
                        {plan.status}
                      </span>
                    </div>
                    <span className="text-xs text-muted-foreground">{formatDate(plan.createdAt)}</span>
                  </div>
                </CardHeader>
                <CardContent className="pt-0 space-y-2">
                  {(plan.medications as string[]).length > 0 && (
                    <div>
                      <p className="text-[10px] uppercase tracking-wide text-muted-foreground mb-1">Medications</p>
                      <div className="flex flex-wrap gap-1">{(plan.medications as string[]).map((m, i) => <Badge key={i} variant="secondary" className="text-xs">{m}</Badge>)}</div>
                    </div>
                  )}
                  {(plan.surgicalOptions as string[]).length > 0 && (
                    <div>
                      <p className="text-[10px] uppercase tracking-wide text-muted-foreground mb-1">Surgical Options</p>
                      <div className="flex flex-wrap gap-1">{(plan.surgicalOptions as string[]).map((s, i) => <Badge key={i} variant="outline" className="text-xs">{s}</Badge>)}</div>
                    </div>
                  )}
                  {plan.goals && <p className="text-xs text-muted-foreground bg-muted/50 rounded p-2">{plan.goals}</p>}
                  {plan.nextReviewDate && (
                    <p className="text-xs text-muted-foreground">Next review: {formatDate(plan.nextReviewDate)}</p>
                  )}
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
