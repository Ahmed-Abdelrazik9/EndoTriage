import { useState } from "react";
import { Link, useParams } from "wouter";
import {
  useGetPatient,
  useGetPatientCarePathway,
  useAddCarePathwayEvent,
  getGetPatientCarePathwayQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Clock, Plus, ChevronRight } from "lucide-react";
import { formatDate, CARE_STATE_LABELS, CARE_STATE_COLORS, PATHWAY_LABELS, PATHWAY_COLORS } from "@/lib/triage";
import { cn } from "@/lib/utils";

const CARE_STATES = [
  "referral_received", "clinic_review", "imaging_completed", "triage_decision",
  "medication_started", "medication_changed", "waiting_list_added", "mdt_discussed",
  "surgery_scheduled", "surgery_completed", "post_op_review", "follow_up_ongoing",
  "recurrence_detected", "discharged", "long_term_management",
];

const PATHWAYS = ["medical", "surgery_general", "surgery_specialist", "combined", "watchful_waiting"];

export default function CarePathway() {
  const { id } = useParams<{ id: string }>();
  const patientId = parseInt(id);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: patient, isLoading: patLoading } = useGetPatient(patientId, {
    query: { enabled: !!patientId, queryKey: ["getPatient", patientId] as const },
  });
  const { data: pathway, isLoading: pathLoading } = useGetPatientCarePathway(patientId, {
    query: { enabled: !!patientId, queryKey: ["getPatientCarePathway", patientId] as const },
  });
  const mutation = useAddCarePathwayEvent();

  const [form, setForm] = useState({
    state: "",
    eventDate: new Date().toISOString().split("T")[0],
    clinician: "",
    notes: "",
    pathwayAssigned: "",
  });

  function handleSubmit() {
    if (!form.state) {
      toast({ title: "State required", description: "Please select a care pathway state.", variant: "destructive" });
      return;
    }
    mutation.mutate(
      { id: patientId, data: form },
      {
        onSuccess: () => {
          toast({ title: "Pathway event added", description: `State updated to ${CARE_STATE_LABELS[form.state]}.` });
          queryClient.invalidateQueries({ queryKey: getGetPatientCarePathwayQueryKey(patientId) });
          queryClient.invalidateQueries({ queryKey: ["getPatient", patientId] });
          setForm({ state: "", eventDate: new Date().toISOString().split("T")[0], clinician: "", notes: "", pathwayAssigned: "none" });
        },
        onError: () => {
          toast({ title: "Error", description: "Failed to add event.", variant: "destructive" });
        },
      }
    );
  }

  const events = (pathway?.events ?? []).slice().reverse();
  const currentState = patient?.carePathwayState ?? "referral_received";
  const currentPathway = patient?.currentPathway;

  if (patLoading || pathLoading) {
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

      <div>
        <h1 className="text-2xl font-bold tracking-tight">Care Pathway</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          {patient ? `${patient.firstName} ${patient.lastName}` : ""} — NHS pathway tracking
        </p>
      </div>

      {/* Current state */}
      <Card className="shadow-sm border-l-4 border-l-primary">
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
      <Card className="shadow-sm">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <Plus className="w-4 h-4" /> Add Pathway Event
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-xs font-medium">New State</Label>
              <Select value={form.state} onValueChange={(v) => setForm((f) => ({ ...f, state: v }))}>
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
              <Input type="date" value={form.eventDate} onChange={(e) => setForm((f) => ({ ...f, eventDate: e.target.value }))} />
            </div>
            <div className="space-y-1">
              <Label className="text-xs font-medium">Clinician</Label>
              <Input value={form.clinician} onChange={(e) => setForm((f) => ({ ...f, clinician: e.target.value }))} placeholder="Dr. Name" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs font-medium">Assign Pathway</Label>
              <Select value={form.pathwayAssigned} onValueChange={(v) => setForm((f) => ({ ...f, pathwayAssigned: v }))}>
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
            <Textarea value={form.notes} onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))} placeholder="Clinical notes, rationale, next steps..." rows={2} />
          </div>
          <Button onClick={handleSubmit} disabled={mutation.isPending} size="sm">
            {mutation.isPending ? "Adding..." : "Add Event"}
          </Button>
        </CardContent>
      </Card>

      {/* Timeline */}
      <div className="space-y-3">
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Timeline</h2>
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
  );
}
