import { Router } from "express";
import { db } from "@workspace/db";
import { surgeriesTable, activityLogTable, patientsTable } from "@workspace/db";
import { eq, desc } from "drizzle-orm";

const router = Router();

router.get("/patients/:id/surgeries", async (req, res) => {
  try {
    const patientId = parseInt(req.params.id);
    const surgeries = await db
      .select()
      .from(surgeriesTable)
      .where(eq(surgeriesTable.patientId, patientId))
      .orderBy(desc(surgeriesTable.createdAt));

    res.json(surgeries.map((s) => ({
      ...s,
      procedureDetails: JSON.parse(s.procedureDetails as string),
      locations: JSON.parse(s.locations as string),
      createdAt: s.createdAt.toISOString(),
      updatedAt: s.updatedAt?.toISOString() ?? null,
    })));
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Failed to list surgeries" });
  }
});

router.post("/patients/:id/surgeries", async (req, res) => {
  try {
    const patientId = parseInt(req.params.id);
    const body = req.body;

    const [surgery] = await db.insert(surgeriesTable).values({
      patientId,
      plannedDate: body.plannedDate,
      actualDate: body.actualDate,
      surgeon: body.surgeon,
      surgeonGrade: body.surgeonGrade,
      centre: body.centre,
      bsgeAccredited: body.bsgeAccredited ?? false,
      procedureType: body.procedureType,
      procedureDetails: JSON.stringify(body.procedureDetails ?? []),
      rafsStage: body.rafsStage,
      enzianScore: body.enzianScore,
      locations: JSON.stringify(body.locations ?? []),
      endometriomaPresent: body.endometriomaPresent ?? false,
      endometriomaRight: body.endometriomaRight ?? false,
      endometriomaLeft: body.endometriomaLeft ?? false,
      endometriomaRightSize: body.endometriomaRightSize,
      endometriomaLeftSize: body.endometriomaLeftSize,
      deepEndometriosis: body.deepEndometriosis ?? false,
      deepEndometriosisLocation: body.deepEndometriosisLocation,
      adhesions: body.adhesions ?? false,
      adhesionsSeverity: body.adhesionsSeverity,
      complications: body.complications ?? false,
      complicationsDetails: body.complicationsDetails,
      estimatedBloodLoss: body.estimatedBloodLoss,
      operativeTime: body.operativeTime,
      histologyConfirmed: body.histologyConfirmed ?? false,
      histologyDetails: body.histologyDetails,
      postOpHormonalPlan: body.postOpHormonalPlan,
      followUpRequired: body.followUpRequired ?? true,
      followUpWeeks: body.followUpWeeks ?? 6,
      outcome: body.outcome,
      consentObtained: body.consentObtained ?? false,
      consentDate: body.consentDate,
      mdtDiscussed: body.mdtDiscussed ?? false,
      mdtDate: body.mdtDate,
      preOpNotes: body.preOpNotes,
      intraOpNotes: body.intraOpNotes,
      postOpNotes: body.postOpNotes,
    }).returning();

    const [patient] = await db.select().from(patientsTable).where(eq(patientsTable.id, patientId));
    await db.insert(activityLogTable).values({
      type: "surgery-completed",
      description: `Surgery recorded: ${body.procedureType}${body.rafsStage ? ` — ${body.rafsStage}` : ""}${body.bsgeAccredited ? " (BSGE)" : ""}`,
      patientId,
      patientName: patient ? `${patient.firstName} ${patient.lastName}` : undefined,
    });

    res.status(201).json({
      ...surgery,
      procedureDetails: JSON.parse(surgery.procedureDetails as string),
      locations: JSON.parse(surgery.locations as string),
      createdAt: surgery.createdAt.toISOString(),
      updatedAt: surgery.updatedAt?.toISOString() ?? null,
    });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Failed to create surgery record" });
  }
});

router.get("/surgeries/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const [surgery] = await db.select().from(surgeriesTable).where(eq(surgeriesTable.id, id));
    if (!surgery) return res.status(404).json({ error: "Surgery not found" });
    return res.json({
      ...surgery,
      procedureDetails: JSON.parse(surgery.procedureDetails as string),
      locations: JSON.parse(surgery.locations as string),
      createdAt: surgery.createdAt.toISOString(),
      updatedAt: surgery.updatedAt?.toISOString() ?? null,
    });
  } catch (err) {
    req.log.error(err);
    return res.status(500).json({ error: "Failed to get surgery" });
  }
});

router.patch("/surgeries/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const body = req.body;
    const updates: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(body)) {
      if (v !== undefined) {
        if (k === "procedureDetails" || k === "locations") {
          updates[k] = JSON.stringify(v);
        } else {
          updates[k] = v;
        }
      }
    }
    const [surgery] = await db.update(surgeriesTable).set(updates).where(eq(surgeriesTable.id, id)).returning();
    if (!surgery) return res.status(404).json({ error: "Surgery not found" });
    return res.json({
      ...surgery,
      procedureDetails: JSON.parse(surgery.procedureDetails as string),
      locations: JSON.parse(surgery.locations as string),
      createdAt: surgery.createdAt.toISOString(),
      updatedAt: surgery.updatedAt?.toISOString() ?? null,
    });
  } catch (err) {
    req.log.error(err);
    return res.status(500).json({ error: "Failed to update surgery" });
  }
});

export default router;
