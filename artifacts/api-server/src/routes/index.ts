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

export default router;
