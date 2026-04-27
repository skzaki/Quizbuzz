import { Router } from "express";
import { getForContest } from "../controllers/question.controller.js";
import { authMiddleware } from "../middleware/auth.js";

const router = Router();

router.get("/:slug/questions", authMiddleware, getForContest);

export default router;