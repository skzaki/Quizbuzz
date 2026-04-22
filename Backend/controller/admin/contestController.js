// controller/admin/contestController.js
import { Contest, Question, Submission, User } from "../../Models/DB.js";
import { bulkStatusUpdateSchema, contestSchema, questionsSchema, updateContestSchema } from "../../Models/zodSchema.js";
import redisClient from '../../redis.js';
import {
    canonicalizeSingleDomain,
    canonicalizeDomainDistributionList,
    canonicalizeDomainList,
    getActiveDomainKeyMap
} from '../../utils/domainMaster.js';
import {
    isDistributionMatchingDomains,
    isValidDifficultyDistribution,
    MAX_DOMAIN_PERCENTAGE,
    MIN_DOMAIN_PERCENTAGE,
    normalizeDomainDistribution,
    TOTAL_PERCENTAGE
} from '../../utils/domainDistribution.js';

// Redis key helpers
const getContestCacheKey = (contestId) => `contest:${contestId}`;
const getContestsCacheKey = (queryParams) => `contests:${JSON.stringify(queryParams)}`;
const getContestStatsCacheKey = (contestId) => `contest:stats:${contestId}`;

// Cache TTL (Time To Live) in seconds
const CACHE_TTL = {
    CONTEST: 300, // 5 minutes
    CONTESTS_LIST: 180, // 3 minutes
    STATISTICS: 600, // 10 minutes
};

const getDomainDistributionValidationError = (distribution = []) => {
    if (!Array.isArray(distribution) || distribution.length === 0) {
        return 'At least one domain distribution entry is required';
    }

    const hasInvalidPercentage = distribution.some((item) => {
        const value = Number(item?.percentage);
        return !Number.isInteger(value) || value < MIN_DOMAIN_PERCENTAGE || value > MAX_DOMAIN_PERCENTAGE;
    });

    if (hasInvalidPercentage) {
        return `Each domain percentage must be between ${MIN_DOMAIN_PERCENTAGE}% and ${MAX_DOMAIN_PERCENTAGE}%`;
    }

    const total = distribution.reduce((sum, item) => sum + Number(item?.percentage || 0), 0);
    if (total !== TOTAL_PERCENTAGE) {
        return `Domain distribution must total exactly ${TOTAL_PERCENTAGE}%`;
    }

    const hasInvalidDifficulty = distribution.some((item) => !isValidDifficultyDistribution(item?.difficulty));
    if (hasInvalidDifficulty) {
        return 'Each domain difficulty split must include easy/medium/hard values totaling exactly 100%';
    }

    return null;
};

const buildUnknownDomainDetails = (field, unknownDomains = []) => ({
    field,
    message: `Invalid domain(s): ${[...new Set(unknownDomains.filter(Boolean))].join(', ')}`
});


/**
 * @desc    Get all contests with pagination, filtering, and sorting
 * @route   GET /api/admin/contests
 * @access  Admin
 */
