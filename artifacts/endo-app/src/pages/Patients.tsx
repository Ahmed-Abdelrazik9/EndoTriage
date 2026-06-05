import { useState } from "react";
import { Link } from "wouter";
import { useListPatients, useDeletePatient, getListPatientsQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from "@/components/ui/select";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle
} from "@/components/ui/alert-dialog";
import TriageBadge from "@/components/TriageBadge";
import StageBadge from "@/components/StageBadge";
import { UserPlus, Search, Trash2, Eye, ClipboardList, Stethoscope } from "lucide-react";
import { formatDate } from "@/lib/triage";

export default function Patients() {
  const [search, setSearch] = useState("");
  const [stageFilter, setStageFilter] = useState("all");
  const [triageFilter, setTriageFilter] = useState("all");
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const queryClient = useQueryClient();

  const params = {
    ...(search ? { search } : {}),
    ...(stageFilter && stageFilter !== "all" ? { stage: stageFilter } : {}),
    ...(triageFilter && triageFilter !== "all" ? { triageLevel: triageFilter } : {}),
  };

  const { data: patients, isLoading } = useListPatients(params);
  const deleteMutation = useDeletePatient();

  function handleDelete() {
    if (!deleteId) return;
    deleteMutation.mutate({ id: deleteId }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListPatientsQueryKey() });
        setDeleteId(null);
      },
    });
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Patients</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {isLoading ? "Loading..." : `${patients?.length ?? 0} patient${(patients?.length ?? 0) !== 1 ? "s" : ""}`}
          </p>
        </div>
        <Button asChild size="sm">
          <Link href="/patients/new">
            <UserPlus className="w-4 h-4 mr-2" />
            New Patient
          </Link>
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search patients..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={triageFilter} onValueChange={setTriageFilter}>
          <SelectTrigger className="w-full sm:w-40">
            <SelectValue placeholder="Triage level" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Triage Levels</SelectItem>
            <SelectItem value="urgent">Urgent</SelectItem>
            <SelectItem value="high">High</SelectItem>
            <SelectItem value="moderate">Moderate</SelectItem>
            <SelectItem value="routine">Routine</SelectItem>
          </SelectContent>
        </Select>
        <Select value={stageFilter} onValueChange={setStageFilter}>
          <SelectTrigger className="w-full sm:w-40">
            <SelectValue placeholder="Stage" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Stages</SelectItem>
            <SelectItem value="Stage I">Stage I</SelectItem>
            <SelectItem value="Stage II">Stage II</SelectItem>
            <SelectItem value="Stage III">Stage III</SelectItem>
            <SelectItem value="Stage IV">Stage IV</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Patient list */}
      {isLoading ? (
        <div className="space-y-2">
          {[1,2,3,4,5].map((i) => <Skeleton key={i} className="h-16 w-full rounded-lg" />)}
        </div>
      ) : (patients?.length ?? 0) === 0 ? (
        <Card className="shadow-sm">
          <CardContent className="py-16 text-center">
            <UserPlus className="w-10 h-10 mx-auto text-muted-foreground/40 mb-3" />
            <p className="text-sm text-muted-foreground">
              {search || stageFilter !== "all" || triageFilter !== "all"
                ? "No patients match your filters."
                : "No patients yet. Register the first patient to get started."}
            </p>
            {!search && stageFilter === "all" && triageFilter === "all" && (
              <Button asChild size="sm" className="mt-4">
                <Link href="/patients/new">Register Patient</Link>
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {(patients ?? []).map((patient) => (
            <Card key={patient.id} className="shadow-sm hover:shadow transition-shadow">
              <CardContent className="p-4">
                <div className="flex items-center gap-4">
                  {/* Avatar */}
                  <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                    <span className="text-xs font-semibold text-primary">
                      {patient.firstName[0]}{patient.lastName[0]}
                    </span>
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium text-sm">{patient.firstName} {patient.lastName}</span>
                      <StageBadge stage={patient.currentStage} />
                      <TriageBadge level={patient.triageLevel} size="sm" />
                    </div>
                    <div className="flex items-center gap-3 mt-0.5">
                      <span className="text-xs text-muted-foreground">DOB: {formatDate(patient.dateOfBirth)}</span>
                      {patient.lastAssessmentDate && (
                        <span className="text-xs text-muted-foreground">Last assessed: {formatDate(patient.lastAssessmentDate)}</span>
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1 shrink-0">
                    <Button variant="ghost" size="icon" asChild title="View profile">
                      <Link href={`/patients/${patient.id}`}><Eye className="w-4 h-4" /></Link>
                    </Button>
                    <Button variant="ghost" size="icon" asChild title="New assessment">
                      <Link href={`/patients/${patient.id}/assess`}><Stethoscope className="w-4 h-4" /></Link>
                    </Button>
                    <Button variant="ghost" size="icon" asChild title="Create plan">
                      <Link href={`/patients/${patient.id}/plan`}><ClipboardList className="w-4 h-4" /></Link>
                    </Button>
                    <Button
                      variant="ghost" size="icon"
                      onClick={() => setDeleteId(patient.id)}
                      className="text-destructive hover:text-destructive"
                      title="Delete patient"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <AlertDialog open={deleteId !== null} onOpenChange={(o) => !o && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete patient?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently remove the patient and cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
