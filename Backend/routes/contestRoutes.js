import { Router } from "express";
import {
    getContestBySlug,
    getContestCertificate,
    getContestQuestions,
    getContestResults,
    submitContest,
    validateCredentials
} from "../controller/contestController.js";


import { authMiddleware } from "../middleware/auth.js";

const router = Router();

// Public Routes
router.post("/validate-credentials", validateCredentials);

// Authenticated Participant Routes
router.use(authMiddleware);

router.get("/:slug/questions", getContestQuestions);
router.post("/:slug/submit", submitContest);
router.get("/:slug/results", getContestResults);
router.get("/:slug/certificate", getContestCertificate);
router.get("/:slug", getContestBySlug);

export default router;
