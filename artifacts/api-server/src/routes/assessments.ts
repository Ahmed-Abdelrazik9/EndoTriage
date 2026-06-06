import { Router } from "express";
import { db } from "@workspace/db";
import { assessmentsTable, patientsTable, activityLogTable } from "@workspace/db";
import { eq } from "drizzle-orm";

const router = Router();

export type PathwayResult = {
  triageLevel: string;
  triageScore: number;
  suggestedStage: string;
  suggestedPathway: string;
  pathwayJustification: string;
  mdtRequired: boolean;
  bsgeReferral: boolean;
  mriRequired: boolean;
  avoidGnRH: boolean;
  fertilityReferral: boolean;
  painClinic: boolean;
  psychSupport: boolean;
};

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
  bowelInvolvement?: boolean;
  bladderInvolvement?: boolean;
  uretericInvolvement?: boolean;
  fertilityPriority?: boolean;
  negativeLaparoscopy?: boolean;
  chronicPainPredominant?: boolean;
  symptomsControlledOnMedication?: boolean;
  previousTreatmentHistory?: string | null;
}): PathwayResult {
  let score = 0;

  const maxPain = Math.max(data.dysmenorrhea, data.chronicPelvicPain, data.dyspareunia, data.dyschezia, data.dysuria);
  score += maxPain * 2;
  score += data.impactOnQuality * 2;

  if (data.infertilityHistory) score += 15;
  if (data.previousSurgery) score += 10;
  if (data.familyHistory) score += 8;

  if (data.symptomDurationMonths > 24) score += 10;
  else if (data.symptomDurationMonths > 12) score += 6;
  else if (data.symptomDurationMonths > 6) score += 3;

  if (data.irregularBleeding) score += 5;
  if (data.bloating) score += 2;
  if (data.fatigue) score += 2;

  let triageLevel: string;
  if (score >= 70) triageLevel = "urgent";
  else if (score >= 45) triageLevel = "high";
  else if (score >= 25) triageLevel = "moderate";
  else triageLevel = "routine";

  // Stage suggestion
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

  // ===== PATHWAY DETERMINATION =====
  const deepEndoSuspected = data.bowelInvolvement || data.bladderInvolvement || data.uretericInvolvement;
  const persistentSymptoms = data.symptomDurationMonths > 6 && (data.previousSurgery || score >= 25);
  const firstPresentation = data.symptomDurationMonths <= 6 && !data.previousSurgery;

  let suggestedPathway: string;
  let pathwayJustification: string;
  let mdtRequired = false;
  let bsgeReferral = false;
  let mriRequired = false;
  let avoidGnRH = false;
  let fertilityReferral = false;
  let painClinic = false;
  let psychSupport = false;

  const reasons: string[] = [];

  if (deepEndoSuspected) {
    suggestedPathway = "surgery_specialist";
    reasons.push("Deep endometriosis suspected/confirmed");
    if (data.bowelInvolvement) reasons.push("Bowel involvement");
    if (data.bladderInvolvement) reasons.push("Bladder involvement");
    if (data.uretericInvolvement) reasons.push("Ureteric involvement");
    mdtRequired = true;
    bsgeReferral = true;
    mriRequired = true;
  } else if (data.negativeLaparoscopy && data.chronicPainPredominant) {
    suggestedPathway = "chronic_pain";
    reasons.push("Chronic pain predominant with negative laparoscopy");
    painClinic = true;
    psychSupport = true;
  } else if (data.chronicPainPredominant && score >= 45 && !deepEndoSuspected) {
    suggestedPathway = "chronic_pain";
    reasons.push("Severe chronic pain not explained by deep endometriosis");
    painClinic = true;
    psychSupport = true;
  } else if (persistentSymptoms && !deepEndoSuspected && !data.symptomsControlledOnMedication) {
    suggestedPathway = "surgery_general";
    reasons.push("Persistent symptoms not responding to medical management");
    reasons.push("No deep endometriosis on imaging");
  } else if (firstPresentation || data.symptomsControlledOnMedication) {
    suggestedPathway = "medical";
    if (firstPresentation) reasons.push("First presentation — initial medical management");
    if (data.symptomsControlledOnMedication) reasons.push("Symptoms controlled on current medication — continue");
  } else {
    suggestedPathway = "medical";
    reasons.push("Medical management recommended as first-line approach");
  }

  // Fertility priority modifier
  if (data.fertilityPriority) {
    avoidGnRH = true;
    fertilityReferral = true;
    reasons.push("Fertility priority — avoid GnRH analogues/antagonists, consider fertility referral");
  }

  // Persistent symptoms + previous surgery
  if (data.previousSurgery && persistentSymptoms) {
    bsgeReferral = true;
    reasons.push("Recurrent symptoms after previous surgery — specialist review");
  }

  // Failed previous treatment
  if (data.previousTreatmentHistory && data.previousTreatmentHistory.toLowerCase().includes("failed")) {
    if (suggestedPathway === "medical") {
      suggestedPathway = "surgery_general";
      reasons.push("Previous medical treatment failed — consider surgical option");
    } else if (suggestedPathway === "surgery_general") {
      suggestedPathway = "surgery_specialist";
      reasons.push("Failed previous surgery — specialist BSGE referral");
      mdtRequired = true;
      bsgeReferral = true;
    }
  }

  pathwayJustification = reasons.join("; ");

  return {
    triageLevel,
    triageScore: score,
    suggestedStage,
    suggestedPathway,
    pathwayJustification,
    mdtRequired,
    bsgeReferral,
    mriRequired,
    avoidGnRH,
    fertilityReferral,
    painClinic,
    psychSupport,
  };
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
      bowelInvolvement, bladderInvolvement, uretericInvolvement,
      fertilityPriority, negativeLaparoscopy, chronicPainPredominant,
      symptomsControlledOnMedication, previousTreatmentHistory,
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
