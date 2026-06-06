import { Router } from "express";
import { db } from "@workspace/db";
import { patientsTable, managementPlansTable, assessmentsTable, activityLogTable } from "@workspace/db";
import { eq, count, avg, gte, sql } from "drizzle-orm";

const router = Router();

router.get("/dashboard/summary", async (req, res) => {
  try {
    const patients = await db.select().from(patientsTable);
    const totalPatients = patients.length;
    const urgentTriage = patients.filter((p) => p.triageLevel === "urgent").length;
    const highTriage = patients.filter((p) => p.triageLevel === "high").length;
    const moderateTriage = patients.filter((p) => p.triageLevel === "moderate").length;
    const routineTriage = patients.filter((p) => p.triageLevel === "routine").length;
    const stageICount = patients.filter((p) => p.currentStage === "Stage I").length;
    const stageIICount = patients.filter((p) => p.currentStage === "Stage II").length;
    const stageIIICount = patients.filter((p) => p.currentStage === "Stage III").length;
    const stageIVCount = patients.filter((p) => p.currentStage === "Stage IV").length;

    const plans = await db.select().from(managementPlansTable);
    const activeManagementPlans = plans.filter((p) => p.status === "active").length;

    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
    const allAssessments = await db.select().from(assessmentsTable);
    const assessmentsThisMonth = allAssessments.filter((a) => a.createdAt >= new Date(monthStart)).length;
    const avgTriageScore = allAssessments.length > 0
      ? Math.round(allAssessments.reduce((s, a) => s + a.triageScore, 0) / allAssessments.length * 10) / 10
      : 0;

    const allPlans = await db.select().from(managementPlansTable);
    const onWaitingList = allPlans.filter((p) => p.status === "active" && (p.bsgeReferral || p.approach === "surgical")).length;
    const bsgeReferrals = allPlans.filter((p) => p.bsgeReferral).length;
    const fertilityReferrals = allPlans.filter((p) => p.fertilityClinicReferral).length;
    const painClinicReferrals = allPlans.filter((p) => p.painClinicReferral).length;
    const postOpReviewsDue = allPlans.filter((p) => {
      if (!p.nextReviewDate) return false;
      const reviewDate = new Date(p.nextReviewDate);
      return reviewDate <= now && p.status === "active";
    }).length;

    res.json({
      totalPatients, urgentTriage, highTriage, moderateTriage, routineTriage,
      activeManagementPlans, assessmentsThisMonth,
      stageICount, stageIICount, stageIIICount, stageIVCount,
      avgTriageScore,
      onWaitingList, bsgeReferrals, fertilityReferrals, painClinicReferrals, postOpReviewsDue,
    });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Failed to get dashboard summary" });
  }
});

router.get("/dashboard/recent-activity", async (req, res) => {
  try {
    const activities = await db
      .select()
      .from(activityLogTable)
      .orderBy(sql`${activityLogTable.createdAt} DESC`)
      .limit(20);
    res.json(activities.map((a) => ({
      ...a,
      timestamp: a.createdAt.toISOString(),
    })));
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Failed to get recent activity" });
  }
});

router.get("/dashboard/triage-breakdown", async (req, res) => {
  try {
    const patients = await db.select().from(patientsTable);
    const plans = await db.select().from(managementPlansTable);

    const levelMap: Record<string, number> = { urgent: 0, high: 0, moderate: 0, routine: 0 };
    const stageMap: Record<string, number> = { "Stage I": 0, "Stage II": 0, "Stage III": 0, "Stage IV": 0, "Unclassified": 0 };
    const approachMap: Record<string, number> = { medical: 0, surgical: 0, combined: 0, "watchful-waiting": 0 };

    for (const p of patients) {
      if (p.triageLevel && levelMap[p.triageLevel] !== undefined) levelMap[p.triageLevel]++;
      const stage = p.currentStage ?? "Unclassified";
      if (stageMap[stage] !== undefined) stageMap[stage]++;
      else stageMap["Unclassified"]++;
    }
    for (const plan of plans) {
      const approach = plan.approach ?? "";
      if (approachMap[approach] !== undefined) approachMap[approach]++;
    }

    res.json({
      byLevel: Object.entries(levelMap).map(([label, count]) => ({ label, count })),
      byStage: Object.entries(stageMap).filter(([, c]) => c > 0).map(([label, count]) => ({ label, count })),
      byApproach: Object.entries(approachMap).filter(([, c]) => c > 0).map(([label, count]) => ({ label, count })),
    });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Failed to get triage breakdown" });
  }
});

router.get("/dashboard/pathway-breakdown", async (req, res) => {
  try {
    const patients = await db.select().from(patientsTable);
    const plans = await db.select().from(managementPlansTable);

    const pathwayMap: Record<string, number> = { medical: 0, surgery_general: 0, surgery_specialist: 0, combined: 0, watchful_waiting: 0, unassigned: 0 };
    const stateMap: Record<string, number> = {};
    const waitingListMap: Record<string, number> = { general: 0, specialist: 0, not_on_list: 0 };

    for (const p of patients) {
      const pathway = p.currentPathway ?? "unassigned";
      if (pathwayMap[pathway] !== undefined) pathwayMap[pathway]++;
      else pathwayMap["unassigned"]++;
      const state = p.carePathwayState ?? "unknown";
      stateMap[state] = (stateMap[state] ?? 0) + 1;
    }
    for (const plan of plans) {
      if (plan.status === "active" && plan.bsgeReferral) {
        waitingListMap["specialist"]++;
      } else if (plan.status === "active" && plan.approach === "surgical") {
        waitingListMap["general"]++;
      }
    }

    res.json({
      byPathway: Object.entries(pathwayMap).filter(([, c]) => c > 0).map(([label, count]) => ({ label, count })),
      byState: Object.entries(stateMap).map(([label, count]) => ({ label, count })),
      byWaitingList: Object.entries(waitingListMap).filter(([, c]) => c > 0).map(([label, count]) => ({ label, count })),
    });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Failed to get pathway breakdown" });
  }
});

export default router;
