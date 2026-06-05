import { Router } from "express";
import { db } from "@workspace/db";
import { managementPlansTable, patientsTable, activityLogTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";

const router = Router();

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
    const { patientId, assessmentId, status, approach, medications, surgicalOptions, lifestyleRecommendations, followUpWeeks, nextReviewDate, goals, clinicianNotes } = req.body;
    const [plan] = await db.insert(managementPlansTable).values({
      patientId, assessmentId, status, approach,
      medications: JSON.stringify(medications ?? []),
      surgicalOptions: JSON.stringify(surgicalOptions ?? []),
      lifestyleRecommendations: JSON.stringify(lifestyleRecommendations ?? []),
      followUpWeeks, nextReviewDate, goals, clinicianNotes,
    }).returning();

    const [patient] = await db.select().from(patientsTable).where(eq(patientsTable.id, patientId));
    const patientName = patient ? `${patient.firstName} ${patient.lastName}` : `Patient #${patientId}`;

    await db.insert(activityLogTable).values({
      type: "plan-created",
      description: `Management plan created for ${patientName} — Approach: ${approach ?? "not specified"}`,
      patientId,
      patientName,
    });

    res.status(201).json(mapPlan(plan));
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Failed to create management plan" });
  }
});

router.get("/management-plans/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const [plan] = await db.select().from(managementPlansTable).where(eq(managementPlansTable.id, id));
    if (!plan) return res.status(404).json({ error: "Management plan not found" });
    res.json(mapPlan(plan));
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Failed to get management plan" });
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

    res.json(mapPlan(plan));
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Failed to update management plan" });
  }
});

export default router;
