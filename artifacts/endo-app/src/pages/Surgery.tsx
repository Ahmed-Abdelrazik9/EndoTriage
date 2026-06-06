import { useState } from "react";
import { Link, useParams } from "wouter";
import {
  useGetPatient,
  useListPatientSurgeries,
  useCreateSurgery,
  getListPatientSurgeriesQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Plus, Scissors, Save, ChevronRight } from "lucide-react";
import { formatDate } from "@/lib/triage";
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

  const [showForm, setShowForm] = useState(false);
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
    locations: [] as string[],
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

  if (patLoading || surgLoading) {
    return (
      <div className="max-w-4xl space-y-4">
        <Skeleton className="h-8 w-48" />
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
          <h1 className="text-2xl font-bold tracking-tight">Surgery Records</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {patient ? `${patient.firstName} ${patient.lastName}` : ""} — Operative findings & records
          </p>
        </div>
        <Button size="sm" onClick={() => setShowForm(!showForm)}>
          <Plus className="w-4 h-4 mr-1.5" />{showForm ? "Cancel" : "Add Surgery"}
        </Button>
      </div>

      {/* Add surgery form */}
      {showForm && (
        <Card className="shadow-sm">
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
  );
}
