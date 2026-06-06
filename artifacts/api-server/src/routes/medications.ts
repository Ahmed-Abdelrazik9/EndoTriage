import { Router } from "express";
import { db } from "@workspace/db";
import { medicationsTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";

const router = Router();

function mapMed(m: typeof medicationsTable.$inferSelect) {
  return {
    ...m,
    approvedStages: JSON.parse(m.approvedStages ?? "[]"),
  };
}

router.get("/medications", async (req, res) => {
  try {
    const { category, stage, tier, formularyStatus } = req.query as Record<string, string | undefined>;
    let meds = await db.select().from(medicationsTable);
    if (category) meds = meds.filter((m) => m.category === category);
    if (tier) meds = meds.filter((m) => m.tier === tier);
    if (formularyStatus) meds = meds.filter((m) => m.formularyStatus === formularyStatus);
    if (stage) meds = meds.filter((m) => {
      const stages: string[] = JSON.parse(m.approvedStages ?? "[]");
      return stages.includes(stage);
    });
    return res.json(meds.map(mapMed));
  } catch (err) {
    req.log.error(err);
    return res.status(500).json({ error: "Failed to list medications" });
  }
});

router.get("/medications/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const [med] = await db.select().from(medicationsTable).where(eq(medicationsTable.id, id));
    if (!med) return res.status(404).json({ error: "Medication not found" });
    return res.json(mapMed(med));
  } catch (err) {
    req.log.error(err);
    return res.status(500).json({ error: "Failed to get medication" });
  }
});

export default router;
