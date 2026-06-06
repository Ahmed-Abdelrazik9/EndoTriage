import { Router, type IRouter } from "express";
import healthRouter from "./health";
import patientsRouter from "./patients";
import assessmentsRouter from "./assessments";
import investigationsRouter from "./investigations";
import carePathwayRouter from "./care-pathway";
import surgeriesRouter from "./surgeries";
import managementPlansRouter from "./management-plans";
import medicationsRouter from "./medications";
import dashboardRouter from "./dashboard";

const router: IRouter = Router();

router.use(healthRouter);
router.use(patientsRouter);
router.use(assessmentsRouter);
router.use(investigationsRouter);
router.use(carePathwayRouter);
router.use(surgeriesRouter);
router.use(managementPlansRouter);
router.use(medicationsRouter);
router.use(dashboardRouter);

export default router;
