import { useState } from "react";
import { Link } from "wouter";
import {
  useListManagementPlans,
  useListPatients,
  useUpdateManagementPlan,
  getListManagementPlansQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from "@/components/ui/select";
import { formatDate, APPROACH_LABELS, PATHWAY_LABELS, PATHWAY_COLORS, STATUS_COLORS } from "@/lib/triage";
import { cn } from "@/lib/utils";
import { ClipboardList, Eye, Calendar, Baby, ArrowRight, Stethoscope } from "lucide-react";

export default function ManagementPlans() {
  const [statusFilter, setStatusFilter] = useState("all");
  const [approachFilter, setApproachFilter] = useState("all");
  const [pathwayFilter, setPathwayFilter] = useState("all");
  const queryClient = useQueryClient();
  const updateMutation = useUpdateManagementPlan();

  const params = {
    ...(statusFilter && statusFilter !== "all" ? { status: statusFilter } : {}),
    ...(pathwayFilter && pathwayFilter !== "all" ? { pathway: pathwayFilter } : {}),
  };

  const { data: plans, isLoading } = useListManagementPlans(params);
  const { data: patients } = useListPatients();

  const patientMap = new Map((patients ?? []).map((p) => [p.id, `${p.firstName} ${p.lastName}`]));

  const filtered = (plans ?? []).filter((p) =>
    approachFilter === "all" || p.approach === approachFilter
  );

  function updateStatus(id: number, status: string) {
    updateMutation.mutate({ id, data: { status } }, {
      onSuccess: () => queryClient.invalidateQueries({ queryKey: getListManagementPlansQueryKey() }),
    });
  }

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Management Plans</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          {isLoading ? "Loading..." : `${filtered.length} plan${filtered.length !== 1 ? "s" : ""}`}
        </p>
      </div>

      <div className="flex gap-2">
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="on-hold">On Hold</SelectItem>
            <SelectItem value="completed">Completed</SelectItem>
          </SelectContent>
        </Select>
        <Select value={approachFilter} onValueChange={setApproachFilter}>
          <SelectTrigger className="w-44">
            <SelectValue placeholder="Approach" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Approaches</SelectItem>
            <SelectItem value="medical">Medical</SelectItem>
            <SelectItem value="surgical">Surgical</SelectItem>
            <SelectItem value="combined">Combined</SelectItem>
            <SelectItem value="watchful-waiting">Watchful Waiting</SelectItem>
          </SelectContent>
        </Select>
        <Select value={pathwayFilter} onValueChange={setPathwayFilter}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Pathway" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Pathways</SelectItem>
            <SelectItem value="medical">Medical</SelectItem>
            <SelectItem value="surgery_general">General Surgery</SelectItem>
            <SelectItem value="surgery_specialist">Specialist BSGE</SelectItem>
            <SelectItem value="combined">Combined</SelectItem>
            <SelectItem value="watchful_waiting">Watchful Waiting</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <div className="space-y-2">
          {[1,2,3].map((i) => <Skeleton key={i} className="h-24 w-full rounded-lg" />)}
        </div>
      ) : filtered.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center">
            <ClipboardList className="w-10 h-10 mx-auto text-muted-foreground/30 mb-3" />
            <p className="text-sm text-muted-foreground">No management plans found.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {filtered.slice().reverse().map((plan) => {
            const patientName = patientMap.get(plan.patientId) ?? `Patient #${plan.patientId}`;
            return (
              <Card key={plan.id} className="shadow-sm hover:shadow transition-shadow">
                <CardContent className="p-4">
                  <div className="flex items-start gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-medium text-sm">{patientName}</span>
                        <span className="text-xs text-muted-foreground">·</span>
                        <span className="text-sm text-muted-foreground">{APPROACH_LABELS[plan.approach ?? ""] ?? plan.approach ?? "Not specified"}</span>
                        <span className={cn("text-xs font-medium border rounded-full px-2.5 py-0.5", STATUS_COLORS[plan.status] ?? "bg-muted text-muted-foreground")}>
                          {plan.status}
                        </span>
                        {plan.pathway && (
                          <span className={cn("text-xs font-medium border rounded-full px-2 py-0.5", PATHWAY_COLORS[plan.pathway] ?? "bg-muted")}>
                            {PATHWAY_LABELS[plan.pathway] ?? plan.pathway}
                          </span>
                        )}
                        {plan.bsgeReferral && (
                          <span className="text-xs font-medium bg-purple-100 text-purple-800 border border-purple-200 rounded-full px-2 py-0.5">BSGE</span>
                        )}
                        {plan.fertilityClinicReferral && (
                          <span className="text-xs font-medium bg-pink-100 text-pink-800 border border-pink-200 rounded-full px-2 py-0.5">Fertility</span>
                        )}
                        {plan.painClinicReferral && (
                          <span className="text-xs font-medium bg-blue-100 text-blue-800 border border-blue-200 rounded-full px-2 py-0.5">Pain</span>
                        )}
                      </div>

                      <div className="flex flex-wrap gap-1.5 mt-2">
                        {(plan.medications as string[]).slice(0, 3).map((m, i) => (
                          <Badge key={i} variant="secondary" className="text-xs">{m}</Badge>
                        ))}
                        {(plan.medications as string[]).length > 3 && (
                          <Badge variant="outline" className="text-xs">+{(plan.medications as string[]).length - 3} more</Badge>
                        )}
                      </div>

                      <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                        <span>Created: {formatDate(plan.createdAt)}</span>
                        {plan.nextReviewDate && (
                          <span className="flex items-center gap-1">
                            <Calendar className="w-3 h-3" />Next: {formatDate(plan.nextReviewDate)}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      {plan.status !== "completed" && (
                        <Button size="sm" variant="outline" onClick={() => updateStatus(plan.id, plan.status === "active" ? "on-hold" : "active")}>
                          {plan.status === "active" ? "Hold" : "Activate"}
                        </Button>
                      )}
                      <Button size="sm" variant="ghost" asChild>
                        <Link href={`/patients/${plan.patientId}`}><Eye className="w-4 h-4" /></Link>
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
