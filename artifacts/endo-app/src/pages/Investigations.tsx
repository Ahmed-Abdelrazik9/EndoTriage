import { useState } from "react";
import { Link, useParams } from "wouter";
import {
  useGetPatient,
  useGetPatientInvestigations,
  useUpdatePatientInvestigations,
  getGetPatientInvestigationsQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Save, ScanLine, Microscope, FlaskConical, Droplets } from "lucide-react";
import { formatDate } from "@/lib/triage";

interface InvestigationSection {
  title: string;
  icon: React.ReactNode;
  prefix: string;
  fields: { key: string; label: string; type?: string }[];
}

const SECTIONS: InvestigationSection[] = [
  {
    title: "Transvaginal Ultrasound (TVUS)",
    icon: <ScanLine className="w-4 h-4" />,
    prefix: "tvus",
    fields: [
      { key: "tvusDate", label: "Date", type: "date" },
      { key: "tvusFindings", label: "Findings" },
      { key: "tvusEndometriomaSize", label: "Endometrioma Size" },
      { key: "tvusDeepEndometriosisLocation", label: "Deep Endometriosis Location" },
      { key: "tvusNotes", label: "Notes" },
    ],
  },
  {
    title: "MRI Pelvis",
    icon: <ScanLine className="w-4 h-4" />,
    prefix: "mri",
    fields: [
      { key: "mriDate", label: "Date", type: "date" },
      { key: "mriFindings", label: "Findings" },
      { key: "mriEndometriomaSize", label: "Endometrioma Size" },
      { key: "mriDeepEndometriosisLocation", label: "Deep Endometriosis Location" },
      { key: "mriNotes", label: "Notes" },
    ],
  },
  {
    title: "Laparoscopy",
    icon: <Microscope className="w-4 h-4" />,
    prefix: "laparoscopy",
    fields: [
      { key: "laparoscopyDate", label: "Date", type: "date" },
      { key: "laparoscopyType", label: "Type" },
      { key: "laparoscopyFindings", label: "Findings" },
      { key: "laparoscopyRafsStage", label: "rAFS Stage" },
      { key: "laparoscopyEnzianScore", label: "ENZIAN Score" },
      { key: "laparoscopyComplications", label: "Complications" },
      { key: "laparoscopyNotes", label: "Notes" },
    ],
  },
  {
    title: "CA-125",
    icon: <FlaskConical className="w-4 h-4" />,
    prefix: "ca125",
    fields: [
      { key: "ca125Date", label: "Date", type: "date" },
      { key: "ca125Value", label: "Value (U/mL)" },
      { key: "ca125Notes", label: "Notes" },
    ],
  },
  {
    title: "FBC / Bloods",
    icon: <Droplets className="w-4 h-4" />,
    prefix: "fbc",
    fields: [
      { key: "fbcDate", label: "Date", type: "date" },
      { key: "fbcNotes", label: "Notes" },
    ],
  },
];

const BOOLEAN_KEYS = [
  "tvusRequested", "tvusCompleted", "tvusEndometrioma", "tvusDeepEndometriosis", "tvusAdenomyosis", "tvusNormal",
  "mriRequested", "mriCompleted", "mriDeepEndometriosis", "mriEndometrioma", "mriUretericInvolvement", "mriBowelInvolvement", "mriBladderInvolvement", "mriNormal",
  "laparoscopyRequested", "laparoscopyCompleted",
  "ca125Requested", "ca125Completed",
  "fbcRequested", "fbcCompleted",
];

