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
import { Contest } from "../Models/DB.js";
import { authMiddleware } from './../middleware/auth.js';

const router = Router();

// Public Routes
router.get('/active', async (req, res) => {
    try {
        const now = new Date();
        const contest = await Contest.findOne({
            isDeleted: false,
            $or: [
                { startTime: { $gt: now } },
                { startTime: { $lte: now }, deadline: { $gt: now } }
            ]
        })
            .select('title slug description duration registerFee startTime deadline topics prizes QuestionBank')
            .sort({ startTime: 1 })
            .lean();

        if (!contest) {
            return res.status(404).json({ message: 'No active contest found' });
        }

        res.json({
            ...contest,
            totalQuestions: contest.QuestionBank?.length || 0
        });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

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