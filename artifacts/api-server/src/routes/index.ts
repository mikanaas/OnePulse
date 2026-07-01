import { Router, type IRouter } from "express";
import healthRouter from "./health";
import usersRouter from "./users";
import projectsRouter from "./projects";
import tasksRouter from "./tasks";
import activityRouter from "./activity";
import effectsRouter from "./effects";
import linksRouter from "./links";
import portfolioRouter from "./portfolio";
import aiRouter from "./ai";
import reportsRouter from "./reports";
import auditRouter from "./audit";
import adminRouter from "./admin";
import governanceRouter from "./governance";
import proposalsRouter from "./proposals";
import dmaicRouter from "./dmaic";

const router: IRouter = Router();

router.use(healthRouter);
router.use(usersRouter);
router.use(projectsRouter);
router.use(tasksRouter);
router.use(activityRouter);
router.use(effectsRouter);
router.use(linksRouter);
router.use(portfolioRouter);
router.use(aiRouter);
router.use(reportsRouter);
router.use(auditRouter);
router.use(adminRouter);
router.use(governanceRouter);
router.use(proposalsRouter);
router.use(dmaicRouter);

export default router;
