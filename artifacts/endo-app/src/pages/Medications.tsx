import { useState } from "react";
import { useListMedications } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from "@/components/ui/select";
import {
  Accordion, AccordionContent, AccordionItem, AccordionTrigger
} from "@/components/ui/accordion";
import { Pill, Search, ShieldCheck, AlertTriangle, Layers, Package } from "lucide-react";
import { TIER_LABELS, TIER_COLORS, FORMULARY_COLORS } from "@/lib/triage";

const CATEGORY_LABELS: Record<string, string> = {
  "gnrh-agonist": "GnRH Agonist",
  "gnrh-antagonist": "GnRH Antagonist",
  progestin: "Progestin",
  ocp: "Combined OCP",
  nsaid: "NSAID",
  hormonal: "Hormonal",
  "pain-relief": "Pain Relief",
  other: "Other",
};

const EVIDENCE_COLORS: Record<string, string> = {
  "Level A": "bg-green-100 text-green-800 border-green-200",
  "Level B": "bg-blue-100 text-blue-700 border-blue-200",
  "Level C": "bg-muted text-muted-foreground border-border",
};

const CATEGORY_COLORS: Record<string, string> = {
  "gnrh-agonist": "bg-purple-100 text-purple-700 border-purple-200",
  "gnrh-antagonist": "bg-violet-100 text-violet-700 border-violet-200",
  progestin: "bg-pink-100 text-pink-700 border-pink-200",
  ocp: "bg-rose-100 text-rose-700 border-rose-200",
  nsaid: "bg-amber-100 text-amber-700 border-amber-200",
  hormonal: "bg-pink-100 text-pink-700 border-pink-200",
  "pain-relief": "bg-orange-100 text-orange-700 border-orange-200",
  other: "bg-muted text-muted-foreground border-border",
};

