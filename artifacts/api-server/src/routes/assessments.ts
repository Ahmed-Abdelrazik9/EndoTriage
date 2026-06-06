import { Router } from "express";
import { db } from "@workspace/db";
import { assessmentsTable, patientsTable, activityLogTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { computeTriageAndStage } from "@workspace/triage-engine";

const router = Router();

router.get("/patients/:id/assessments", async (req, res) => {
  try {
    const patientId = parseInt(req.params.id);
    const assessments = await db
      .select()
      .from(assessmentsTable)
      .where(eq(assessmentsTable.patientId, patientId))
      .orderBy(assessmentsTable.createdAt);
    res.json(assessments.map((a) => ({ ...a, createdAt: a.createdAt.toISOString() })));
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Failed to list assessments" });
  }
});

router.post("/assessments", async (req, res) => {
  try {
    const {
      patientId, assessmentDate,
      dysmenorrhea, chronicPelvicPain, dyspareunia, dyschezia, dysuria,
      infertilityHistory, previousSurgery, familyHistory,
      symptomDurationMonths, impactOnQuality,
      irregularBleeding, bloating, fatigue,
      bowelInvolvement, bladderInvolvement, uretericInvolvement,
      fertilityPriority, negativeLaparoscopy, chronicPainPredominant,
      symptomsControlledOnMedication, previousTreatmentHistory,
      clinicianNotes,
    } = req.body;

    const {
      triageLevel, triageScore, suggestedStage,
      suggestedPathway, pathwayJustification,
      mdtRequired, bsgeReferral, mriRequired,
      avoidGnRH, fertilityReferral, painClinic, psychSupport,
    } = computeTriageAndStage({
      dysmenorrhea, chronicPelvicPain, dyspareunia, dyschezia, dysuria,
      infertilityHistory, previousSurgery, familyHistory,
      symptomDurationMonths, impactOnQuality,
      irregularBleeding, bloating, fatigue,
      bowelInvolvement: !!bowelInvolvement,
      bladderInvolvement: !!bladderInvolvement,
      uretericInvolvement: !!uretericInvolvement,
      fertilityPriority: !!fertilityPriority,
      negativeLaparoscopy: !!negativeLaparoscopy,
      chronicPainPredominant: !!chronicPainPredominant,
      symptomsControlledOnMedication: !!symptomsControlledOnMedication,
      previousTreatmentHistory: previousTreatmentHistory || "",
    });

    const [assessment] = await db.insert(assessmentsTable).values({
      patientId, assessmentDate,
      dysmenorrhea, chronicPelvicPain, dyspareunia, dyschezia, dysuria,
      infertilityHistory, previousSurgery, familyHistory,
      symptomDurationMonths, impactOnQuality,
      irregularBleeding, bloating, fatigue,
      bowelInvolvement, bladderInvolvement, uretericInvolvement,
      fertilityPriority, negativeLaparoscopy, chronicPainPredominant,
      symptomsControlledOnMedication, previousTreatmentHistory,
      triageLevel, triageScore, suggestedStage,
      suggestedPathway, pathwayJustification,
      mdtRequired, bsgeReferral, mriRequired,
      avoidGnRH, fertilityReferral, painClinic, psychSupport,
      clinicianNotes,
    }).returning();

    // Update patient: triage level, stage, pathway, and last assessment date
    const [patient] = await db
      .update(patientsTable)
      .set({
        triageLevel,
        currentStage: suggestedStage,
        lastAssessmentDate: assessmentDate,
        currentPathway: suggestedPathway,
        carePathwayState: suggestedPathway === "surgery_specialist" ? "mdt_discussed" : "triage_decision",
      })
      .where(eq(patientsTable.id, patientId))
      .returning();

    const patientName = patient ? `${patient.firstName} ${patient.lastName}` : `Patient #${patientId}`;

    await db.insert(activityLogTable).values({
      type: "assessment",
      description: `Assessment for ${patientName} — Pathway: ${suggestedPathway}, Triage: ${triageLevel}, Score: ${triageScore}`,
      patientId,
      patientName,
    });

    res.status(201).json({ ...assessment, createdAt: assessment.createdAt.toISOString() });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Failed to create assessment" });
  }
});

router.get("/assessments/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const [assessment] = await db.select().from(assessmentsTable).where(eq(assessmentsTable.id, id));
    if (!assessment) return res.status(404).json({ error: "Assessment not found" });
    return res.json({ ...assessment, createdAt: assessment.createdAt.toISOString() });
  } catch (err) {
    req.log.error(err);
    return res.status(500).json({ error: "Failed to get assessment" });
  }
});

export default router;
