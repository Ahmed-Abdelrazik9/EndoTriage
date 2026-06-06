import { Router } from "express";
import { db } from "@workspace/db";
import { investigationsTable, activityLogTable } from "@workspace/db";
import { eq } from "drizzle-orm";

const router = Router();

router.get("/patients/:id/investigations", async (req, res) => {
  try {
    const patientId = parseInt(req.params.id);
    const [inv] = await db.select().from(investigationsTable).where(eq(investigationsTable.patientId, patientId));
    if (!inv) {
      return res.json({ patientId, tvusRequested: false, mriRequested: false, laparoscopyRequested: false, ca125Requested: false, fbcRequested: false });
    }
    return res.json({
      ...inv,
      createdAt: inv.createdAt.toISOString(),
      updatedAt: inv.updatedAt?.toISOString() ?? null,
    });
  } catch (err) {
    req.log.error(err);
    return res.status(500).json({ error: "Failed to get investigations" });
  }
});

router.put("/patients/:id/investigations", async (req, res) => {
  try {
    const patientId = parseInt(req.params.id);
    const body = req.body;

    const existing = await db.select().from(investigationsTable).where(eq(investigationsTable.patientId, patientId));
    let inv;
    if (existing.length === 0) {
      [inv] = await db.insert(investigationsTable).values({ patientId, ...body }).returning();
    } else {
      const { id: _id, patientId: _pid, createdAt: _ca, updatedAt: _ua, ...rest } = existing[0];
      const updates: Record<string, any> = { ...rest };
      for (const [k, v] of Object.entries(body)) {
        if (v !== undefined) updates[k] = v;
      }
      [inv] = await db.update(investigationsTable).set(updates).where(eq(investigationsTable.patientId, patientId)).returning();
    }

    // Log activity
    const completedInvestigations = [];
    if (body.tvusCompleted) completedInvestigations.push("TVUS");
    if (body.mriCompleted) completedInvestigations.push("MRI");
    if (body.laparoscopyCompleted) completedInvestigations.push("Laparoscopy");
    if (body.ca125Completed) completedInvestigations.push("CA-125");
    if (body.fbcCompleted) completedInvestigations.push("FBC");

    if (completedInvestigations.length > 0) {
      await db.insert(activityLogTable).values({
        type: "investigation-completed",
        description: `Investigations updated: ${completedInvestigations.join(", ")} completed`,
        patientId,
      });
    }

    return res.json({
      ...inv,
      createdAt: inv.createdAt.toISOString(),
      updatedAt: inv.updatedAt?.toISOString() ?? null,
    });
  } catch (err) {
    req.log.error(err);
    return res.status(500).json({ error: "Failed to update investigations" });
  }
});

export default router;