export const getAllContests = async (req, res) => {
    console.log("Inside:");
    try {
        const {
            page = 1,
            limit = 10,
            search,
            status,
            sortBy = 'createdAt',
            sortOrder = 'desc'
        } = req.query;

        const cacheKey = getContestsCacheKey({
            page: parseInt(page),
            limit: parseInt(limit),
            search,
            status,
            sortBy,
            sortOrder
        });

        // Check Redis cache first
        try {
            const cachedData = await redisClient.get(cacheKey);
            if (cachedData) {
                return res.json(JSON.parse(cachedData));
            }
        } catch (redisError) {
            console.warn('Redis cache read error:', redisError);
        }

        // Build query
        let query = { isDeleted: false };

        // Search filter
        if (search) {
            query.title = { $regex: search, $options: 'i' };
        }

        // Status filter
        if (status && status !== 'all') {
            const now = new Date();
            switch (status) {
                case 'draft':
                    query.status = 'draft';
                    break;
                case 'upcoming':
                    query.startTime = { $gt: now };
                    query.status = { $ne: 'draft' };
                    break;
                case 'ongoing':
                    query.startTime = { $lte: now };
                    query.deadline = { $gt: now };
                    break;
                case 'completed':
                    query.deadline = { $lte: now };
                    break;
            }
        }

        // Sorting
        const sortOptions = {};
        if (sortBy === 'registrationCount') {
            sortOptions['participants'] = sortOrder === 'asc' ? 1 : -1;
        } else {
            sortOptions[sortBy] = sortOrder === 'asc' ? 1 : -1;
        }

        // Pagination
        const pageNum = parseInt(page);
        const limitNum = parseInt(limit);
        const skip = (pageNum - 1) * limitNum;

        // Execute queries
        const [contests, totalItems] = await Promise.all([
            Contest.find(query)
                .sort(sortOptions)
                .skip(skip)
                .limit(limitNum)
                .populate('participants', 'username')
                .select('-QuestionBank -__v'),
            Contest.countDocuments(query)
        ]);

        // Transform contests data
        const transformedContests = contests.map(contest => ({
            id: contest._id,
            title: contest.title,
            description: contest.description,
            startDate: contest.startTime.toISOString().split('T')[0],
            startTime: contest.startTime.toTimeString().split(' ')[0].substring(0, 5),
            duration: parseInt(contest.duration),
            registrationCount: contest.participants.length,
            registrationFee: contest.registerFee,
            prizePool: contest.prizes.reduce((total, prize) => total + prize.amount, 0),
            status: getContestStatus(contest),
            topics: contest.topics,
            domainDistribution: contest.domainDistribution || [],
            createdBy: contest.createdBy,
            createdAt: contest.createdAt,
            updatedAt: contest.updatedAt
        }));

        const totalPages = Math.ceil(totalItems / limitNum);

        const response = {
            success: true,
            data: {
                contests: transformedContests,
                pagination: {
                    currentPage: pageNum,
                    totalPages,
                    totalItems,
                    itemsPerPage: limitNum,
                    hasNextPage: pageNum < totalPages,
                    hasPreviousPage: pageNum > 1
                }
            },
            message: "Contests retrieved successfully"
        };

        // Cache the response
        try {
            await redisClient.setEx(cacheKey, CACHE_TTL.CONTESTS_LIST, JSON.stringify(response));
        } catch (redisError) {
            console.warn('Redis cache write error:', redisError);
        }

        return res.json(response);
    } catch (err) {
        console.error("Error fetching contests:", err);
        res.status(500).json({
            success: false,
            error: {
                code: "INTERNAL_SERVER_ERROR",
                message: "Server error"
            }
        });
    }
};

/**
 * @desc    Get contest by ID
 * @route   GET /api/admin/contests/:id
 * @access  Admin
 */
export const getContestById = async (req, res) => {
    try {
        const { id } = req.params;
        const cacheKey = getContestCacheKey(id);

        // Check Redis cache first
        try {
            const cachedData = await redisClient.get(cacheKey);
            if (cachedData) {
                return res.json(JSON.parse(cachedData));
            }
        } catch (redisError) {
            console.warn('Redis cache read error:', redisError);
        }

        const contest = await Contest.findById(id)
            .populate('participants', 'firstName lastName email createdAt')
            .populate('QuestionBank');

        if (!contest || contest.isDeleted) {
            return res.status(404).json({
                success: false,
                error: {
                    code: "NOT_FOUND",
                    message: "Contest not found"
                }
            });
        }

        const transformedContest = {
            id: contest._id,
            title: contest.title,
            description: contest.description,
            startDate: contest.startTime.toISOString().split('T')[0],
            startTime: contest.startTime.toTimeString().split(' ')[0].substring(0, 5),
            duration: parseInt(contest.duration),
            registrationCount: contest.participants.length,
            maxParticipants: contest.maxParticipants,
            registrationFee: contest.registerFee,
            prizePool: contest.prizes.reduce((total, prize) => total + prize.amount, 0),
            status: getContestStatus(contest),
            topics: contest.topics,
            domainDistribution: contest.domainDistribution || [],
            rules: contest.rules.join('\n'),
            createdBy: contest.createdBy,
            createdAt: contest.createdAt,
            updatedAt: contest.updatedAt,
            participants: contest.participants.map(p => ({
                userId: p._id,
                username: `${p.firstName} ${p.lastName}`,
                email: p.email,
                registeredAt: p.createdAt
            })),
            QuestionBank: contest.QuestionBank || []
        };

        const response = {
            success: true,
            data: transformedContest,
            message: "Contest retrieved successfully"
        };

        // Cache the response
        try {
            await redisClient.setEx(cacheKey, CACHE_TTL.CONTEST, JSON.stringify(response));
        } catch (redisError) {
            console.warn('Redis cache write error:', redisError);
        }

        return res.json(response);
    } catch (err) {
        console.error("Error fetching contest:", err);
        res.status(500).json({
            success: false,
            error: {
                code: "INTERNAL_SERVER_ERROR",
                message: "Server error"
            }
        });
    }
};

