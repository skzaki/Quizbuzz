// routes/admin/contestRoutes.js
import { Router } from "express";
import {
    addQuestionsToContest,
    allContests,
    createContest,
    deleteContestDetails,
    getContestDetails,
    updateContestDetails
} from "../../controller/admin/contestController.js";


const router = Router();

// All admin routes require both authentication & admin privileges
// router.use(authMiddleware, adminMiddleware);

// Create new contest
router.post("/", createContest);

// Get all contests (optionally include deleted)
router.get("/", allContests);

// Get single contest details
router.get("/:contestId", getContestDetails);

// Add questions
router.post("/:contestId/questions", addQuestionsToContest);

// Update contest details
router.patch("/:contestId", updateContestDetails);

// Delete (soft delete) contest
router.delete("/:contestId", deleteContestDetails);

export default router;
