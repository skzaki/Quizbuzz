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
import * as contestService from "../services/contest.service.js";
import { authMiddleware } from './../middleware/auth.js';

const router = Router();

// ─── Public Routes (no auth required) ────────────────────────────────────────

// Landing page: get the nearest active or upcoming contest
router.get('/active', async (req, res) => {
    try {
        const contest = await contestService.getActiveContest();
        res.json(contest);
    } catch (err) {
        return res.status(err?.statusCode || 500).json({ message: err.message });
    }
});

// Validate participant credentials + return JWT (no prior auth needed)
router.post("/validate-credentials", validateCredentials);

// Leaderboard is public so participants can check rankings without logging in
router.get('/:contestId/leaderboard', getContestLeaderboard);

// ─── Authenticated Participant Routes (require JWT) ───────────────────────────
// Bug Fix (M4): getContestQuestions was previously placed BEFORE authMiddleware,
// making questions publicly accessible without login. All routes below require auth.
router.use(authMiddleware);

router.get("/:contestSlug/questions", getContestQuestions);
router.post("/:contestSlug/submit", submitContest);
router.get("/:submissionId/status", getSubmissionStatus);
router.get("/:submissionId/results", getSubmissionResult);
router.get("/:contestSlug/certificate", getContestCertificate);

// Must be last to avoid shadowing other named routes
router.get("/:contestSlug", getContestBySlug);

export default router;