/**
 * @desc    Create a new contest
 * @route   POST /api/admin/contests
 * @access  Admin
 */
export const createContest = async (req, res) => {
    try {
        // Validate request body
        const validation = contestSchema.safeParse(req.body);

        if (!validation.success) {
            return res.status(400).json({
                success: false,
                error: {
                    code: "VALIDATION_ERROR",
                    message: "Invalid input data",
                    details: validation.error.errors.map(err => ({
                        field: err.path.join('.'),
                        message: err.message
                    }))
                }
            });
        }

        const activeDomainKeyMap = await getActiveDomainKeyMap();
        const { canonicalNames: canonicalTopics, unknownDomains: unknownTopicDomains } = canonicalizeDomainList(
            validation.data.topics,
            activeDomainKeyMap
        );

        if (unknownTopicDomains.length > 0) {
            return res.status(400).json({
                success: false,
                error: {
                    code: "VALIDATION_ERROR",
                    message: "Invalid input data",
                    details: [buildUnknownDomainDetails('topics', unknownTopicDomains)]
                }
            });
        }

        const {
            canonicalDistribution,
            unknownDomains: unknownDistributionDomains
        } = canonicalizeDomainDistributionList(validation.data.domainDistribution, activeDomainKeyMap);

        if (unknownDistributionDomains.length > 0) {
            return res.status(400).json({
                success: false,
                error: {
                    code: "VALIDATION_ERROR",
                    message: "Invalid input data",
                    details: [buildUnknownDomainDetails('domainDistribution', unknownDistributionDomains)]
                }
            });
        }

        if (!isDistributionMatchingDomains(canonicalTopics, canonicalDistribution)) {
            return res.status(400).json({
                success: false,
                error: {
                    code: "VALIDATION_ERROR",
                    message: "Invalid input data",
                    details: [
                        {
                            field: "domainDistribution",
                            message: "Domain distribution names must exactly match selected topics"
                        }
                    ]
                }
            });
        }

        const normalizedDomainDistribution = normalizeDomainDistribution(
            canonicalTopics,
            canonicalDistribution
        );

        const distributionValidationError = getDomainDistributionValidationError(normalizedDomainDistribution);
        if (distributionValidationError) {
            return res.status(400).json({
                success: false,
                error: {
                    code: "VALIDATION_ERROR",
                    message: "Invalid input data",
                    details: [
                        {
                            field: "domainDistribution",
                            message: distributionValidationError
                        }
                    ]
                }
            });
        }

        const contestData = {
            ...validation.data,
            topics: canonicalTopics,
            startTime: new Date(`${validation.data.startDate} ${validation.data.startTime}`),
            deadline: new Date(new Date(`${validation.data.startDate} ${validation.data.startTime}`).getTime() + validation.data.duration * 60000),
            registerFee: validation.data.registrationFee,
            domainDistribution: normalizedDomainDistribution,
            createdBy: req.user?.userId || 'admin_user_id'
        };

        const contest = await Contest.create(contestData);

        const response = {
            success: true,
            data: {
                id: contest._id,
                title: contest.title,
                description: contest.description,
                duration: validation.data.duration,
                startDate: validation.data.startDate,
                startTime: validation.data.startTime,
                registrationFee: validation.data.registrationFee,
                prizePool: contest.prizes.reduce((total, prize) => total + prize.amount, 0),
                topics: contest.topics,
                domainDistribution: contest.domainDistribution || [],
                maxParticipants: contest.maxParticipants,
                registrationCount: 0,
                rules: contest.rules.join('\n'),
                status: validation.data.status,
                createdBy: contest.createdBy,
                createdAt: contest.createdAt,
                updatedAt: contest.updatedAt
            },
            message: "Contest created successfully"
        };

        // Clear contests list cache
        await clearContestsListCache();

        return res.status(201).json(response);
    } catch (err) {
        console.error("Error creating contest:", err);
        if (err.code === 11000) {
            return res.status(409).json({
                success: false,
                error: {
                    code: "CONFLICT",
                    message: "Unable to create contest due to a unique constraint conflict"
                }
            });
        }
        res.status(500).json({
            success: false,
            error: {
                code: "INTERNAL_SERVER_ERROR",
                message: "Server error"
            }
        });
    }
};

