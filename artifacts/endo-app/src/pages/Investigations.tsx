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
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import {
  ArrowLeft,
  Save,
  ScanLine,
  Microscope,
  FlaskConical,
  Droplets,
  AlertCircle,
  Info,
} from "lucide-react";

function parseJsonArray(val: unknown): string[] {
  if (Array.isArray(val)) return val as string[];
  if (typeof val === "string" && val.trim()) {
    try {
      const parsed = JSON.parse(val);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }
  return [];
}

function toggleItem(arr: string[], item: string): string[] {
  return arr.includes(item) ? arr.filter((x) => x !== item) : [...arr, item];
}

interface StatusRowProps {
  prefix: string;
  getValue: (k: string) => any;
  setValue: (k: string, v: any) => void;
}

function StatusRow({ prefix, getValue, setValue }: StatusRowProps) {
  return (
    <div className="flex flex-wrap gap-5 items-center">
      <div className="flex items-center gap-2">
        <Checkbox
          id={`${prefix}Requested`}
          checked={!!getValue(`${prefix}Requested`)}
          onCheckedChange={(c) => setValue(`${prefix}Requested`, c)}
        />
        <Label htmlFor={`${prefix}Requested`} className="text-sm font-normal cursor-pointer">
          Requested
        </Label>
      </div>
      <div className="flex items-center gap-2">
        <Checkbox
          id={`${prefix}Completed`}
          checked={!!getValue(`${prefix}Completed`)}
          onCheckedChange={(c) => setValue(`${prefix}Completed`, c)}
        />
        <Label htmlFor={`${prefix}Completed`} className="text-sm font-normal cursor-pointer">
          Completed
        </Label>
      </div>
      <div className="ml-auto">
        <Input
          type="date"
          value={getValue(`${prefix}Date`) ?? ""}
          onChange={(e) => setValue(`${prefix}Date`, e.target.value)}
          className="h-8 w-40 text-sm"
        />
      </div>
    </div>
  );
}

interface FindingCheckboxProps {
  id: string;
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  highlight?: boolean;
}

function FindingCheckbox({ id, label, checked, onChange, highlight }: FindingCheckboxProps) {
  return (
    <div
      className={`flex items-center gap-2 p-2 rounded-md border cursor-pointer transition-colors ${
        checked
          ? highlight
            ? "bg-rose-50 border-rose-300 dark:bg-rose-950/30"
            : "bg-primary/5 border-primary/30"
          : "border-transparent hover:bg-muted/50"
      }`}
      onClick={() => onChange(!checked)}
    >
      <Checkbox
        id={id}
        checked={checked}
        onCheckedChange={(c) => onChange(!!c)}
        className="pointer-events-none"
      />
      <Label htmlFor={id} className="text-sm font-normal cursor-pointer select-none leading-tight">
        {label}
      </Label>
    </div>
  );
}

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
    return (inv as any)?.[key] ?? null;
  }

  function setValue(key: string, val: any) {
    setForm((f) => ({ ...f, [key]: val }));
  }

  function getBool(key: string): boolean {
    const v = getValue(key);
    return v === true || v === "true" || v === 1;
  }

  function setBool(key: string, val: boolean) {
    setValue(key, val);
  }

  function getArr(key: string): string[] {
    return parseJsonArray(getValue(key));
  }

  function setArr(key: string, arr: string[]) {
    setValue(key, JSON.stringify(arr));
  }

  function toggleArr(key: string, item: string) {
    setArr(key, toggleItem(getArr(key), item));
  }

  const tvusFindings = getArr("tvusFindings");
  const mriFindings = getArr("mriFindings");
  const lapFindings = getArr("laparoscopyFindings");

  function handleSubmit() {
    const BOOL_KEYS = [
      "tvusRequested", "tvusCompleted", "tvusEndometrioma", "tvusDeepEndometriosis",
      "tvusAdenomyosis", "tvusNormal",
      "mriRequested", "mriCompleted", "mriDeepEndometriosis", "mriEndometrioma",
      "mriUretericInvolvement", "mriBowelInvolvement", "mriBladderInvolvement", "mriNormal",
      "laparoscopyRequested", "laparoscopyCompleted",
      "ca125Requested", "ca125Completed",
      "fbcRequested", "fbcCompleted",
    ];

    const TEXT_KEYS = [
      "tvusDate", "tvusFindings", "tvusEndometriomaSize", "tvusDeepEndometriosisLocation", "tvusNotes",
      "mriDate", "mriFindings", "mriDeepEndometriosisLocation", "mriEndometriomaSize", "mriNotes",
      "laparoscopyDate", "laparoscopyType", "laparoscopyFindings", "laparoscopyLocations",
      "laparoscopyRafsStage", "laparoscopyEnzianScore", "laparoscopyComplications", "laparoscopyNotes",
      "ca125Date", "ca125Value", "ca125Notes",
      "fbcDate", "fbcNotes",
      "requestedBy", "reviewedBy",
    ];

    const payload: Record<string, any> = {};
    for (const k of BOOL_KEYS) {
      payload[k] = getBool(k);
    }
    for (const k of TEXT_KEYS) {
      const v = getValue(k);
      if (v !== null && v !== undefined && v !== "") payload[k] = v;
    }

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
        <Skeleton className="h-48 w-full" />
      </div>
    );
  }

  const showTvusEndometriomaSize = getBool("tvusEndometrioma") || tvusFindings.includes("endometrioma");
  const showTvusDeepEndoLocations = getBool("tvusDeepEndometriosis") || tvusFindings.includes("deep_endometriosis");
  const showMriEndometriomaSize = getBool("mriEndometrioma") || mriFindings.includes("endometrioma_3cm");

  return (
    <div className="max-w-4xl space-y-5">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" asChild>
          <Link href={`/patients/${patientId}`}>
            <ArrowLeft className="w-4 h-4 mr-1" />Back
          </Link>
        </Button>
      </div>

      <div>
        <h1 className="text-2xl font-bold tracking-tight">Investigations</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          {patient ? `${patient.firstName} ${patient.lastName}` : ""} — Diagnostic workup
        </p>
      </div>

      <div className="flex items-start gap-2 p-3 rounded-md bg-blue-50 border border-blue-200 text-blue-800 dark:bg-blue-950/30 dark:border-blue-800 dark:text-blue-300">
        <Info className="w-4 h-4 mt-0.5 shrink-0" />
        <p className="text-xs leading-relaxed">
          <span className="font-semibold">NICE NG73:</span> TVUS is first-line for suspected endometriosis. MRI should be offered if TVUS is inconclusive or deep endometriosis is suspected. Laparoscopy may be required for definitive diagnosis. CA-125 is not recommended as a routine diagnostic test.
        </p>
      </div>

      <div className="grid gap-4">
        {/* ─── TVUS ─── */}
        <Card className="shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <div className="p-1.5 rounded-md bg-primary/10 text-primary">
                <ScanLine className="w-4 h-4" />
              </div>
              Transvaginal Ultrasound (TVUS)
              {getBool("tvusCompleted") && (
                <Badge variant="secondary" className="ml-auto text-xs bg-green-100 text-green-700 border-green-200">
                  Completed
                </Badge>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <StatusRow prefix="tvus" getValue={getValue} setValue={setValue} />

            <div className="space-y-2">
              <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Findings</Label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-1">
                <FindingCheckbox
                  id="tvus-normal"
                  label="Normal"
                  checked={getBool("tvusNormal")}
                  onChange={(v) => setBool("tvusNormal", v)}
                />
                <FindingCheckbox
                  id="tvus-endometrioma"
                  label="Endometrioma"
                  checked={getBool("tvusEndometrioma")}
                  onChange={(v) => setBool("tvusEndometrioma", v)}
                />
                <FindingCheckbox
                  id="tvus-deep"
                  label="Deep endometriosis"
                  checked={getBool("tvusDeepEndometriosis")}
                  onChange={(v) => setBool("tvusDeepEndometriosis", v)}
                  highlight
                />
                <FindingCheckbox
                  id="tvus-adenomyosis"
                  label="Adenomyosis"
                  checked={getBool("tvusAdenomyosis")}
                  onChange={(v) => setBool("tvusAdenomyosis", v)}
                />
                {(["fibroid", "ovarian_cyst", "other"] as const).map((f) => (
                  <FindingCheckbox
                    key={f}
                    id={`tvus-${f}`}
                    label={f === "ovarian_cyst" ? "Ovarian cyst" : f.charAt(0).toUpperCase() + f.slice(1)}
                    checked={tvusFindings.includes(f)}
                    onChange={() => toggleArr("tvusFindings", f)}
                  />
                ))}
              </div>
            </div>

            {showTvusEndometriomaSize && (
              <div className="space-y-1">
                <Label className="text-xs font-medium">Endometrioma size</Label>
                <Select
                  value={getValue("tvusEndometriomaSize") ?? ""}
                  onValueChange={(v) => setValue("tvusEndometriomaSize", v)}
                >
                  <SelectTrigger className="h-9 w-56">
                    <SelectValue placeholder="Select size" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="lt3cm">&lt; 3 cm</SelectItem>
                    <SelectItem value="3to5cm">3 – 5 cm</SelectItem>
                    <SelectItem value="gt5cm">&gt; 5 cm</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}

            {showTvusDeepEndoLocations && (
              <div className="space-y-2">
                <Label className="text-xs font-medium">Deep endometriosis — location(s)</Label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-1">
                  {[
                    { value: "pouch_of_douglas", label: "Pouch of Douglas" },
                    { value: "uterosacral", label: "Uterosacral ligament" },
                    { value: "rectovaginal", label: "Rectovaginal septum" },
                    { value: "bowel", label: "Bowel" },
                    { value: "bladder", label: "Bladder" },
                    { value: "ureter", label: "Ureter" },
                  ].map((loc) => {
                    const locs = parseJsonArray(getValue("tvusDeepEndometriosisLocation"));
                    return (
                      <FindingCheckbox
                        key={loc.value}
                        id={`tvus-loc-${loc.value}`}
                        label={loc.label}
                        checked={locs.includes(loc.value)}
                        onChange={() => {
                          setArr("tvusDeepEndometriosisLocation", toggleItem(locs, loc.value));
                        }}
                        highlight
                      />
                    );
                  })}
                </div>
              </div>
            )}

            <div className="space-y-1">
              <Label htmlFor="tvusNotes" className="text-xs font-medium">
                Additional notes <span className="text-muted-foreground">(optional)</span>
              </Label>
              <Input
                id="tvusNotes"
                value={getValue("tvusNotes") ?? ""}
                onChange={(e) => setValue("tvusNotes", e.target.value)}
                className="h-9"
                placeholder="Any additional observations..."
              />
            </div>
          </CardContent>
        </Card>

        {/* ─── MRI ─── */}
        <Card className="shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <div className="p-1.5 rounded-md bg-primary/10 text-primary">
                <ScanLine className="w-4 h-4" />
              </div>
              MRI Pelvis
              {getBool("mriCompleted") && (
                <Badge variant="secondary" className="ml-auto text-xs bg-green-100 text-green-700 border-green-200">
                  Completed
                </Badge>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <StatusRow prefix="mri" getValue={getValue} setValue={setValue} />

            <div className="space-y-2">
              <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Findings</Label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-1">
                <FindingCheckbox
                  id="mri-normal"
                  label="Normal"
                  checked={getBool("mriNormal")}
                  onChange={(v) => setBool("mriNormal", v)}
                />
                <FindingCheckbox
                  id="mri-die"
                  label="Deep infiltrating endo ≥5mm"
                  checked={getBool("mriDeepEndometriosis")}
                  onChange={(v) => setBool("mriDeepEndometriosis", v)}
                  highlight
                />
                <FindingCheckbox
                  id="mri-endometrioma"
                  label="Endometrioma ≥3cm"
                  checked={getBool("mriEndometrioma")}
                  onChange={(v) => setBool("mriEndometrioma", v)}
                  highlight
                />
                <FindingCheckbox
                  id="mri-bowel"
                  label="Bowel involvement"
                  checked={getBool("mriBowelInvolvement")}
                  onChange={(v) => setBool("mriBowelInvolvement", v)}
                  highlight
                />
                <FindingCheckbox
                  id="mri-bladder"
                  label="Bladder involvement"
                  checked={getBool("mriBladderInvolvement")}
                  onChange={(v) => setBool("mriBladderInvolvement", v)}
                  highlight
                />
                <FindingCheckbox
                  id="mri-ureteric"
                  label="Ureteric involvement"
                  checked={getBool("mriUretericInvolvement")}
                  onChange={(v) => setBool("mriUretericInvolvement", v)}
                  highlight
                />
                <FindingCheckbox
                  id="mri-hydronephrosis"
                  label="Hydronephrosis"
                  checked={mriFindings.includes("hydronephrosis")}
                  onChange={() => toggleArr("mriFindings", "hydronephrosis")}
                  highlight
                />
                <FindingCheckbox
                  id="mri-extrapelvic"
                  label="Extrapelvic / diaphragmatic"
                  checked={mriFindings.includes("extrapelvic")}
                  onChange={() => toggleArr("mriFindings", "extrapelvic")}
                  highlight
                />
              </div>
              <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                <AlertCircle className="w-3 h-3" />
                Red-highlighted findings may indicate specialist BSGE referral per NICE NG73 §1.5
              </p>
            </div>

            {showMriEndometriomaSize && (
              <div className="space-y-1">
                <Label className="text-xs font-medium">Endometrioma size</Label>
                <Select
                  value={getValue("mriEndometriomaSize") ?? ""}
                  onValueChange={(v) => setValue("mriEndometriomaSize", v)}
                >
                  <SelectTrigger className="h-9 w-56">
                    <SelectValue placeholder="Select size" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="lt3cm">&lt; 3 cm</SelectItem>
                    <SelectItem value="3to5cm">3 – 5 cm</SelectItem>
                    <SelectItem value="gt5cm">&gt; 5 cm</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="space-y-1">
              <Label htmlFor="mriNotes" className="text-xs font-medium">
                Additional notes <span className="text-muted-foreground">(optional)</span>
              </Label>
              <Input
                id="mriNotes"
                value={getValue("mriNotes") ?? ""}
                onChange={(e) => setValue("mriNotes", e.target.value)}
                className="h-9"
                placeholder="Any additional observations..."
              />
            </div>
          </CardContent>
        </Card>

        {/* ─── Laparoscopy ─── */}
        <Card className="shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <div className="p-1.5 rounded-md bg-primary/10 text-primary">
                <Microscope className="w-4 h-4" />
              </div>
              Laparoscopy
              {getBool("laparoscopyCompleted") && (
                <Badge variant="secondary" className="ml-auto text-xs bg-green-100 text-green-700 border-green-200">
                  Completed
                </Badge>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <StatusRow prefix="laparoscopy" getValue={getValue} setValue={setValue} />

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="space-y-1">
                <Label className="text-xs font-medium">Type</Label>
                <Select
                  value={getValue("laparoscopyType") ?? ""}
                  onValueChange={(v) => setValue("laparoscopyType", v)}
                >
                  <SelectTrigger className="h-9">
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="diagnostic">Diagnostic</SelectItem>
                    <SelectItem value="operative">Operative</SelectItem>
                    <SelectItem value="diagnostic_operative">Diagnostic + Operative</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label className="text-xs font-medium">rAFS / rASRM Stage</Label>
                <Select
                  value={getValue("laparoscopyRafsStage") ?? ""}
                  onValueChange={(v) => setValue("laparoscopyRafsStage", v)}
                >
                  <SelectTrigger className="h-9">
                    <SelectValue placeholder="Select stage" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="I">Stage I — Minimal</SelectItem>
                    <SelectItem value="II">Stage II — Mild</SelectItem>
                    <SelectItem value="III">Stage III — Moderate</SelectItem>
                    <SelectItem value="IV">Stage IV — Severe</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label className="text-xs font-medium">Complications</Label>
                <Select
                  value={getValue("laparoscopyComplications") ?? ""}
                  onValueChange={(v) => setValue("laparoscopyComplications", v)}
                >
                  <SelectTrigger className="h-9">
                    <SelectValue placeholder="Select" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None</SelectItem>
                    <SelectItem value="minor">Minor</SelectItem>
                    <SelectItem value="major">Major</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Intraoperative Findings</Label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-1">
                {[
                  { value: "peritoneal_only", label: "Peritoneal disease only" },
                  { value: "endometrioma", label: "Endometrioma" },
                  { value: "deep_endometriosis", label: "Deep endometriosis" },
                  { value: "adhesions", label: "Adhesions" },
                  { value: "adenomyosis", label: "Adenomyosis" },
                  { value: "bowel_disease", label: "Bowel disease" },
                  { value: "bladder_disease", label: "Bladder disease" },
                  { value: "normal", label: "Normal / No endo" },
                ].map((f) => (
                  <FindingCheckbox
                    key={f.value}
                    id={`lap-${f.value}`}
                    label={f.label}
                    checked={lapFindings.includes(f.value)}
                    onChange={() => toggleArr("laparoscopyFindings", f.value)}
                    highlight={["deep_endometriosis", "bowel_disease", "bladder_disease"].includes(f.value)}
                  />
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                ENZIAN Classification
              </Label>
              <p className="text-xs text-muted-foreground">Select severity for each compartment (0 = none, 1 = &lt;1 cm, 2 = 1–3 cm, 3 = &gt;3 cm)</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {(["A", "B", "C", "D"] as const).map((cat) => {
                  const labels: Record<string, string> = {
                    A: "A — Rectovaginal space",
                    B: "B — Uterosacral ligaments",
                    C: "C — Rectum / sigmoid",
                    D: "D — Other locations",
                  };
                  const stored = parseJsonArray(getValue("laparoscopyEnzianScore") || "[]");
                  const entry = stored.find((s) => s.startsWith(cat));
                  const currentVal = entry ? entry.slice(1) : "";
                  function setEnzian(grade: string) {
                    const next = stored.filter((s) => !s.startsWith(cat));
                    if (grade !== "") next.push(`${cat}${grade}`);
                    setValue("laparoscopyEnzianScore", JSON.stringify(next));
                  }
                  return (
                    <div key={cat} className="space-y-1">
                      <Label className="text-xs font-medium">{labels[cat]}</Label>
                      <div className="flex gap-1">
                        {["", "0", "1", "2", "3"].map((g) => (
                          <button
                            key={g}
                            type="button"
                            onClick={() => setEnzian(g)}
                            className={`h-8 w-10 rounded text-xs font-medium border transition-colors ${
                              currentVal === g && g !== ""
                                ? "bg-primary text-primary-foreground border-primary"
                                : g === ""
                                ? currentVal === ""
                                  ? "bg-muted border-muted-foreground/30 text-muted-foreground font-normal"
                                  : "bg-transparent border-muted-foreground/20 text-muted-foreground/50 hover:bg-muted/50"
                                : "bg-transparent border-muted-foreground/20 text-muted-foreground hover:bg-muted/50"
                            }`}
                          >
                            {g === "" ? "—" : g}
                          </button>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="space-y-1">
              <Label htmlFor="lapNotes" className="text-xs font-medium">
                Additional notes <span className="text-muted-foreground">(optional)</span>
              </Label>
              <Input
                id="lapNotes"
                value={getValue("laparoscopyNotes") ?? ""}
                onChange={(e) => setValue("laparoscopyNotes", e.target.value)}
                className="h-9"
                placeholder="Any additional observations..."
              />
            </div>
          </CardContent>
        </Card>

        {/* ─── CA-125 ─── */}
        <Card className="shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <div className="p-1.5 rounded-md bg-primary/10 text-primary">
                <FlaskConical className="w-4 h-4" />
              </div>
              CA-125
              {getBool("ca125Completed") && (
                <Badge variant="secondary" className="ml-auto text-xs bg-green-100 text-green-700 border-green-200">
                  Completed
                </Badge>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <StatusRow prefix="ca125" getValue={getValue} setValue={setValue} />

            <div className="flex items-end gap-3">
              <div className="space-y-1 w-40">
                <Label htmlFor="ca125Value" className="text-xs font-medium">Result</Label>
                <div className="relative">
                  <Input
                    id="ca125Value"
                    type="number"
                    min="0"
                    step="0.1"
                    value={getValue("ca125Value") ?? ""}
                    onChange={(e) => setValue("ca125Value", e.target.value)}
                    className="h-9 pr-12"
                    placeholder="0"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground font-medium">
                    U/mL
                  </span>
                </div>
              </div>
              <p className="text-xs text-muted-foreground pb-2">Normal range: &lt; 35 U/mL</p>
            </div>

            <p className="text-xs text-muted-foreground flex items-center gap-1">
              <Info className="w-3 h-3" />
              NICE NG73: CA-125 is not recommended as a sole diagnostic test for endometriosis but may support clinical decision-making.
            </p>

            <div className="space-y-1">
              <Label htmlFor="ca125Notes" className="text-xs font-medium">
                Notes <span className="text-muted-foreground">(optional)</span>
              </Label>
              <Input
                id="ca125Notes"
                value={getValue("ca125Notes") ?? ""}
                onChange={(e) => setValue("ca125Notes", e.target.value)}
                className="h-9"
                placeholder="Clinical context..."
              />
            </div>
          </CardContent>
        </Card>

        {/* ─── FBC / Bloods ─── */}
        <Card className="shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <div className="p-1.5 rounded-md bg-primary/10 text-primary">
                <Droplets className="w-4 h-4" />
              </div>
              FBC / Bloods
              {getBool("fbcCompleted") && (
                <Badge variant="secondary" className="ml-auto text-xs bg-green-100 text-green-700 border-green-200">
                  Completed
                </Badge>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <StatusRow prefix="fbc" getValue={getValue} setValue={setValue} />
            <div className="space-y-1">
              <Label htmlFor="fbcNotes" className="text-xs font-medium">
                Notes <span className="text-muted-foreground">(optional)</span>
              </Label>
              <Input
                id="fbcNotes"
                value={getValue("fbcNotes") ?? ""}
                onChange={(e) => setValue("fbcNotes", e.target.value)}
                className="h-9"
                placeholder="Haemoglobin, inflammatory markers, etc..."
              />
            </div>
          </CardContent>
        </Card>

        {/* ─── Clinicians ─── */}
        <Card className="shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold">Clinicians</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label htmlFor="requestedBy" className="text-xs font-medium">Requested by</Label>
                <Input
                  id="requestedBy"
                  value={getValue("requestedBy") ?? ""}
                  onChange={(e) => setValue("requestedBy", e.target.value)}
                  className="h-9"
                  placeholder="Dr. Name"
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="reviewedBy" className="text-xs font-medium">Reviewed by</Label>
                <Input
                  id="reviewedBy"
                  value={getValue("reviewedBy") ?? ""}
                  onChange={(e) => setValue("reviewedBy", e.target.value)}
                  className="h-9"
                  placeholder="Dr. Name"
                />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="flex items-center gap-3 pb-8">
        <Button onClick={handleSubmit} disabled={mutation.isPending}>
          <Save className="w-4 h-4 mr-2" />
          {mutation.isPending ? "Saving..." : "Save Investigations"}
        </Button>
        <Button variant="outline" asChild>
          <Link href={`/patients/${patientId}`}>Cancel</Link>
        </Button>
      </div>
    </div>
  );
}
