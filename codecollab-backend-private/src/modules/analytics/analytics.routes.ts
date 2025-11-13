import { Router } from "express";
import { AnalyticsController } from "./analytics.controller";
import { verifyToken } from "../../middlewares/auth.middleware";

const router = Router();

router.get("/overview", verifyToken, AnalyticsController.getOverview);

export default router;
