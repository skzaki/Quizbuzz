// controller/admin/questionController.js
import { Contest, Question } from "../../Models/DB.js";
import redisClient from '../../redis.js';
import { canonicalizeSingleDomain, getActiveDomainKeyMap } from '../../utils/domainMaster.js';

/**
 * @desc    Get all questions (with filtering and pagination)
 * @route   GET /api/admin/questions
 * @access  Admin
 */
export const getAllQuestions = async (req, res) => {
    try {
        const { page = 1, limit = 10, search, difficulty, topic, domain } = req.query;
        let query = { isDeleted: false };
        
        if (domain && domain !== 'all') {
            const activeDomainKeyMap = await getActiveDomainKeyMap();
            const canonicalDomain = canonicalizeSingleDomain(domain, activeDomainKeyMap);

            if (!canonicalDomain) {
                return res.status(400).json({
                    success: false,
                    error: {
                        code: 'VALIDATION_ERROR',
                        message: 'Invalid domain filter'
                    }
                });
            }

            query.domain = canonicalDomain;
        }
        
        if (search) {
            query.questionText = { $regex: search, $options: 'i' };
        }
        
        if (difficulty && difficulty !== 'all') {
            query.difficulty = difficulty;
        }
        
        if (topic && topic !== 'all') {
            query.hint = { $regex: topic, $options: 'i' };
        }

        const limitNum = parseInt(limit);
        const pageNum = parseInt(page);
        const skip = (pageNum - 1) * limitNum;

        const [questions, total] = await Promise.all([
            Question.find(query)
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(limitNum)
                .lean(),
            Question.countDocuments(query)
        ]);

        res.json({
            success: true,
            data: {
                questions,
                pagination: {
                    totalItems: total,
                    totalPages: Math.ceil(total / limitNum),
                    currentPage: pageNum,
                    limit: limitNum
                }
            }
        });
    } catch (err) {
        console.error('Get all questions error:', err);
        res.status(500).json({ 
            success: false, 
            error: {
                code: 'INTERNAL_SERVER_ERROR',
                message: err.message 
            }
        });
    }
};

/**
 * @desc    Create a new question
 * @route   POST /api/admin/questions
 * @access  Admin
 */
export const createQuestion = async (req, res) => {
    try {
        const { 
            questionText, 
            options, 
            correctOptionIndex, 
            correctOptionText, 
            domain,
            difficulty, 
            hint, 
            explanation 
        } = req.body;

        const activeDomainKeyMap = await getActiveDomainKeyMap();
        const canonicalDomain = canonicalizeSingleDomain(domain, activeDomainKeyMap);

        if (!canonicalDomain) {
            return res.status(400).json({
                success: false,
                error: {
                    code: 'VALIDATION_ERROR',
                    message: 'Invalid domain selected'
                }
            });
        }

        const question = await Question.create({
            questionText, 
            options, 
            correctOptionIndex, 
            correctOptionText, 
            domain: canonicalDomain,
            difficulty, 
            hint, 
            explanation
        });

        res.status(201).json({ 
            success: true, 
            data: question,
            message: "Question created successfully" 
        });
    } catch (err) {
        console.error('Create question error:', err);
        res.status(500).json({ 
            success: false, 
            error: {
                code: 'INTERNAL_SERVER_ERROR',
                message: err.message 
            }
        });
    }
};

/**
 * @desc    Update a question
 * @route   PUT /api/admin/questions/:id
 * @access  Admin
 */
export const updateQuestion = async (req, res) => {
    try {
        const { id } = req.params;

        const updatePayload = { ...req.body };

        if (updatePayload.domain !== undefined) {
            const activeDomainKeyMap = await getActiveDomainKeyMap();
            const canonicalDomain = canonicalizeSingleDomain(updatePayload.domain, activeDomainKeyMap);

            if (!canonicalDomain) {
                return res.status(400).json({
                    success: false,
                    error: {
                        code: 'VALIDATION_ERROR',
                        message: 'Invalid domain selected'
                    }
                });
            }

            updatePayload.domain = canonicalDomain;
        }

        const question = await Question.findByIdAndUpdate(
            id, 
            { $set: updatePayload }, 
            { new: true, runValidators: true }
        );

        if (!question) {
            return res.status(404).json({
                success: false,
                error: {
                    code: "NOT_FOUND",
                    message: "Question not found"
                }
            });
        }

        res.json({ 
            success: true, 
            data: question,
            message: "Question updated successfully" 
        });
    } catch (err) {
        console.error('Update question error:', err);
        res.status(500).json({ 
            success: false, 
            error: {
                code: 'INTERNAL_SERVER_ERROR',
                message: err.message 
            }
        });
    }
};

/**
 * @desc    Delete a question (soft delete)
 * @route   DELETE /api/admin/questions/:id
 * @access  Admin
 */
export const deleteQuestion = async (req, res) => {
    try {
        const { id } = req.params;
        const question = await Question.findByIdAndUpdate(
            id, 
            { $set: { isDeleted: true } },
            { new: true }
        );

        if (!question) {
            return res.status(404).json({
                success: false,
                error: {
                    code: "NOT_FOUND",
                    message: "Question not found"
                }
            });
        }

        res.json({ 
            success: true, 
            message: 'Question deleted successfully' 
        });
    } catch (err) {
        console.error('Delete question error:', err);
        res.status(500).json({ 
            success: false, 
            error: {
                code: 'INTERNAL_SERVER_ERROR',
                message: err.message 
            }
        });
    }
};

/**
 * @desc    Assign existing questions to a contest
 * @route   POST /api/admin/questions/assign-to-contest
 * @access  Admin
 */
export const assignQuestionsToContest = async (req, res) => {
    try {
        const { contestId, questionIds } = req.body;
        
        if (!contestId || !questionIds?.length) {
            return res.status(400).json({ 
                success: false, 
                error: {
                    code: "VALIDATION_ERROR",
                    message: 'contestId and questionIds are required' 
                }
            });
        }

        const contest = await Contest.findByIdAndUpdate(
            contestId,
            { $addToSet: { QuestionBank: { $each: questionIds } } },
            { new: true }
        );

        if (!contest) {
            return res.status(404).json({ 
                success: false, 
                error: {
                    code: "NOT_FOUND",
                    message: "Contest not found" 
                }
            });
        }

        // Invalidate Redis cache for this contest
        try {
            await redisClient.del(`contest:${contestId}`);
        } catch (e) {
            console.warn('Cache invalidation failed:', e.message);
        }

        res.json({
            success: true,
            message: `${questionIds.length} questions assigned to contest successfully`,
            data: { 
                totalQuestions: contest.QuestionBank.length 
            }
        });
    } catch (err) {
        console.error('Assign questions error:', err);
        res.status(500).json({ 
            success: false, 
            error: {
                code: 'INTERNAL_SERVER_ERROR',
                message: err.message 
            }
        });
    }
};
