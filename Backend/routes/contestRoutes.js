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
import { authMiddleware } from './../middleware/auth.js';


const router = Router();

const validateLimiter = rateLimit({ windowMs: 10*60*1000, max: 5 });

// Public Routes
router.post("/validate-credentials", validateLimiter, validateCredentials);

// Authenticated Participant Routes
router.use(authMiddleware);

router.get("/:contestSlug/questions", getContestQuestions);
router.post("/:contestSlug/submit", submitContest);
router.get("/:contestSlug/results", getContestResults);
router.get("/:contestSlug/certificate", getContestCertificate);
router.get("/:contestSlug", getContestBySlug);

export default router;
