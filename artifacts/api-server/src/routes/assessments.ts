import { Router } from "express";
import { db } from "@workspace/db";
import { assessmentsTable, patientsTable, activityLogTable } from "@workspace/db";
import { eq } from "drizzle-orm";

const router = Router();

function computeTriageAndStage(data: {
  dysmenorrhea: number;
  chronicPelvicPain: number;
  dyspareunia: number;
  dyschezia: number;
  dysuria: number;
  infertilityHistory: boolean;
  previousSurgery: boolean;
  familyHistory: boolean;
  symptomDurationMonths: number;
  impactOnQuality: number;
  irregularBleeding: boolean;
  bloating: boolean;
  fatigue: boolean;
}) {
  let score = 0;

  // Pain scores contribute heavily
  const maxPain = Math.max(data.dysmenorrhea, data.chronicPelvicPain, data.dyspareunia, data.dyschezia, data.dysuria);
  score += maxPain * 2;
  score += data.impactOnQuality * 2;

  // Risk factors
  if (data.infertilityHistory) score += 15;
  if (data.previousSurgery) score += 10;
  if (data.familyHistory) score += 8;

  // Duration
  if (data.symptomDurationMonths > 24) score += 10;
  else if (data.symptomDurationMonths > 12) score += 6;
  else if (data.symptomDurationMonths > 6) score += 3;

  // Secondary symptoms
  if (data.irregularBleeding) score += 5;
  if (data.bloating) score += 2;
  if (data.fatigue) score += 2;

  // Triage level
  let triageLevel: string;
  if (score >= 70) triageLevel = "urgent";
  else if (score >= 45) triageLevel = "high";
  else if (score >= 25) triageLevel = "moderate";
  else triageLevel = "routine";

  // Stage suggestion (simplified clinical heuristic)
  let suggestedStage: string;
  const severePain = data.dysmenorrhea >= 7 || data.chronicPelvicPain >= 7;
  const deepPain = data.dyspareunia >= 7 || data.dyschezia >= 7;
  if (score >= 70 || (severePain && deepPain && data.infertilityHistory)) {
    suggestedStage = "Stage IV";
  } else if (score >= 45 || (severePain && (data.infertilityHistory || data.previousSurgery))) {
    suggestedStage = "Stage III";
  } else if (score >= 25 || severePain) {
    suggestedStage = "Stage II";
  } else {
    suggestedStage = "Stage I";
  }

  return { triageLevel, triageScore: score, suggestedStage };
}

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
      clinicianNotes,
    } = req.body;

    const { triageLevel, triageScore, suggestedStage } = computeTriageAndStage({
      dysmenorrhea, chronicPelvicPain, dyspareunia, dyschezia, dysuria,
      infertilityHistory, previousSurgery, familyHistory,
      symptomDurationMonths, impactOnQuality,
      irregularBleeding, bloating, fatigue,
    });

    const [assessment] = await db.insert(assessmentsTable).values({
      patientId, assessmentDate,
      dysmenorrhea, chronicPelvicPain, dyspareunia, dyschezia, dysuria,
      infertilityHistory, previousSurgery, familyHistory,
      symptomDurationMonths, impactOnQuality,
      irregularBleeding, bloating, fatigue,
      triageLevel, triageScore, suggestedStage,
      clinicianNotes,
    }).returning();

    // Update patient's triage level, stage, and last assessment date
    const [patient] = await db
      .update(patientsTable)
      .set({ triageLevel, currentStage: suggestedStage, lastAssessmentDate: assessmentDate })
      .where(eq(patientsTable.id, patientId))
      .returning();

    const patientName = patient ? `${patient.firstName} ${patient.lastName}` : `Patient #${patientId}`;

    await db.insert(activityLogTable).values({
      type: "assessment",
      description: `Symptom assessment completed for ${patientName} — Triage: ${triageLevel}, Score: ${triageScore}`,
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
    res.json({ ...assessment, createdAt: assessment.createdAt.toISOString() });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Failed to get assessment" });
  }
});

export default router;