/**
 * @desc    Update contest
 * @route   PUT /api/admin/contests/:id
 * @access  Admin
 */
export const updateContest = async (req, res) => {
    try {
        const { id } = req.params;

        // Validate request body
        const validation = updateContestSchema.safeParse(req.body);

        if (!validation.success) {
            return res.status(400).json({
                success: false,
                error: {
                    code: "VALIDATION_ERROR",
                    message: "Invalid input data",
                    details: validation.error.errors.map(err => ({
                        field: err.path.join('.'),
                        message: err.message
                    }))
                }
            });
        }

        const updateData = { ...validation.data };

        const needsExistingContest = Boolean(
            validation.data.startDate ||
            validation.data.startTime ||
            validation.data.topics ||
            validation.data.domainDistribution
        );

        let existingContest = null;

        if (needsExistingContest) {
            existingContest = await Contest.findById(id);
            if (!existingContest) {
                return res.status(404).json({
                    success: false,
                    error: {
                        code: "NOT_FOUND",
                        message: "Contest not found"
                    }
                });
            }
        }

        // Handle date/time updates
        if (validation.data.startDate || validation.data.startTime) {
            const currentStartDate = validation.data.startDate || existingContest.startTime.toISOString().split('T')[0];
            const currentStartTime = validation.data.startTime || existingContest.startTime.toTimeString().split(' ')[0].substring(0, 5);

            updateData.startTime = new Date(`${currentStartDate} ${currentStartTime}`);
            updateData.deadline = new Date(updateData.startTime.getTime() + (validation.data.duration || existingContest.duration) * 60000);
        }

        if (validation.data.topics || validation.data.domainDistribution) {
            const activeDomainKeyMap = await getActiveDomainKeyMap();
            const mergedTopicsInput = validation.data.topics || existingContest.topics || [];
            const mergedDistributionInput = validation.data.domainDistribution || existingContest.domainDistribution || [];

            const {
                canonicalNames: mergedTopics,
                unknownDomains: unknownTopicDomains
            } = canonicalizeDomainList(mergedTopicsInput, activeDomainKeyMap);

            if (unknownTopicDomains.length > 0) {
                return res.status(400).json({
                    success: false,
                    error: {
                        code: "VALIDATION_ERROR",
                        message: "Invalid input data",
                        details: [buildUnknownDomainDetails('topics', unknownTopicDomains)]
                    }
                });
            }

            const {
                canonicalDistribution: mergedDistribution,
                unknownDomains: unknownDistributionDomains
            } = canonicalizeDomainDistributionList(mergedDistributionInput, activeDomainKeyMap);

            if (unknownDistributionDomains.length > 0) {
                return res.status(400).json({
                    success: false,
                    error: {
                        code: "VALIDATION_ERROR",
                        message: "Invalid input data",
                        details: [buildUnknownDomainDetails('domainDistribution', unknownDistributionDomains)]
                    }
                });
            }

            if (!isDistributionMatchingDomains(mergedTopics, mergedDistribution)) {
                return res.status(400).json({
                    success: false,
                    error: {
                        code: "VALIDATION_ERROR",
                        message: "Invalid input data",
                        details: [
                            {
                                field: "domainDistribution",
                                message: "Domain distribution names must exactly match selected topics"
                            }
                        ]
                    }
                });
            }

            if (validation.data.topics) {
                updateData.topics = mergedTopics;
            }

            updateData.domainDistribution = normalizeDomainDistribution(mergedTopics, mergedDistribution);

            const distributionValidationError = getDomainDistributionValidationError(updateData.domainDistribution);
            if (distributionValidationError) {
                return res.status(400).json({
                    success: false,
                    error: {
                        code: "VALIDATION_ERROR",
                        message: "Invalid input data",
                        details: [
                            {
                                field: "domainDistribution",
                                message: distributionValidationError
                            }
                        ]
                    }
                });
            }
        }

        if (validation.data.registrationFee !== undefined) {
            updateData.registerFee = validation.data.registrationFee;
        }

        const contest = await Contest.findByIdAndUpdate(id, updateData, { new: true })
            .populate('participants', 'username');

        if (!contest) {
            return res.status(404).json({
                success: false,
                error: {
                    code: "NOT_FOUND",
                    message: "Contest not found"
                }
            });
        }

        const response = {
            success: true,
            data: {
                id: contest._id,
                title: contest.title,
                description: contest.description,
                duration: parseInt(contest.duration),
                startDate: contest.startTime.toISOString().split('T')[0],
                startTime: contest.startTime.toTimeString().split(' ')[0].substring(0, 5),
                registrationFee: contest.registerFee,
                prizePool: contest.prizes.reduce((total, prize) => total + prize.amount, 0),
                topics: contest.topics,
                domainDistribution: contest.domainDistribution || [],
                maxParticipants: contest.maxParticipants,
                registrationCount: contest.participants.length,
                rules: contest.rules.join('\n'),
                status: getContestStatus(contest),
                createdBy: contest.createdBy,
                createdAt: contest.createdAt,
                updatedAt: contest.updatedAt
            },
            message: "Contest updated successfully"
        };

        // Clear cache
        await Promise.all([
            redisClient.del(getContestCacheKey(id)),
            clearContestsListCache()
        ]);

        return res.json(response);
    } catch (err) {
        console.error("Error updating contest:", err);
        if (err.code === 11000) {
            return res.status(409).json({
                success: false,
                error: {
                    code: "CONFLICT",
                    message: "Unable to update contest due to a unique constraint conflict"
                }
            });
        }
        res.status(500).json({
            success: false,
            error: {
                code: "INTERNAL_SERVER_ERROR",
                message: "Server error"
            }
        });
    }
};

