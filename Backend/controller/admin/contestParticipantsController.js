// controller/admin/contestParticipantsController.js
import { Parser } from 'json2csv';
import { Certificate, Contest, User } from "../../Models/DB.js";
import { exportParticipantsSchema, issueCertificateSchema } from "../../Models/zodParticipantsSchema.js";
import redisClient from '../../redis.js';

// Redis cache keys
const getParticipantsCacheKey = (contestId, queryParams) => `contest:${contestId}:participants:${JSON.stringify(queryParams)}`;
const getCertificatesCacheKey = (contestId) => `contest:${contestId}:certificates`;

// Cache TTL
const CACHE_TTL = {
    PARTICIPANTS: 300, // 5 minutes
    CERTIFICATES: 600, // 10 minutes
};

/**
 * @desc    Fetch participants of a contest
 * @route   GET /api/admin/contests/:id/participants
 * @access  Admin
 */
export const getContestParticipants = async (req, res) => {
    try {
        const { id: contestId } = req.params;
        const {
            page = 1,
            limit = 20,
            search,
            status = 'all', // 'all', 'registered', 'completed', 'withdrawn'
            sortBy = 'registeredAt',
            sortOrder = 'desc'
        } = req.query;

        const queryParams = { page: parseInt(page), limit: parseInt(limit), search, status, sortBy, sortOrder };
        const cacheKey = getParticipantsCacheKey(contestId, queryParams);

        // Check Redis cache first
        try {
            const cachedData = await redisClient.get(cacheKey);
            if (cachedData) {
                return res.json(JSON.parse(cachedData));
            }
        } catch (redisError) {
            console.warn('Redis cache read error:', redisError);
        }

        // Check if contest exists
        const contest = await Contest.findById(contestId);
        if (!contest || contest.isDeleted) {
            return res.status(404).json({
                success: false,
                error: {
                    code: "NOT_FOUND",
                    message: "Contest not found"
                }
            });
        }

        // Build query for participants
        let participantQuery = { _id: { $in: contest.participants } };
        
        // Search filter
        if (search) {
            participantQuery.$or = [
                { username: { $regex: search, $options: 'i' } },
                { email: { $regex: search, $options: 'i' } },
                { firstName: { $regex: search, $options: 'i' } },
                { lastName: { $regex: search, $options: 'i' } }
            ];
        }

        // Status filter (this would depend on your user schema and contest participation tracking)
        if (status !== 'all') {
            switch (status) {
                case 'registered':
                    participantQuery.contestStatus = 'registered';
                    break;
                case 'completed':
                    participantQuery.contestStatus = 'completed';
                    break;
                case 'withdrawn':
                    participantQuery.contestStatus = 'withdrawn';
                    break;
            }
        }

        // Sorting
        const sortOptions = {};
        if (sortBy === 'registeredAt') {
            sortOptions['createdAt'] = sortOrder === 'asc' ? 1 : -1;
        } else {
            sortOptions[sortBy] = sortOrder === 'asc' ? 1 : -1;
        }

        // Pagination
        const pageNum = parseInt(page);
        const limitNum = parseInt(limit);
        const skip = (pageNum - 1) * limitNum;

        // Execute queries
        const [participants, totalParticipants] = await Promise.all([
            User.find(participantQuery)
                .sort(sortOptions)
                .skip(skip)
                .limit(limitNum)
                .select('username email firstName lastName profilePicture country contestScore createdAt updatedAt')
                .lean(),
            User.countDocuments(participantQuery)
        ]);

        // Get additional contest-specific data (scores, certificates, etc.)
        const participantIds = participants.map(p => p._id);
        const certificates = await Certificate.find({
            contestId,
            participantId: { $in: participantIds }
        }).lean();

        // Create certificates lookup
        const certificatesMap = {};
        certificates.forEach(cert => {
            certificatesMap[cert.participantId.toString()] = cert;
        });

        // Transform participant data
        const transformedParticipants = participants.map(participant => {
            const certificate = certificatesMap[participant._id.toString()];
            
            return {
                id: participant._id,
                username: participant.username,
                email: participant.email,
                name: `${participant.firstName || ''} ${participant.lastName || ''}`.trim(),
                profilePicture: participant.profilePicture,
                country: participant.country,
                registeredAt: participant.createdAt,
                score: participant.contestScore || 0,
                status: getParticipantStatus(participant, contest),
                certificate: certificate ? {
                    id: certificate._id,
                    issued: true,
                    issuedAt: certificate.createdAt,
                    certificateUrl: certificate.certificateUrl
                } : {
                    issued: false
                },
                rank: null // Will be calculated if needed
            };
        });

        // Calculate ranks if needed (based on scores)
        if (sortBy === 'score') {
            const sortedByScore = [...transformedParticipants].sort((a, b) => b.score - a.score);
            sortedByScore.forEach((participant, index) => {
                participant.rank = index + 1;
            });
        }

        const totalPages = Math.ceil(totalParticipants / limitNum);
        
        const response = {
            success: true,
            data: {
                contest: {
                    id: contest._id,
                    title: contest.title,
                    totalParticipants: contest.participants.length
                },
                participants: transformedParticipants,
                pagination: {
                    currentPage: pageNum,
                    totalPages,
                    totalItems: totalParticipants,
                    itemsPerPage: limitNum,
                    hasNextPage: pageNum < totalPages,
                    hasPreviousPage: pageNum > 1
                },
                summary: {
                    total: totalParticipants,
                    registered: totalParticipants, // Adjust based on your status logic
                    completed: certificates.length,
                    averageScore: transformedParticipants.length > 0 
                        ? transformedParticipants.reduce((sum, p) => sum + p.score, 0) / transformedParticipants.length 
                        : 0
                }
            },
            message: "Contest participants retrieved successfully"
        };

        // Cache the response
        try {
            await redisClient.setex(cacheKey, CACHE_TTL.PARTICIPANTS, JSON.stringify(response));
        } catch (redisError) {
            console.warn('Redis cache write error:', redisError);
        }

        return res.json(response);
    } catch (err) {
        console.error("Error fetching contest participants:", err);
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
 * @desc    Issue certificates to contest participants
 * @route   POST /api/admin/contests/:id/certificates/issue
 * @access  Admin
 */
export const issueCertificates = async (req, res) => {
    try {
        const { id: contestId } = req.params;
        
        // Validate request body
        const validation = issueCertificateSchema.safeParse(req.body);
        
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

        const { 
            participantIds, 
            certificateType = 'completion',
            customMessage,
            minScore = 0,
            issueToAll = false 
        } = validation.data;

        // Check if contest exists
        const contest = await Contest.findById(contestId);
        if (!contest || contest.isDeleted) {
            return res.status(404).json({
                success: false,
                error: {
                    code: "NOT_FOUND",
                    message: "Contest not found"
                }
            });
        }

        let targetParticipantIds = [];

        if (issueToAll) {
            // Issue to all participants who meet minimum score requirement
            const eligibleParticipants = await User.find({
                _id: { $in: contest.participants },
                $or: [
                    { contestScore: { $gte: minScore } },
                    { contestScore: { $exists: false } } // Handle participants without scores
                ]
            }).select('_id contestScore').lean();

            targetParticipantIds = eligibleParticipants
                .filter(p => (p.contestScore || 0) >= minScore)
                .map(p => p._id.toString());
        } else {
            // Issue to specific participants
            targetParticipantIds = participantIds;
        }

        if (targetParticipantIds.length === 0) {
            return res.status(400).json({
                success: false,
                error: {
                    code: "NO_ELIGIBLE_PARTICIPANTS",
                    message: "No eligible participants found for certificate issuance"
                }
            });
        }

        // Check which participants already have certificates
        const existingCertificates = await Certificate.find({
            contestId,
            participantId: { $in: targetParticipantIds }
        }).lean();

        const existingCertificateMap = {};
        existingCertificates.forEach(cert => {
            existingCertificateMap[cert.participantId.toString()] = cert;
        });

        // Get participant details
        const participants = await User.find({
            _id: { $in: targetParticipantIds }
        }).select('username email firstName lastName contestScore').lean();

        const results = {
            issued: [],
            alreadyIssued: [],
            failed: []
        };

        // Process each participant
        for (const participant of participants) {
            const participantId = participant._id.toString();
            
            try {
                // Check if certificate already exists
                if (existingCertificateMap[participantId]) {
                    results.alreadyIssued.push({
                        participantId,
                        username: participant.username,
                        reason: "Certificate already issued"
                    });
                    continue;
                }

                // Create certificate
                const certificateData = {
                    contestId,
                    participantId: participant._id,
                    participantName: `${participant.firstName || ''} ${participant.lastName || ''}`.trim() || participant.username,
                    contestTitle: contest.title,
                    certificateType,
                    score: participant.contestScore || 0,
                    issueDate: new Date(),
                    issuedBy: req.user?.id || 'admin',
                    customMessage: customMessage || `Congratulations on completing ${contest.title}!`,
                    certificateNumber: generateCertificateNumber(contest._id, participant._id),
                    status: 'issued'
                };

                const certificate = await Certificate.create(certificateData);
                
                results.issued.push({
                    participantId,
                    username: participant.username,
                    certificateId: certificate._id,
                    certificateNumber: certificate.certificateNumber
                });

                // TODO: Send email notification to participant
                // await sendCertificateNotification(participant.email, certificate);

            } catch (error) {
                console.error(`Error issuing certificate for participant ${participantId}:`, error);
                results.failed.push({
                    participantId,
                    username: participant.username,
                    reason: error.message || "Unknown error"
                });
            }
        }

        // Clear certificates cache
        try {
            await redisClient.del(getCertificatesCacheKey(contestId));
            // Also clear participants cache as it includes certificate info
            const participantsCacheKeys = await redisClient.keys(`contest:${contestId}:participants:*`);
            if (participantsCacheKeys.length > 0) {
                await redisClient.del(...participantsCacheKeys);
            }
        } catch (redisError) {
            console.warn('Redis cache clear error:', redisError);
        }

        const response = {
            success: true,
            data: {
                summary: {
                    total: targetParticipantIds.length,
                    issued: results.issued.length,
                    alreadyIssued: results.alreadyIssued.length,
                    failed: results.failed.length
                },
                results
            },
            message: `Certificate issuance completed. ${results.issued.length} certificates issued successfully.`
        };

        return res.json(response);
    } catch (err) {
        console.error("Error issuing certificates:", err);
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
 * @desc    Export contest participants
 * @route   GET /api/admin/contests/:id/participants/export
 * @access  Admin
 */
export const exportContestParticipants = async (req, res) => {
    try {
        const { id: contestId } = req.params;
        const {
            format = 'csv', // 'csv', 'json', 'xlsx'
            fields = 'all', // 'all', 'basic', 'detailed'
            includeScores = 'true',
            includeCertificates = 'true'
        } = req.query;

        // Validate query parameters
        const validation = exportParticipantsSchema.safeParse({
            format,
            fields,
            includeScores: includeScores === 'true',
            includeCertificates: includeCertificates === 'true'
        });

        if (!validation.success) {
            return res.status(400).json({
                success: false,
                error: {
                    code: "VALIDATION_ERROR",
                    message: "Invalid export parameters",
                    details: validation.error.errors.map(err => ({
                        field: err.path.join('.'),
                        message: err.message
                    }))
                }
            });
        }

        // Check if contest exists
        const contest = await Contest.findById(contestId);
        if (!contest || contest.isDeleted) {
            return res.status(404).json({
                success: false,
                error: {
                    code: "NOT_FOUND",
                    message: "Contest not found"
                }
            });
        }

        // Get all participants
        const participants = await User.find({
            _id: { $in: contest.participants }
        }).select('username email firstName lastName profilePicture country phone dateOfBirth contestScore createdAt updatedAt').lean();

        if (participants.length === 0) {
            return res.status(404).json({
                success: false,
                error: {
                    code: "NO_PARTICIPANTS",
                    message: "No participants found for this contest"
                }
            });
        }

        // Get certificates if needed
        let certificatesMap = {};
        if (validation.data.includeCertificates) {
            const certificates = await Certificate.find({
                contestId,
                participantId: { $in: participants.map(p => p._id) }
            }).lean();

            certificates.forEach(cert => {
                certificatesMap[cert.participantId.toString()] = cert;
            });
        }

        // Transform data based on requested fields
        const transformedData = participants.map((participant, index) => {
            const certificate = certificatesMap[participant._id.toString()];
            
            const baseData = {
                serialNumber: index + 1,
                participantId: participant._id.toString(),
                username: participant.username,
                email: participant.email,
                fullName: `${participant.firstName || ''} ${participant.lastName || ''}`.trim(),
                registeredAt: participant.createdAt?.toISOString(),
            };

            if (validation.data.fields === 'detailed') {
                Object.assign(baseData, {
                    firstName: participant.firstName,
                    lastName: participant.lastName,
                    country: participant.country,
                    phone: participant.phone,
                    dateOfBirth: participant.dateOfBirth?.toISOString(),
                    profilePicture: participant.profilePicture,
                    lastUpdated: participant.updatedAt?.toISOString()
                });
            }

            if (validation.data.includeScores) {
                Object.assign(baseData, {
                    score: participant.contestScore || 0,
                    rank: null // Will be calculated
                });
            }

            if (validation.data.includeCertificates) {
                Object.assign(baseData, {
                    certificateIssued: !!certificate,
                    certificateId: certificate?._id?.toString() || '',
                    certificateNumber: certificate?.certificateNumber || '',
                    certificateIssuedAt: certificate?.createdAt?.toISOString() || '',
                    certificateType: certificate?.certificateType || ''
                });
            }

            return baseData;
        });

        // Calculate ranks if scores are included
        if (validation.data.includeScores) {
            const sortedByScore = [...transformedData].sort((a, b) => b.score - a.score);
            sortedByScore.forEach((participant, index) => {
                const originalIndex = transformedData.findIndex(p => p.participantId === participant.participantId);
                transformedData[originalIndex].rank = index + 1;
            });
        }

        // Generate export based on format
        const filename = `contest_${contest.slug || contestId}_participants_${new Date().toISOString().split('T')[0]}`;
        
        switch (validation.data.format) {
            case 'csv':
                const parser = new Parser();
                const csv = parser.parse(transformedData);
                
                res.setHeader('Content-Type', 'text/csv');
                res.setHeader('Content-Disposition', `attachment; filename="${filename}.csv"`);
                return res.send(csv);

            case 'json':
                const exportData = {
                    contest: {
                        id: contest._id,
                        title: contest.title,
                        slug: contest.slug,
                        totalParticipants: participants.length
                    },
                    exportedAt: new Date().toISOString(),
                    exportedBy: req.user?.username || 'admin',
                    participants: transformedData
                };

                res.setHeader('Content-Type', 'application/json');
                res.setHeader('Content-Disposition', `attachment; filename="${filename}.json"`);
                return res.json(exportData);

            case 'xlsx':
                // For XLSX export, you would use a library like xlsx
                return res.status(501).json({
                    success: false,
                    error: {
                        code: "NOT_IMPLEMENTED",
                        message: "XLSX export format is not yet implemented"
                    }
                });

            default:
                return res.status(400).json({
                    success: false,
                    error: {
                        code: "INVALID_FORMAT",
                        message: "Unsupported export format"
                    }
                });
        }

    } catch (err) {
        console.error("Error exporting contest participants:", err);
        res.status(500).json({
            success: false,
            error: {
                code: "INTERNAL_SERVER_ERROR",
                message: "Server error"
            }
        });
    }
};

// Helper functions
const getParticipantStatus = (participant, contest) => {
    const now = new Date();
    
    if (contest.startTime > now) {
        return 'registered';
    } else if (contest.deadline > now) {
        return 'ongoing';
    } else {
        return participant.contestScore !== undefined ? 'completed' : 'incomplete';
    }
};

const generateCertificateNumber = (contestId, participantId) => {
    const contestPart = contestId.toString().substring(0, 8).toUpperCase();
    const participantPart = participantId.toString().substring(0, 8).toUpperCase();
    const datePart = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    
    return `CERT-${contestPart}-${participantPart}-${datePart}`;
};