import { Router } from "express";
import {
  getBySlug,
  getCertificate,
  getLeaderboard,
  getQuestions,
  submit
} from "../controllers/contest.controller.js";
import { authMiddleware } from "../middleware/auth.js";

const router = Router();

router.get("/:slug/questions", authMiddleware, getQuestions);
router.post("/:slug/submit", authMiddleware, submit);
router.get("/:slug/leaderboard", getLeaderboard);
router.get("/:slug/certificate", authMiddleware, getCertificate);
router.get("/:slug", getBySlug);

export default router;