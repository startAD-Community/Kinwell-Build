import { Router, type IRouter } from "express";
import healthRouter from "./health";
import togetherRouter from "./together";

const router: IRouter = Router();

router.use(healthRouter);
router.use(togetherRouter);

export default router;