export default function Medications() {
  const [search, setSearch] = useState("");
  const [catFilter, setCatFilter] = useState("all");
  const [tierFilter, setTierFilter] = useState("all");
  const [formularyFilter, setFormularyFilter] = useState("all");

  const { data: meds, isLoading } = useListMedications({
    category: catFilter !== "all" ? catFilter : undefined,
    tier: tierFilter !== "all" ? tierFilter : undefined,
    formularyStatus: formularyFilter !== "all" ? formularyFilter : undefined,
  });

  const filtered = (meds ?? []).filter((m) =>
    !search ||
    m.name.toLowerCase().includes(search.toLowerCase()) ||
    (m.genericName?.toLowerCase() ?? "").includes(search.toLowerCase()) ||
    m.category.toLowerCase().includes(search.toLowerCase())
  );

  const categories = [...new Set((meds ?? []).map((m) => m.category))];

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Medication Reference</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          UK-appropriate pharmacological treatments for endometriosis with tier system and formulary status
        </p>
      </div>

      <div className="flex flex-col sm:flex-row gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search medications..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={catFilter} onValueChange={setCatFilter}>
          <SelectTrigger className="w-full sm:w-40"><SelectValue placeholder="Category" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            {categories.map((c) => (
              <SelectItem key={c} value={c}>{CATEGORY_LABELS[c] ?? c}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={tierFilter} onValueChange={setTierFilter}>
          <SelectTrigger className="w-full sm:w-40"><SelectValue placeholder="Tier" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Tiers</SelectItem>
            <SelectItem value="tier1">Tier 1 (First-Line)</SelectItem>
            <SelectItem value="tier2">Tier 2 (Second-Line)</SelectItem>
            <SelectItem value="tier3">Tier 3 (Third-Line)</SelectItem>
            <SelectItem value="analgesia">Analgesia</SelectItem>
          </SelectContent>
        </Select>
        <Select value={formularyFilter} onValueChange={setFormularyFilter}>
          <SelectTrigger className="w-full sm:w-36"><SelectValue placeholder="Formulary" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Formulary</SelectItem>
            <SelectItem value="green">Green</SelectItem>
            <SelectItem value="amber">Amber</SelectItem>
            <SelectItem value="red">Red</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <div className="space-y-2">
          {[1,2,3,4].map((i) => <Skeleton key={i} className="h-20 w-full rounded-lg" />)}
        </div>
      ) : filtered.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center">
            <Pill className="w-10 h-10 mx-auto text-muted-foreground/30 mb-3" />
            <p className="text-sm text-muted-foreground">No medications match your search.</p>
          </CardContent>
        </Card>
      ) : (
        <Accordion type="multiple" className="space-y-2">
          {filtered.map((med) => (
            <Card key={med.id} className="shadow-sm overflow-hidden">
              <AccordionItem value={String(med.id)} className="border-0">
                <AccordionTrigger className="px-4 py-3 hover:no-underline hover:bg-muted/30 [&[data-state=open]]:bg-muted/20 transition-colors">
                  <div className="flex items-center gap-3 text-left flex-1 mr-4">
                    <div className="p-2 rounded-md bg-primary/10 shrink-0">
                      <Pill className="w-4 h-4 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold text-sm">{med.name}</span>
                        {med.evidenceLevel && (
                          <span className={`text-[10px] font-medium border rounded-full px-2 py-0.5 ${EVIDENCE_COLORS[med.evidenceLevel] ?? ""}`}>
                            {med.evidenceLevel}
                          </span>
                        )}
                        <span className={`text-[10px] font-medium border rounded-full px-2 py-0.5 ${CATEGORY_COLORS[med.category] ?? "bg-muted text-muted-foreground border-border"}`}>
                          {CATEGORY_LABELS[med.category] ?? med.category}
                        </span>
                        {med.tier && (
                          <span className={`text-[10px] font-medium border rounded-full px-2 py-0.5 ${TIER_COLORS[med.tier] ?? "bg-muted"}`}>
                            {TIER_LABELS[med.tier] ?? med.tier}
                          </span>
                        )}
                        {med.formularyStatus && (
                          <span className={`text-[10px] font-medium border rounded-full px-2 py-0.5 ${FORMULARY_COLORS[med.formularyStatus] ?? "bg-muted"}`}>
                            {med.formularyStatus.charAt(0).toUpperCase() + med.formularyStatus.slice(1)}
                          </span>
                        )}
                        {med.niceApproved && (
                          <span className="text-[10px] font-medium bg-teal-50 text-teal-700 border border-teal-200 rounded-full px-2 py-0.5">NICE</span>
                        )}
                      </div>
                      {med.genericName && (
                        <p className="text-xs text-muted-foreground mt-0.5">{med.genericName}</p>
                      )}
                    </div>
                    <div className="flex flex-wrap gap-1 shrink-0 hidden sm:flex">
                      {(med.approvedStages as string[]).map((s) => (
                        <Badge key={s} variant="outline" className="text-[10px] px-1.5 py-0">{s}</Badge>
                      ))}
                    </div>
                  </div>
                </AccordionTrigger>
                <AccordionContent>
                  <div className="px-4 pb-4 space-y-4 border-t border-border/50 pt-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <p className="text-[10px] uppercase tracking-wide text-muted-foreground font-medium mb-1">Mechanism</p>
                        <p className="text-sm">{med.mechanism}</p>
                      </div>
                      <div>
                        <p className="text-[10px] uppercase tracking-wide text-muted-foreground font-medium mb-1">Indications</p>
                        <p className="text-sm">{med.indications}</p>
                      </div>
                    </div>

                    {med.dosage && (
                      <div className="bg-muted/50 rounded-md p-3">
                        <p className="text-[10px] uppercase tracking-wide text-muted-foreground font-medium mb-1">Dosage</p>
                        <p className="text-sm font-medium">{med.dosage}</p>
                      </div>
                    )}

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {med.contraindications && (
                        <div>
                          <div className="flex items-center gap-1.5 mb-1">
                            <AlertTriangle className="w-3.5 h-3.5 text-destructive" />
                            <p className="text-[10px] uppercase tracking-wide text-muted-foreground font-medium">Contraindications</p>
                          </div>
                          <p className="text-xs text-muted-foreground">{med.contraindications}</p>
                        </div>
                      )}
                      {med.sideEffects && (
                        <div>
                          <p className="text-[10px] uppercase tracking-wide text-muted-foreground font-medium mb-1">Side Effects</p>
                          <p className="text-xs text-muted-foreground">{med.sideEffects}</p>
                        </div>
                      )}
                    </div>

                    {med.niceTa && (
                      <div className="flex items-start gap-2 bg-teal-50 rounded-md p-3">
                        <ShieldCheck className="w-4 h-4 text-teal-600 shrink-0 mt-0.5" />
                        <p className="text-xs text-teal-800">NICE TA: {med.niceTa}</p>
                      </div>
                    )}
                    {med.formularyNotes && (
                      <div className="flex items-start gap-2 bg-amber-50 rounded-md p-3">
                        <Package className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                        <p className="text-xs text-amber-800">{med.formularyNotes}</p>
                      </div>
                    )}
                    {med.notes && (
                      <div className="flex items-start gap-2 bg-primary/5 rounded-md p-3">
                        <ShieldCheck className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                        <p className="text-xs">{med.notes}</p>
                      </div>
                    )}

                    <div className="flex flex-wrap gap-1">
                      {(med.approvedStages as string[]).map((s) => (
                        <Badge key={s} variant="secondary" className="text-xs">{s}</Badge>
                      ))}
                    </div>
                  </div>
                </AccordionContent>
              </AccordionItem>
            </Card>
          ))}
        </Accordion>
      )}
    </div>
  );
}
