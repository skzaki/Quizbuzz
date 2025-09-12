import { Router } from "express";
import {
    getContestBySlug,
    getContestCertificate,
    getContestLeaderboard,
    getContestQuestions,
    getSubmissionResult,
    getSubmissionStatus,
    submitContest,
    validateCredentials
} from "../controller/contestController.js";

import { authMiddleware } from './../middleware/auth.js';



const router = Router();

// const validateLimiter = rateLimit({ windowMs: 5*60*1000, max: 20 });

// Public Routes
router.post("/validate-credentials", validateCredentials);

router.get('/:contestId/leaderboard', getContestLeaderboard);
// Authenticated Participant Routes
router.get("/:contestSlug/questions", getContestQuestions);
router.use(authMiddleware);

router.post("/:contestSlug/submit", submitContest);

router.get("/:submissionId/status", getSubmissionStatus);
router.get("/:submissionId/results", getSubmissionResult);
router.get("/:contestSlug/certificate", getContestCertificate);
router.get("/:contestSlug", getContestBySlug);

export default router;
