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
import { adminMiddleware } from '../../middleware/admin.js';
import { authMiddleware } from '../../middleware/auth.js';
import { rateLimitMiddleware } from '../../middleware/rateLimit.js';

const router = express.Router();

// Apply authentication middleware to all routes
router.use(authMiddleware);
router.use(adminMiddleware);

// Rate limiting for different endpoint types
const standardRateLimit = rateLimitMiddleware({ windowMs: 60 * 1000, max: 100 }); // 100 req/min
const bulkOperationsLimit = rateLimitMiddleware({ windowMs: 60 * 1000, max: 10 }); // 10 req/min

router.get('/', standardRateLimit, getAllContests);
router.post('/', standardRateLimit, createContest);
router.get('/:id', standardRateLimit, getContestById);
router.put('/:id', standardRateLimit, updateContest);
router.delete('/:id', standardRateLimit, deleteContest);
router.patch('/:id/status', standardRateLimit, updateContestStatus);
router.get('/:id/statistics', standardRateLimit, getContestStatistics);
router.post('/:id/questions', standardRateLimit, (req, res) => {
    // Extract contestId from params and add to body for the existing function
    req.body.contestId = req.params.id;
    return addQuestionsToContest(req, res);
});
router.patch('/bulk-status', bulkOperationsLimit, bulkUpdateStatus);
router.delete('/bulk-delete', bulkOperationsLimit, bulkDeleteContests);

export default router;