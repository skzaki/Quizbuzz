import express from 'express';
import { Question } from '../../Models/DB.js';
import { adminMiddleware } from '../../middleware/admin.js';
import { authMiddleware } from '../../middleware/auth.js';

const router = express.Router();
router.use(authMiddleware);
router.use(adminMiddleware);

// GET all questions
router.get('/', async (req, res) => {
  try {
    const { page = 1, limit = 10, search, difficulty, topic } = req.query;
    let query = { isDeleted: false };
    if (search) query.questionText = { $regex: search, $options: 'i' };
    if (difficulty && difficulty !== 'all') query.difficulty = difficulty;
    if (topic && topic !== 'all') query.hint = { $regex: topic, $options: 'i' };

    const total = await Question.countDocuments(query);
    const questions = await Question.find(query)
      .skip((parseInt(page) - 1) * parseInt(limit))
      .limit(parseInt(limit))
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      data: {
        questions,
        pagination: {
          totalItems: total,
          totalPages: Math.ceil(total / parseInt(limit)),
          currentPage: parseInt(page),
        }
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// POST create question
router.post('/', async (req, res) => {
  try {
    const { questionText, options, correctOptionIndex, correctOptionText, difficulty, hint, explanation } = req.body;
    const question = await Question.create({
      questionText, options, correctOptionIndex, correctOptionText, difficulty, hint, explanation
    });
    res.status(201).json({ success: true, data: question });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// PUT update question
router.put('/:id', async (req, res) => {
  try {
    const question = await Question.findByIdAndUpdate(req.params.id, req.body, { new: true });
    res.json({ success: true, data: question });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// DELETE question
router.delete('/:id', async (req, res) => {
  try {
    await Question.findByIdAndUpdate(req.params.id, { isDeleted: true });
    res.json({ success: true, message: 'Question deleted' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

export default router;

// POST add existing questions to a contest
router.post('/assign-to-contest', async (req, res) => {
  try {
    const { contestId, questionIds } = req.body;
    if (!contestId || !questionIds?.length) {
      return res.status(400).json({ success: false, message: 'contestId and questionIds required' });
    }

    const { Contest } = await import('../../Models/DB.js');

    const contest = await Contest.findByIdAndUpdate(
      contestId,
      { $addToSet: { QuestionBank: { $each: questionIds } } },
      { new: true }
    );

    if (!contest) return res.status(404).json({ success: false, message: 'Contest not found' });

    res.json({ success: true, message: `${questionIds.length} questions assigned`, data: { totalQuestions: contest.QuestionBank.length } });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});
