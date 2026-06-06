import { Router } from "express";
import { db } from "@workspace/db";
import { assessmentsTable, investigationsTable, patientsTable } from "@workspace/db";
import { eq, desc } from "drizzle-orm";
import { computeSurgicalTriage, type TriageInput, type InvestigationResult } from "@workspace/triage-engine";

const router = Router();

function parseInvestigationResult(inv: any): InvestigationResult {
  return {
    tvusCompleted: inv?.tvusCompleted,
    tvusEndometrioma: inv?.tvusEndometrioma,
    tvusEndometriomaSize: inv?.tvusEndometriomaSize,
    tvusDeepEndometriosis: inv?.tvusDeepEndometriosis,
    tvusAdenomyosis: inv?.tvusAdenomyosis,
    tvusNormal: inv?.tvusNormal,
    mriCompleted: inv?.mriCompleted,
    mriDeepEndometriosis: inv?.mriDeepEndometriosis,
    mriEndometrioma: inv?.mriEndometrioma,
    mriUretericInvolvement: inv?.mriUretericInvolvement,
    mriBowelInvolvement: inv?.mriBowelInvolvement,
    mriBladderInvolvement: inv?.mriBladderInvolvement,
    mriNormal: inv?.mriNormal,
    laparoscopyCompleted: inv?.laparoscopyCompleted,
    laparoscopyRafsStage: inv?.laparoscopyRafsStage,
    ca125Completed: inv?.ca125Completed,
    ca125Value: inv?.ca125Value,
  };
}

function assessmentToTriageInput(a: any): TriageInput {
  return {
    dysmenorrhea: a.dysmenorrhea ?? 0,
    chronicPelvicPain: a.chronicPelvicPain ?? 0,
    dyspareunia: a.dyspareunia ?? 0,
    dyschezia: a.dyschezia ?? 0,
    dysuria: a.dysuria ?? 0,
    infertilityHistory: a.infertilityHistory ?? false,
    previousSurgery: a.previousSurgery ?? false,
    familyHistory: a.familyHistory ?? false,
    symptomDurationMonths: a.symptomDurationMonths ?? 0,
    impactOnQuality: a.impactOnQuality ?? 0,
    irregularBleeding: a.irregularBleeding ?? false,
    bloating: a.bloating ?? false,
    fatigue: a.fatigue ?? false,
    bowelInvolvement: a.bowelInvolvement ?? false,
    bladderInvolvement: a.bladderInvolvement ?? false,
    uretericInvolvement: a.uretericInvolvement ?? false,
    fertilityPriority: a.fertilityPriority ?? false,
    negativeLaparoscopy: a.negativeLaparoscopy ?? false,
    chronicPainPredominant: a.chronicPainPredominant ?? false,
    symptomsControlledOnMedication: a.symptomsControlledOnMedication ?? false,
    previousTreatmentHistory: a.previousTreatmentHistory ?? null,
  };
}

router.get("/surgical-triage", async (req, res) => {
  try {
    const patientId = parseInt(req.query.patientId as string);
    if (!patientId) return res.status(400).json({ error: "patientId required" });

    const [patient] = await db.select().from(patientsTable).where(eq(patientsTable.id, patientId));
    if (!patient) return res.status(404).json({ error: "Patient not found" });

    const [latestAssessment] = await db
      .select()
      .from(assessmentsTable)
      .where(eq(assessmentsTable.patientId, patientId))
      .orderBy(desc(assessmentsTable.createdAt))
      .limit(1);

    if (!latestAssessment) {
      return res.status(404).json({ error: "No assessment found for patient" });
    }

    const [investigation] = await db
      .select()
      .from(investigationsTable)
      .where(eq(investigationsTable.patientId, patientId));

    const result = computeSurgicalTriage(
      assessmentToTriageInput(latestAssessment),
      parseInvestigationResult(investigation)
    );

    return res.json({
      ...result,
      patientId,
      patientName: `${patient.firstName} ${patient.lastName}`,
    });
  } catch (err) {
    req.log.error(err);
    return res.status(500).json({ error: "Failed to compute surgical triage" });
  }
});

export default router;
