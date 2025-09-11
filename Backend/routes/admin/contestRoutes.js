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

const router = express.Router();

// Apply authentication middleware to all routes
router.use(authMiddleware);
router.use(adminMiddleware);

// Rate limiting for different endpoint types
// const standardRateLimit = rateLimitMiddleware({ windowMs: 60 * 1000, max: 100 }); // 100 req/min
// const bulkOperationsLimit = rateLimitMiddleware({ windowMs: 60 * 1000, max: 10 }); // 10 req/min

router.get('/',  getAllContests);
router.post('/',  createContest);
router.get('/:id',  getContestById);
router.put('/:id',  updateContest);
router.delete('/:id',  deleteContest);
router.patch('/:id/status',  updateContestStatus);
router.get('/:id/statistics',  getContestStatistics);
router.post('/:id/questions',  (req, res) => {
    // Extract contestId from params and add to body for the existing function
    req.body.contestId = req.params.id;
    return addQuestionsToContest(req, res);
});
router.patch('/bulk-status',  bulkUpdateStatus);
router.delete('/bulk-delete',  bulkDeleteContests);

export default router;