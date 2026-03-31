// routes/admin/contestRoutes.js
import express from 'express';
import {
    addQuestionsToContest,
    bulkDeleteContests,
    bulkUpdateStatus,
    createContest,
    deleteContest,
    getAllContests,
    getContestById,
    getContestStatistics,
    updateContest,
    updateContestStatus
} from '../../controller/admin/contestController.js';
import {
    exportContestParticipants,
    getContestParticipants,
    issueCertificates
} from '../../controller/admin/contestParticipantsController.js';
import { adminMiddleware } from '../../middleware/admin.js';
import { authMiddleware } from '../../middleware/auth.js';

const router = express.Router();

// Apply authentication + admin middleware to all routes
router.use(authMiddleware);
router.use(adminMiddleware);

// ─── BULK operations MUST come BEFORE /:id routes ──────────────────────────
// Bug Fix: Express matches /:id first if bulk routes are defined after it.
router.patch('/bulk-status', bulkUpdateStatus);
router.delete('/bulk-delete', bulkDeleteContests);

// ─── Collection-level routes ────────────────────────────────────────────────
router.get('/', getAllContests);
router.post('/', createContest);

// ─── Resource-level routes (:id parameterized) ──────────────────────────────
router.get('/:id', getContestById);
router.put('/:id', updateContest);
router.delete('/:id', deleteContest);
router.patch('/:id/status', updateContestStatus);
router.get('/:id/statistics', getContestStatistics);

// Questions assignment to a contest
router.post('/:id/questions', (req, res) => {
    // Extract contestId from params and add to body for the existing function
    req.body.contestId = req.params.id;
    return addQuestionsToContest(req, res);
});

// ─── Participants sub-routes ─────────────────────────────────────────────────
// Bug Fix (Bug 7): These routes were defined in the controller but never wired
router.get('/:id/participants', getContestParticipants);
router.get('/:id/participants/export', exportContestParticipants);
router.post('/:id/certificates/issue', issueCertificates);

export default router;