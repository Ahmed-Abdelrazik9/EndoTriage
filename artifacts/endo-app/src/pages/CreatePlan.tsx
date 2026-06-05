import { useState } from "react";
import { Link, useParams, useLocation } from "wouter";
import {
  useGetPatient,
  useCreateManagementPlan,
  useListMedications,
  getListManagementPlansQueryKey,
  getListPatientsQueryKey,
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
import { ArrowLeft, X, Plus } from "lucide-react";

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
  const mutation = useCreateManagementPlan();

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

  function toggleItem(list: string[], item: string): string[] {
    return list.includes(item) ? list.filter((x) => x !== item) : [...list, item];
  }

  function addCustomMed() {
    if (form.customMed.trim() && !form.selectedMeds.includes(form.customMed.trim())) {
      setForm((f) => ({ ...f, selectedMeds: [...f.selectedMeds, f.customMed.trim()], customMed: "" }));
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

  if (patLoading) return <Skeleton className="h-48 w-full max-w-2xl" />;

  return (
    <div className="max-w-2xl space-y-5">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" asChild>
          <Link href={`/patients/${patientId}`}><ArrowLeft className="w-4 h-4 mr-1" />Back</Link>
        </Button>
      </div>

      <div>
        <h1 className="text-2xl font-bold tracking-tight">Create Management Plan</h1>
        {patient && <p className="text-sm text-muted-foreground mt-0.5">{patient.firstName} {patient.lastName}</p>}
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Approach & Status */}
        <Card className="shadow-sm">
          <CardHeader>
            <CardTitle className="text-base">Plan Overview</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Management Approach *</Label>
                <Select value={form.approach} onValueChange={(v) => setForm((f) => ({ ...f, approach: v }))}>
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
                <Label>Follow-up (weeks)</Label>
                <Input
                  type="number" min="1" max="104"
                  value={form.followUpWeeks}
                  onChange={(e) => setForm((f) => ({ ...f, followUpWeeks: e.target.value }))}
                  placeholder="e.g. 12"
                />
              </div>
              <div className="space-y-1.5">
                <Label>Next Review Date</Label>
                <Input type="date" value={form.nextReviewDate} onChange={(e) => setForm((f) => ({ ...f, nextReviewDate: e.target.value }))} />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label>Treatment Goals</Label>
              <Textarea value={form.goals} onChange={(e) => setForm((f) => ({ ...f, goals: e.target.value }))} placeholder="e.g. Pain reduction to VAS ≤3, preserve fertility, improve QoL..." rows={2} />
            </div>
          </CardContent>
        </Card>

        {/* Medications */}
        <Card className="shadow-sm">
          <CardHeader>
            <CardTitle className="text-base">Medications</CardTitle>
            <CardDescription>Select from approved medications or add custom entries</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {form.selectedMeds.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {form.selectedMeds.map((m) => (
                  <Badge key={m} variant="secondary" className="flex items-center gap-1 pr-1">
                    {m}
                    <button type="button" onClick={() => setForm((f) => ({ ...f, selectedMeds: f.selectedMeds.filter((x) => x !== m) }))}>
                      <X className="w-3 h-3" />
                    </button>
                  </Badge>
                ))}
              </div>
            )}
            <div className="space-y-1.5 max-h-48 overflow-y-auto border rounded-md p-3">
              {(allMeds ?? []).map((med) => (
                <label key={med.id} className="flex items-start gap-2.5 cursor-pointer hover:bg-muted/40 p-1.5 rounded">
                  <Checkbox
                    checked={form.selectedMeds.includes(med.name)}
                    onCheckedChange={() => setForm((f) => ({ ...f, selectedMeds: toggleItem(f.selectedMeds, med.name) }))}
                  />
                  <div>
                    <span className="text-sm font-medium">{med.name}</span>
                    <span className="text-xs text-muted-foreground ml-2">{med.category}</span>
                    {med.evidenceLevel && <span className="text-xs text-muted-foreground ml-2">· {med.evidenceLevel}</span>}
                  </div>
                </label>
              ))}
            </div>
            <div className="flex gap-2">
              <Input value={form.customMed} onChange={(e) => setForm((f) => ({ ...f, customMed: e.target.value }))} placeholder="Custom medication..." onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addCustomMed())} />
              <Button type="button" variant="outline" size="sm" onClick={addCustomMed}><Plus className="w-4 h-4" /></Button>
            </div>
          </CardContent>
        </Card>

        {/* Surgical options */}
        {(form.approach === "surgical" || form.approach === "combined") && (
          <Card className="shadow-sm">
            <CardHeader>
              <CardTitle className="text-base">Surgical Options</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {SURGICAL_OPTIONS.map((opt) => (
                  <label key={opt} className="flex items-center gap-2.5 cursor-pointer hover:bg-muted/40 p-1.5 rounded">
                    <Checkbox checked={form.surgicalOptions.includes(opt)} onCheckedChange={() => setForm((f) => ({ ...f, surgicalOptions: toggleItem(f.surgicalOptions, opt) }))} />
                    <span className="text-sm">{opt}</span>
                  </label>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Lifestyle recommendations */}
        <Card className="shadow-sm">
          <CardHeader>
            <CardTitle className="text-base">Lifestyle Recommendations</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {LIFESTYLE_OPTIONS.map((opt) => (
                <label key={opt} className="flex items-center gap-2.5 cursor-pointer hover:bg-muted/40 p-1.5 rounded">
                  <Checkbox checked={form.lifestyleOptions.includes(opt)} onCheckedChange={() => setForm((f) => ({ ...f, lifestyleOptions: toggleItem(f.lifestyleOptions, opt) }))} />
                  <span className="text-sm">{opt}</span>
                </label>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Clinician notes */}
        <Card className="shadow-sm">
          <CardContent className="pt-4">
            <div className="space-y-1.5">
              <Label>Clinician Notes</Label>
              <Textarea value={form.clinicianNotes} onChange={(e) => setForm((f) => ({ ...f, clinicianNotes: e.target.value }))} placeholder="Additional notes, rationale, or patient-specific considerations..." rows={3} />
            </div>
          </CardContent>
        </Card>

        <div className="flex gap-3">
          <Button type="submit" disabled={mutation.isPending}>
            {mutation.isPending ? "Creating..." : "Create Plan"}
          </Button>
          <Button type="button" variant="outline" asChild>
            <Link href={`/patients/${patientId}`}>Cancel</Link>
          </Button>
        </div>
      </form>
    </div>
  );
}