export default function Investigations() {
  const { id } = useParams<{ id: string }>();
  const patientId = parseInt(id);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: patient, isLoading: patLoading } = useGetPatient(patientId, {
    query: { enabled: !!patientId, queryKey: ["getPatient", patientId] as const },
  });
  const { data: inv, isLoading: invLoading } = useGetPatientInvestigations(patientId, {
    query: { enabled: !!patientId, queryKey: ["getPatientInvestigations", patientId] as const },
  });
  const mutation = useUpdatePatientInvestigations();

  const [form, setForm] = useState<Record<string, any>>({});

  function getValue(key: string): any {
    if (form[key] !== undefined) return form[key];
    return (inv as any)?.[key] ?? "";
  }

  function setValue(key: string, val: any) {
    setForm((f) => ({ ...f, [key]: val }));
  }

  function handleSubmit() {
    const payload: Record<string, any> = {};
    for (const key of BOOLEAN_KEYS) {
      const val = getValue(key);
      payload[key] = val === true || val === "true" || val === 1;
    }
    for (const section of SECTIONS) {
      for (const field of section.fields) {
        const val = getValue(field.key);
        if (val !== undefined && val !== "") payload[field.key] = val;
      }
    }
    payload.requestedBy = getValue("requestedBy") || undefined;
    payload.reviewedBy = getValue("reviewedBy") || undefined;

    mutation.mutate(
      { id: patientId, data: payload },
      {
        onSuccess: () => {
          toast({ title: "Investigations saved", description: "All investigation data updated successfully." });
          queryClient.invalidateQueries({ queryKey: getGetPatientInvestigationsQueryKey(patientId) });
          setForm({});
        },
        onError: () => {
          toast({ title: "Error", description: "Failed to save investigations. Please try again.", variant: "destructive" });
        },
      }
    );
  }

  if (patLoading || invLoading) {
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
        <h1 className="text-2xl font-bold tracking-tight">Investigations</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          {patient ? `${patient.firstName} ${patient.lastName}` : ""} — Diagnostic workup tracking
        </p>
      </div>

      <div className="grid gap-4">
        {SECTIONS.map((section) => (
          <Card key={section.prefix} className="shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <div className="p-1.5 rounded-md bg-primary/10">{section.icon}</div>
                {section.title}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex flex-wrap gap-4">
                <div className="flex items-center gap-2">
                  <Checkbox
                    id={`${section.prefix}Requested`}
                    checked={!!getValue(`${section.prefix}Requested`)}
                    onCheckedChange={(c) => setValue(`${section.prefix}Requested`, c)}
                  />
                  <Label htmlFor={`${section.prefix}Requested`} className="text-sm font-normal">Requested</Label>
                </div>
                <div className="flex items-center gap-2">
                  <Checkbox
                    id={`${section.prefix}Completed`}
                    checked={!!getValue(`${section.prefix}Completed`)}
                    onCheckedChange={(c) => setValue(`${section.prefix}Completed`, c)}
                  />
                  <Label htmlFor={`${section.prefix}Completed`} className="text-sm font-normal">Completed</Label>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {section.fields.map((field) => (
                  <div key={field.key} className="space-y-1">
                    <Label htmlFor={field.key} className="text-xs font-medium">{field.label}</Label>
                    {field.type === "date" ? (
                      <Input
                        id={field.key}
                        type="date"
                        value={getValue(field.key) ?? ""}
                        onChange={(e) => setValue(field.key, e.target.value)}
                        className="h-9"
                      />
                    ) : (
                      <Input
                        id={field.key}
                        value={getValue(field.key) ?? ""}
                        onChange={(e) => setValue(field.key, e.target.value)}
                        className="h-9"
                        placeholder={field.label}
                      />
                    )}
                  </div>
                ))}
              </div>

              {/* Modality-specific boolean flags */}
              {section.prefix === "tvus" && (
                <div className="flex flex-wrap gap-4 pt-2">
                  {["tvusEndometrioma", "tvusDeepEndometriosis", "tvusAdenomyosis", "tvusNormal"].map((k) => (
                    <div key={k} className="flex items-center gap-2">
                      <Checkbox id={k} checked={!!getValue(k)} onCheckedChange={(c) => setValue(k, c)} />
                      <Label htmlFor={k} className="text-sm font-normal capitalize">{k.replace("tvus", "").replace(/([A-Z])/g, " $1").trim()}</Label>
                    </div>
                  ))}
                </div>
              )}
              {section.prefix === "mri" && (
                <div className="flex flex-wrap gap-4 pt-2">
                  {["mriDeepEndometriosis", "mriEndometrioma", "mriUretericInvolvement", "mriBowelInvolvement", "mriBladderInvolvement", "mriNormal"].map((k) => (
                    <div key={k} className="flex items-center gap-2">
                      <Checkbox id={k} checked={!!getValue(k)} onCheckedChange={(c) => setValue(k, c)} />
                      <Label htmlFor={k} className="text-sm font-normal capitalize">{k.replace("mri", "").replace(/([A-Z])/g, " $1").trim()}</Label>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="flex items-center gap-3">
        <Button onClick={handleSubmit} disabled={mutation.isPending}>
          <Save className="w-4 h-4 mr-2" />
          {mutation.isPending ? "Saving..." : "Save Investigations"}
        </Button>
      </div>
    </div>
  );
}
