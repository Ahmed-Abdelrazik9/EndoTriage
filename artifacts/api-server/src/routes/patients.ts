import { Router } from "express";
import { db } from "@workspace/db";
import { patientsTable, activityLogTable } from "@workspace/db";
import { eq, ilike, and, type SQL } from "drizzle-orm";
import { logger } from "../lib/logger";

const router = Router();

router.get("/patients", async (req, res) => {
  try {
    const { search, stage, triageLevel } = req.query as Record<string, string | undefined>;
    const conditions: SQL[] = [];
    if (stage) conditions.push(eq(patientsTable.currentStage, stage));
    if (triageLevel) conditions.push(eq(patientsTable.triageLevel, triageLevel));
    if (search) {
      const { or } = await import("drizzle-orm");
      const s = `%${search}%`;
      conditions.push(or(ilike(patientsTable.firstName, s), ilike(patientsTable.lastName, s), ilike(patientsTable.email, s))!);
    }

    const patients = await db
      .select()
      .from(patientsTable)
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(patientsTable.createdAt);

    const mapped = patients.map((p) => ({
      ...p,
      createdAt: p.createdAt.toISOString(),
      updatedAt: p.updatedAt?.toISOString() ?? null,
    }));
    res.json(mapped);
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Failed to list patients" });
  }
});

router.post("/patients", async (req, res) => {
  try {
    const { firstName, lastName, dateOfBirth, email, phone, notes } = req.body;
    if (!firstName || !lastName || !dateOfBirth) {
      return res.status(400).json({ error: "firstName, lastName, and dateOfBirth are required" });
    }
    const [patient] = await db.insert(patientsTable).values({ firstName, lastName, dateOfBirth, email, phone, notes }).returning();
    await db.insert(activityLogTable).values({
      type: "patient-added",
      description: `New patient registered: ${firstName} ${lastName}`,
      patientId: patient.id,
      patientName: `${firstName} ${lastName}`,
    });
    res.status(201).json({ ...patient, createdAt: patient.createdAt.toISOString(), updatedAt: null });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Failed to create patient" });
  }
});

router.get("/patients/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const [patient] = await db.select().from(patientsTable).where(eq(patientsTable.id, id));
    if (!patient) return res.status(404).json({ error: "Patient not found" });
    res.json({ ...patient, createdAt: patient.createdAt.toISOString(), updatedAt: patient.updatedAt?.toISOString() ?? null });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Failed to get patient" });
  }
});

router.patch("/patients/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const { firstName, lastName, dateOfBirth, email, phone, currentStage, triageLevel, notes } = req.body;
    const updates: Record<string, unknown> = {};
    if (firstName !== undefined) updates.firstName = firstName;
    if (lastName !== undefined) updates.lastName = lastName;
    if (dateOfBirth !== undefined) updates.dateOfBirth = dateOfBirth;
    if (email !== undefined) updates.email = email;
    if (phone !== undefined) updates.phone = phone;
    if (currentStage !== undefined) updates.currentStage = currentStage;
    if (triageLevel !== undefined) updates.triageLevel = triageLevel;
    if (notes !== undefined) updates.notes = notes;
    const [patient] = await db.update(patientsTable).set(updates).where(eq(patientsTable.id, id)).returning();
    if (!patient) return res.status(404).json({ error: "Patient not found" });
    res.json({ ...patient, createdAt: patient.createdAt.toISOString(), updatedAt: patient.updatedAt?.toISOString() ?? null });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Failed to update patient" });
  }
});

router.delete("/patients/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    await db.delete(patientsTable).where(eq(patientsTable.id, id));
    res.status(204).send();
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Failed to delete patient" });
  }
});

export default router;
