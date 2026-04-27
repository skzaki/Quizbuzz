import { Router } from "express";
import {
  getBySlug,
  getCertificate,
  getLeaderboard,
  submit
} from "../controllers/contest.controller.js";
import questionRoutes from "./question.routes.js";
import { authMiddleware } from "../middleware/auth.js";

const router = Router();

router.use(questionRoutes);
router.post("/:slug/submit", authMiddleware, submit);
router.get("/:slug/leaderboard", getLeaderboard);
router.get("/:slug/certificate", authMiddleware, getCertificate);
router.get("/:slug", getBySlug);

export default router;