/**
 * @desc    Update contest status
 * @route   PATCH /api/admin/contests/:id/status
 * @access  Admin
 */
export const updateContestStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const { status } = req.body;

        // Validate status
        const validStatuses = ['draft', 'upcoming', 'ongoing', 'completed', 'cancelled'];
        if (!validStatuses.includes(status)) {
            return res.status(400).json({
                success: false,
                error: {
                    code: "VALIDATION_ERROR",
                    message: "Invalid status value",
                    details: [
                        {
                            field: "status",
                            message: `Status must be one of: ${validStatuses.join(', ')}`
                        }
                    ]
                }
            });
        }

        const contest = await Contest.findByIdAndUpdate(
            id,
            { status, updatedAt: new Date() },
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

        const response = {
            success: true,
            data: {
                id: contest._id,
                status: contest.status,
                updatedAt: contest.updatedAt
            },
            message: "Contest status updated successfully"
        };

        // Clear cache
        await Promise.all([
            redisClient.del(getContestCacheKey(id)),
            clearContestsListCache()
        ]);

        return res.json(response);
    } catch (err) {
        console.error("Error updating contest status:", err);
        res.status(500).json({
            success: false,
            error: {
                code: "INTERNAL_SERVER_ERROR",
                message: "Server error"
            }
        });
    }
};

/**
 * @desc    Delete contest (soft delete)
 * @route   DELETE /api/admin/contests/:id
 * @access  Admin
 */
