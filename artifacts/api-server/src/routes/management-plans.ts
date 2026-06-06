import { Router } from "express";
import { db } from "@workspace/db";
import { managementPlansTable, patientsTable, activityLogTable, assessmentsTable, investigationsTable } from "@workspace/db";
import { eq, and, desc } from "drizzle-orm";
import { computeManagementPlan } from "@workspace/triage-engine";

const router = Router();

function parseInvestigationResult(inv: any) {
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

function parseJSON(val: string | null | undefined, fallback: string[] = []): string[] {
  try {
    return val ? JSON.parse(val) : fallback;
  } catch {
    return fallback;
  }
}

function mapPlan(p: typeof managementPlansTable.$inferSelect) {
  return {
    ...p,
    medications: parseJSON(p.medications),
    surgicalOptions: parseJSON(p.surgicalOptions),
    lifestyleRecommendations: parseJSON(p.lifestyleRecommendations),
    createdAt: p.createdAt.toISOString(),
    updatedAt: p.updatedAt?.toISOString() ?? null,
  };
}

router.get("/management-plans/recommend", async (req, res) => {
  try {
    const patientId = parseInt(req.query.patientId as string);
    if (!patientId) return res.status(400).json({ error: "patientId required" });

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

    const invResult = parseInvestigationResult(investigation);
    const recommendation = computeManagementPlan(latestAssessment, invResult);

    // Build structured investigationFindings for the frontend recommendation card
    const investigationFindings = investigation
      ? {
          tvus: {
            completed: investigation.tvusCompleted,
            endometrioma: investigation.tvusEndometrioma,
            endometriomaSize: investigation.tvusEndometriomaSize,
            deepEndometriosis: investigation.tvusDeepEndometriosis,
            adenomyosis: investigation.tvusAdenomyosis,
            normal: investigation.tvusNormal,
          },
          mri: {
            completed: investigation.mriCompleted,
            deepEndometriosis: investigation.mriDeepEndometriosis,
            endometrioma: investigation.mriEndometrioma,
            uretericInvolvement: investigation.mriUretericInvolvement,
            bowelInvolvement: investigation.mriBowelInvolvement,
            bladderInvolvement: investigation.mriBladderInvolvement,
            normal: investigation.mriNormal,
          },
          laparoscopy: {
            completed: investigation.laparoscopyCompleted,
            rafsStage: investigation.laparoscopyRafsStage,
            enzianScore: investigation.laparoscopyEnzianScore,
          },
          ca125: {
            completed: investigation.ca125Completed,
            value: investigation.ca125Value,
          },
        }
      : null;

    return res.json({ ...recommendation, investigationFindings });
  } catch (err) {
    req.log.error(err);
    return res.status(500).json({ error: "Failed to get recommendation" });
  }
});

router.get("/management-plans", async (req, res) => {
  try {
    const { patientId, status } = req.query as Record<string, string | undefined>;
    const conditions = [];
    if (patientId) conditions.push(eq(managementPlansTable.patientId, parseInt(patientId)));
    if (status) conditions.push(eq(managementPlansTable.status, status));
    const plans = await db
      .select()
      .from(managementPlansTable)
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(managementPlansTable.createdAt);
    res.json(plans.map(mapPlan));
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Failed to list management plans" });
  }
});

router.post("/management-plans", async (req, res) => {
  try {
    const { patientId, assessmentId, status, approach, pathway, pathwayRationale, investigationFindings, recommendedPathway, medications, surgicalOptions, lifestyleRecommendations, followUpWeeks, nextReviewDate, goals, clinicianNotes } = req.body;
    const [plan] = await db.insert(managementPlansTable).values({
      patientId, assessmentId, status, approach,
      pathway: pathway ?? null,
      pathwayRationale: pathwayRationale ?? null,
      investigationFindings: investigationFindings ?? null,
      recommendedPathway: recommendedPathway ?? null,
      medications: JSON.stringify(medications ?? []),
      surgicalOptions: JSON.stringify(surgicalOptions ?? []),
      lifestyleRecommendations: JSON.stringify(lifestyleRecommendations ?? []),
      followUpWeeks, nextReviewDate, goals, clinicianNotes,
    }).returning();

    const [patient] = await db.select().from(patientsTable).where(eq(patientsTable.id, patientId));
    const patientName = patient ? `${patient.firstName} ${patient.lastName}` : `Patient #${patientId}`;

    // Update patient's current pathway based on the plan
    if (pathway) {
      await db.update(patientsTable).set({
        currentPathway: pathway,
        carePathwayState: "triage_decision",
      }).where(eq(patientsTable.id, patientId));
    }

    await db.insert(activityLogTable).values({
      type: "plan-created",
      description: `Management plan created for ${patientName} — Approach: ${approach ?? "not specified"}${pathway ? `, Pathway: ${pathway}` : ""}`,
      patientId,
      patientName,
    });

    return res.status(201).json(mapPlan(plan));
  } catch (err) {
    req.log.error(err);
    return res.status(500).json({ error: "Failed to create management plan" });
  }
});

router.get("/management-plans/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const [plan] = await db.select().from(managementPlansTable).where(eq(managementPlansTable.id, id));
    if (!plan) return res.status(404).json({ error: "Management plan not found" });
    return res.json(mapPlan(plan));
  } catch (err) {
    req.log.error(err);
    return res.status(500).json({ error: "Failed to get management plan" });
  }
});

router.patch("/management-plans/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const { status, approach, medications, surgicalOptions, lifestyleRecommendations, followUpWeeks, nextReviewDate, goals, clinicianNotes } = req.body;
    const updates: Record<string, unknown> = {};
    if (status !== undefined) updates.status = status;
    if (approach !== undefined) updates.approach = approach;
    if (medications !== undefined) updates.medications = JSON.stringify(medications);
    if (surgicalOptions !== undefined) updates.surgicalOptions = JSON.stringify(surgicalOptions);
    if (lifestyleRecommendations !== undefined) updates.lifestyleRecommendations = JSON.stringify(lifestyleRecommendations);
    if (followUpWeeks !== undefined) updates.followUpWeeks = followUpWeeks;
    if (nextReviewDate !== undefined) updates.nextReviewDate = nextReviewDate;
    if (goals !== undefined) updates.goals = goals;
    if (clinicianNotes !== undefined) updates.clinicianNotes = clinicianNotes;

    const [plan] = await db.update(managementPlansTable).set(updates).where(eq(managementPlansTable.id, id)).returning();
    if (!plan) return res.status(404).json({ error: "Management plan not found" });

    await db.insert(activityLogTable).values({
      type: "plan-updated",
      description: `Management plan #${id} updated — Status: ${plan.status}`,
      patientId: plan.patientId,
    });

    return res.json(mapPlan(plan));
  } catch (err) {
    req.log.error(err);
    return res.status(500).json({ error: "Failed to update management plan" });
  }
});

export default router;
