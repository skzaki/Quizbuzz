import { Router } from "express";
import {
    getContestBySlug,
    getContestCertificate,
    getContestQuestions,
    getContestResults,
    submitContest,
    validateCredentials
} from "../controller/contestController.js";

import rateLimit from 'express-rate-limit';

import { authMiddleware } from "../middleware/auth.js";

const router = Router();

const validateLimiter = rateLimit({ windowMs: 10*60*1000, max: 5 });

// Public Routes
router.post("/validate-credentials", validateLimiter, validateCredentials);

// Authenticated Participant Routes
router.use(authMiddleware);

router.get("/:slug/questions", getContestQuestions);
router.post("/:slug/submit", submitContest);
router.get("/:slug/results", getContestResults);
router.get("/:slug/certificate", getContestCertificate);
router.get("/:slug", getContestBySlug);

export default router;
