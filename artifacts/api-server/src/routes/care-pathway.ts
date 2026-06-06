import { Router } from "express";
import { db } from "@workspace/db";
import { carePathwayEventsTable, carePathwayStatesTable, activityLogTable, patientsTable } from "@workspace/db";
import { eq, desc } from "drizzle-orm";

const router = Router();

router.get("/patients/:id/care-pathway", async (req, res) => {
  try {
    const patientId = parseInt(req.params.id);
    const [state] = await db.select().from(carePathwayStatesTable).where(eq(carePathwayStatesTable.patientId, patientId));
    const events = await db
      .select()
      .from(carePathwayEventsTable)
      .where(eq(carePathwayEventsTable.patientId, patientId))
      .orderBy(desc(carePathwayEventsTable.createdAt));

    res.json({
      state: state ? {
        ...state,
        updatedAt: state.updatedAt?.toISOString() ?? null,
      } : null,
      events: events.map((e) => ({
        ...e,
        mdtSpecialties: JSON.parse(e.mdtSpecialties as string),
        createdAt: e.createdAt.toISOString(),
      })),
    });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Failed to get care pathway" });
  }
});

router.post("/patients/:id/care-pathway", async (req, res) => {
  try {
    const patientId = parseInt(req.params.id);
    const body = req.body;

    const [event] = await db.insert(carePathwayEventsTable).values({
      patientId,
      state: body.state,
      previousState: body.previousState,
      eventDate: body.eventDate,
      clinician: body.clinician,
      notes: body.notes,
      pathwayAssigned: body.pathwayAssigned,
      pathwayRationale: body.pathwayRationale,
      surgeryId: body.surgeryId,
      medicationName: body.medicationName,
      medicationTier: body.medicationTier,
      waitingListType: body.waitingListType,
      targetWaitWeeks: body.targetWaitWeeks,
      mdtSpecialties: JSON.stringify(body.mdtSpecialties ?? []),
      mdtDecision: body.mdtDecision,
      followUpType: body.followUpType,
      followUpDate: body.followUpDate,
      dischargeReason: body.dischargeReason,
      dischargePlan: body.dischargePlan,
    }).returning();

    // Update patient state
    const [patient] = await db.select().from(patientsTable).where(eq(patientsTable.id, patientId));
    const pathwayUpdates: Record<string, unknown> = { carePathwayState: body.state };
    if (body.pathwayAssigned) pathwayUpdates.currentPathway = body.pathwayAssigned;
    if (body.state === "referral_received") pathwayUpdates.referralDate = body.eventDate;
    if (body.state === "clinic_review") pathwayUpdates.clinicReviewDate = body.eventDate;
    if (body.state === "triage_decision") pathwayUpdates.triageDecisionDate = body.eventDate;
    if (body.state === "medication_started") pathwayUpdates.medicationStartDate = body.eventDate;
    if (body.state === "waiting_list_added") pathwayUpdates.waitingListDate = body.eventDate;
    if (body.state === "surgery_completed") pathwayUpdates.surgeryDate = body.eventDate;
    if (body.state === "post_op_review") pathwayUpdates.postOpReviewDate = body.eventDate;
    if (body.state === "follow_up_ongoing") pathwayUpdates.lastFollowUpDate = body.eventDate;
    if (body.state === "discharged") pathwayUpdates.dischargeDate = body.eventDate;

    await db.update(patientsTable).set(pathwayUpdates).where(eq(patientsTable.id, patientId));

    // Update or create care pathway state record
    const [existingState] = await db.select().from(carePathwayStatesTable).where(eq(carePathwayStatesTable.patientId, patientId));
    if (existingState) {
      await db.update(carePathwayStatesTable).set({
        currentState: body.state,
        currentPathway: body.pathwayAssigned ?? existingState.currentPathway,
        ...pathwayUpdates,
      }).where(eq(carePathwayStatesTable.patientId, patientId));
    } else {
      await db.insert(carePathwayStatesTable).values({
        patientId,
        currentState: body.state,
        currentPathway: body.pathwayAssigned,
        referralDate: body.eventDate,
      });
    }

    // Log activity
    await db.insert(activityLogTable).values({
      type: "pathway-changed",
      description: `Care pathway: ${body.state}${body.pathwayAssigned ? ` → ${body.pathwayAssigned}` : ""}${body.notes ? ` — ${body.notes}` : ""}`,
      patientId,
      patientName: patient ? `${patient.firstName} ${patient.lastName}` : undefined,
    });

    res.status(201).json({
      ...event,
      mdtSpecialties: JSON.parse(event.mdtSpecialties as string),
      createdAt: event.createdAt.toISOString(),
    });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Failed to add care pathway event" });
  }
});

export default router;