export const deleteContest = async (req, res) => {
    try {
        const { id } = req.params;

        const contest = await Contest.findByIdAndUpdate(
            id,
            { isDeleted: true, updatedAt: new Date() },
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

        // Clear cache
        await Promise.all([
            redisClient.del(getContestCacheKey(id)),
            clearContestsListCache()
        ]);

        return res.json({
            success: true,
            message: "Contest deleted successfully"
        });
    } catch (err) {
        console.error("Error deleting contest:", err);
        res.status(500).json({
            success: false,
            error: {
                code: "INTERNAL_SERVER_ERROR",
                message: "Server error"
            }
        });
    }
};

/**
 * @desc    Get contest statistics
 * @route   GET /api/admin/contests/:id/statistics
 * @access  Admin
 */
export const getContestStatistics = async (req, res) => {
    try {
        const { id } = req.params;
        const cacheKey = getContestStatsCacheKey(id);

        // Check Redis cache first
        try {
            const cachedData = await redisClient.get(cacheKey);
            if (cachedData) {
                return res.json(JSON.parse(cachedData));
            }
        } catch (redisError) {
            console.warn('Redis cache read error:', redisError);
        }

        const contest = await Contest.findById(id);

        if (!contest || contest.isDeleted) {
            return res.status(404).json({
                success: false,
                error: {
                    code: "NOT_FOUND",
                    message: "Contest not found"
                }
            });
        }

        // Calculate real statistics using aggregation
        const stats = await Submission.aggregate([
            { $match: { contestId: contest._id } },
            {
                $group: {
                    _id: null,
                    registrationCount: { $sum: 1 },
                    completedParticipants: { $sum: { $cond: [{ $eq: ["$status", "evaluated"] }, 1, 0] } },
                    averageScore: { $avg: "$score" },
                    highestScore: { $max: "$score" },
                    lowestScore: { $min: "$score" }
                }
            }
        ]);

        const result = stats[0] || {
            registrationCount: 0,
            completedParticipants: 0,
            averageScore: 0,
            highestScore: 0,
            lowestScore: 0
        };

        const registrationCount = contest.participants.length;
        const totalRevenue = registrationCount * contest.registerFee;

        // Group participants by country
        const participantsByCountry = await User.aggregate([
            { $match: { _id: { $in: contest.participants } } },
            {
                $group: {
                    _id: "$country",
                    count: { $sum: 1 }
                }
            }
        ]).then(res => res.reduce((acc, curr) => {
            acc[curr._id || 'Unknown'] = curr.count;
            return acc;
        }, {}));

        // Registration trend (last 7 days)
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

        const registrationTrend = await User.aggregate([
            { $match: { _id: { $in: contest.participants }, createdAt: { $gte: sevenDaysAgo } } },
            {
                $group: {
                    _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
                    count: { $sum: 1 }
                }
            },
            { $sort: { _id: 1 } },
            { $project: { date: "$_id", count: 1, _id: 0 } }
        ]);

        const response = {
            success: true,
            data: {
                contestId: contest._id,
                registrationCount,
                completedParticipants: result.completedParticipants,
                averageScore: Math.round((result.averageScore || 0) * 100) / 100,
                highestScore: result.highestScore || 0,
                lowestScore: result.lowestScore || 0,
                totalRevenue,
                participantsByCountry,
                registrationTrend
            },
            message: "Contest statistics retrieved successfully"
        };

        // Cache the response
        try {
            await redisClient.setEx(cacheKey, CACHE_TTL.STATISTICS, JSON.stringify(response));
        } catch (redisError) {
            console.warn('Redis cache write error:', redisError);
        }

        return res.json(response);
    } catch (err) {
        console.error("Error fetching contest statistics:", err);
        res.status(500).json({
            success: false,
            error: {
                code: "INTERNAL_SERVER_ERROR",
                message: "Server error"
            }
        });
    }
};

/**
 * @desc    Bulk update contest status
 * @route   PATCH /api/admin/contests/bulk-status
 * @access  Admin
 */
export const bulkUpdateStatus = async (req, res) => {
    try {
        // Validate request body
        const validation = bulkStatusUpdateSchema.safeParse(req.body);

        if (!validation.success) {
            return res.status(400).json({
                success: false,
                error: {
                    code: "VALIDATION_ERROR",
                    message: "Invalid input data",
                    details: validation.error.errors.map(err => ({
                        field: err.path.join('.'),
                        message: err.message
                    }))
                }
            });
        }

        const { contestIds, status } = validation.data;

        const result = await Contest.updateMany(
            { _id: { $in: contestIds }, isDeleted: false },
            { status, updatedAt: new Date() }
        );

        // Clear cache for all affected contests
        await Promise.all([
            ...contestIds.map(id => redisClient.del(getContestCacheKey(id))),
            clearContestsListCache()
        ]);

        return res.json({
            success: true,
            data: {
                updatedCount: result.modifiedCount,
                failedCount: contestIds.length - result.modifiedCount,
                updatedContests: contestIds.slice(0, result.modifiedCount)
            },
            message: "Bulk status update completed successfully"
        });
    } catch (err) {
        console.error("Error in bulk status update:", err);
        res.status(500).json({
            success: false,
            error: {
                code: "INTERNAL_SERVER_ERROR",
                message: "Server error"
            }
        });
    }
};

/**
 * @desc    Bulk delete contests
 * @route   DELETE /api/admin/contests/bulk-delete
 * @access  Admin
 */
export const bulkDeleteContests = async (req, res) => {
    try {
        const { contestIds } = req.body;

        if (!contestIds || !Array.isArray(contestIds) || contestIds.length === 0) {
            return res.status(400).json({
                success: false,
                error: {
                    code: "VALIDATION_ERROR",
                    message: "Contest IDs must be provided as a non-empty array"
                }
            });
        }

        const result = await Contest.updateMany(
            { _id: { $in: contestIds }, isDeleted: false },
            { isDeleted: true, updatedAt: new Date() }
        );

        // Clear cache for all affected contests
        await Promise.all([
            ...contestIds.map(id => redisClient.del(getContestCacheKey(id))),
            clearContestsListCache()
        ]);

        return res.json({
            success: true,
            data: {
                deletedCount: result.modifiedCount,
                failedCount: contestIds.length - result.modifiedCount,
                deletedContests: contestIds.slice(0, result.modifiedCount)
            },
            message: "Bulk delete completed successfully"
        });
    } catch (err) {
        console.error("Error in bulk delete:", err);
        res.status(500).json({
            success: false,
            error: {
                code: "INTERNAL_SERVER_ERROR",
                message: "Server error"
            }
        });
    }
};

export const addQuestionsToContest = async (req, res) => {
    const { contestId, questions } = req.body;

    console.log(`contestId: ${contestId}`);

    const notAcceptedQues = [];
    const acceptedQues = [];

    // Validation checks
    if (!contestId) {
        return res.status(400).json({ message: "Provide the contest ID to add questions" });
    }

    if (!questions || !Array.isArray(questions)) {
        return res.status(400).json({ message: "Questions must be provided as an array" });
    }

    if (questions.length === 0) {
        return res.status(400).json({ message: "Enter at least one question to insert" });
    }

    try {
        const activeDomainKeyMap = await getActiveDomainKeyMap();

        // Process each question
        questions.forEach(question => {
            const result = questionsSchema.safeParse(question);

            if (!result.success) {
                notAcceptedQues.push({
                    question,
                    errors: result.error.errors
                });
            } else {
                const canonicalDomain = canonicalizeSingleDomain(question.domain, activeDomainKeyMap);

                if (!canonicalDomain) {
                    notAcceptedQues.push({
                        question,
                        errors: [
                            {
                                path: ['domain'],
                                message: 'Invalid domain selected'
                            }
                        ]
                    });
                    return;
                }

                acceptedQues.push({
                    ...question,
                    domain: canonicalDomain
                });
            }
        });

        let insertedQuestions = [];
        let insertedQuestionIds = [];

        // Only proceed if there are accepted questions
        if (acceptedQues.length > 0) {
            try {
                // Insert questions first
                insertedQuestions = await Question.create(acceptedQues);
                insertedQuestionIds = insertedQuestions.map(question => question._id);

                // Check if contest exists and update it
                const updateResult = await Contest.findByIdAndUpdate(
                    contestId,
                    {
                        $push: {
                            QuestionBank: {
                                $each: insertedQuestionIds
                            }
                        }
                    }
                );

                if (!updateResult) {
                    // Contest not found - clean up inserted questions
                    await Question.deleteMany({ _id: { $in: insertedQuestionIds } });
                    return res.status(404).json({
                        message: "Contest not found. Questions were not added."
                    });
                }
            } catch (error) {
                // If contest update fails, clean up inserted questions
                if (insertedQuestionIds.length > 0) {
                    await Question.deleteMany({ _id: { $in: insertedQuestionIds } });
                }
                throw error;
            }
        }

        // Send response with results
        return res.status(200).json({
            message: "Questions processed successfully",
            summary: {
                total: questions.length,
                accepted: acceptedQues.length,
                rejected: notAcceptedQues.length
            },
            insertedQuestions,
            rejectedQuestions: notAcceptedQues
        });

    } catch (error) {
        console.error(`ERROR: ${error.message}`);
        return res.status(500).json({
            message: "Internal Server Error"
        });
    }
};

// Helper functions
const getContestStatus = (contest) => {
    const now = new Date();
    if (contest.status === 'draft') return 'draft';
    if (contest.status === 'cancelled') return 'cancelled';
    if (contest.status === 'completed') return 'completed';
    if (contest.startTime > now) return 'upcoming';
    if (contest.deadline > now) return 'ongoing';
    return 'completed';
};

const clearContestsListCache = async () => {
    try {
        for await (const key of redisClient.scanIterator({ MATCH: 'contests:*' })) {
            await redisClient.del(key);
        }
    } catch (error) {
        console.warn('Error clearing contests list cache:', error);
    }
};