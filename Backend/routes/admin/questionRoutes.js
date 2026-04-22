import express from 'express';
import { adminMiddleware } from '../../middleware/admin.js';
import { authMiddleware } from '../../middleware/auth.js';
import {
    assignQuestionsToContest,
    createQuestion,
    deleteQuestion,
    getAllQuestions,
    getQuestionStats,
    updateQuestion
} from '../../controller/admin/questionController.js';

const router = express.Router();

router.use(authMiddleware);
router.use(adminMiddleware);

// GET all questions
router.get('/', getAllQuestions);

// GET aggregate question stats
router.get('/stats', getQuestionStats);

// POST assign existing questions to a contest
router.post('/assign-to-contest', assignQuestionsToContest);

// POST create question
router.post('/', createQuestion);

// PUT update question
router.put('/:id', updateQuestion);

// DELETE question
router.delete('/:id', deleteQuestion);

export default router;