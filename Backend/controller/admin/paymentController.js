// controllers/paymentController.js
import mongoose from 'mongoose';
import { Contest, Payment } from '../../models/DB.js';
import { paymentStore } from '../../store/paymentStore.js';
import {
    exportPaymentsSchema,
    getAllPaymentsSchema,
    paymentStatsSchema,
    updatePaymentStatusSchema,
    webhookPaymentSchema
} from '../../validation/paymentValidation.js';


    // 1. Get All Payments
    export const  getAllPayments = async (req, res) => {
        try {
            const validatedData = getAllPaymentsSchema.parse(req.body);
            const { filters = {}, pagination = {}, sorting = {} } = validatedData;

            // Check Redis cache first
            const cachedData = await paymentStore.getPaymentsList(filters, pagination, sorting);
            if (cachedData) {
                return res.json({
                    success: true,
                    data: cachedData,
                    cached: true
                });
            }

            // Build MongoDB query
            const query = { isDeleted: false };
            
            if (filters.status && filters.status !== 'all') {
                query.status = filters.status;
            }
            
            if (filters.contestId && filters.contestId !== 'all') {
                query.contestRef = new mongoose.Types.ObjectId(filters.contestId);
            }
            
            if (filters.userId) {
                query.userRef = new mongoose.Types.ObjectId(filters.userId);
            }
            
            if (filters.dateRange) {
                query.createdAt = {
                    $gte: new Date(filters.dateRange.startDate),
                    $lte: new Date(filters.dateRange.endDate + 'T23:59:59.999Z')
                };
            }

            // Calculate pagination
            const page = pagination.page || 1;
            const limit = pagination.limit || 50;
            const skip = (page - 1) * limit;

            // Execute query with population
            const [payments, total] = await Promise.all([
                Payment.find(query)
                    .populate('userRef', 'firstName lastName email registrationId')
                    .populate('contestRef', 'title slug registerFee')
                    .sort({ [sorting.field || 'createdAt']: sorting.order === 'asc' ? 1 : -1 })
                    .skip(skip)
                    .limit(limit)
                    .lean(),
                Payment.countDocuments(query)
            ]);

            // Format response
            const formattedPayments = payments.map(payment => ({
                id: payment._id.toString(),
                userId: payment.userRef._id.toString(),
                userName: `${payment.userRef.firstName} ${payment.userRef.lastName}`,
                userEmail: payment.userRef.email,
                contestId: payment.contestRef._id.toString(),
                contestTitle: payment.contestRef.title,
                amount: payment.amount * 0.01,
                status: payment.status,
                transactionId: payment.paymentId,
                paymentMethod: payment.paymentMethod || 'UPI',
                createdAt: payment.createdAt,
                completedAt: payment.status === 'paid' ? payment.updatedAt : null,
                failureReason: payment.description || null,
                metadata: {
                    ip: payment.metadata?.ip,
                    userAgent: payment.metadata?.userAgent
                }
            }));

            const responseData = {
                payments: formattedPayments,
                pagination: {
                    page,
                    limit,
                    total,
                    totalPages: Math.ceil(total / limit)
                }
            };

            // Cache the result
            await paymentStore.setPaymentsList(filters, pagination, sorting, responseData);

            res.json({
                success: true,
                data: responseData
            });

        } catch (error) {
            console.error('Get all payments error:', error);
            res.status(500).json({
                success: false,
                error: {
                    code: 'INTERNAL_SERVER_ERROR',
                    message: 'Failed to retrieve payments',
                    details: { timestamp: new Date().toISOString() }
                }
            });
        }
    }

    // 2. Get Single Payment
    export const getSinglePayment = async (req, res) => {
        try {
            const { paymentId } = req.params;

            if (!mongoose.Types.ObjectId.isValid(paymentId)) {
                return res.status(404).json({
                    success: false,
                    error: {
                        code: 'PAYMENT_NOT_FOUND',
                        message: `Payment with ID '${paymentId}' not found`,
                        details: { paymentId, timestamp: new Date().toISOString() }
                    }
                });
            }

            // Check Redis cache first
            const cachedPayment = await paymentStore.getPayment(paymentId);
            if (cachedPayment) {
                return res.json({
                    success: true,
                    data: { payment: cachedPayment },
                    cached: true
                });
            }

            const payment = await Payment.findOne({ 
                _id: paymentId, 
                isDeleted: false 
            })
            .populate('userRef', 'firstName lastName email registrationId')
            .populate('contestRef', 'title slug registerFee')
            .lean();

            if (!payment) {
                return res.status(404).json({
                    success: false,
                    error: {
                        code: 'PAYMENT_NOT_FOUND',
                        message: `Payment with ID '${paymentId}' not found`,
                        details: { paymentId, timestamp: new Date().toISOString() }
                    }
                });
            }

            const formattedPayment = {
                id: payment._id.toString(),
                userId: payment.userRef._id.toString(),
                userName: `${payment.userRef.firstName} ${payment.userRef.lastName}`,
                userEmail: payment.userRef.email,
                contestId: payment.contestRef._id.toString(),
                contestTitle: payment.contestRef.title,
                amount: payment.amount,
                status: payment.status,
                transactionId: payment.paymentId,
                paymentMethod: payment.paymentMethod || 'Credit Card',
                createdAt: payment.createdAt,
                completedAt: payment.status === 'completed' ? payment.updatedAt : null,
                fees: {
                    processingFee: payment.amount * 0.03, // 3% processing fee
                    platformFee: payment.amount * 0.05 // 5% platform fee
                },
                paymentProvider: {
                    name: payment.provider || 'Stripe',
                    transactionId: payment.paymentId,
                    fees: payment.amount * 0.03
                },
            };

            // Cache the result
            await paymentStore.setPayment(paymentId, formattedPayment);

            res.json({
                success: true,
                data: { payment: formattedPayment }
            });

        } catch (error) {
            console.error('Get single payment error:', error);
            res.status(500).json({
                success: false,
                error: {
                    code: 'INTERNAL_SERVER_ERROR',
                    message: 'Failed to retrieve payment',
                    details: { timestamp: new Date().toISOString() }
                }
            });
        }
    }

    // 3. Update Payment Status
    export const updatePaymentStatus = async (req, res) => {
        try {
            const { paymentId } = req.params;
            const validatedData = updatePaymentStatusSchema.parse(req.body);

            if (!mongoose.Types.ObjectId.isValid(paymentId)) {
                return res.status(404).json({
                    success: false,
                    error: {
                        code: 'PAYMENT_NOT_FOUND',
                        message: `Payment with ID '${paymentId}' not found`,
                        details: { paymentId, timestamp: new Date().toISOString() }
                    }
                });
            }

            const payment = await Payment.findOne({ 
                _id: paymentId, 
                isDeleted: false 
            });

            if (!payment) {
                return res.status(404).json({
                    success: false,
                    error: {
                        code: 'PAYMENT_NOT_FOUND',
                        message: `Payment with ID '${paymentId}' not found`,
                        details: { paymentId, timestamp: new Date().toISOString() }
                    }
                });
            }

            // Update payment
            const updatedPayment = await Payment.findByIdAndUpdate(
                paymentId,
                {
                    status: validatedData.status,
                    failureReason: validatedData.reason,
                    adminNote: validatedData.adminNote
                },
                { new: true }
            );

            // Clear caches
            await paymentStore.deletePayment(paymentId);
            await paymentStore.clearListCaches();
            await paymentStore.clearStatsCaches();

            res.json({
                success: true,
                data: {
                    payment: {
                        id: updatedPayment._id.toString(),
                        status: updatedPayment.status,
                        updatedAt: updatedPayment.updatedAt
                    }
                },
                message: 'Payment status updated successfully'
            });

        } catch (error) {
            console.error('Update payment status error:', error);
            res.status(500).json({
                success: false,
                error: {
                    code: 'INTERNAL_SERVER_ERROR',
                    message: 'Failed to update payment status',
                    details: { timestamp: new Date().toISOString() }
                }
            });
        }
    }

    // 4. Export Payments
    export const exportPayments = async (req, res) => {
        try {
            const validatedData = exportPaymentsSchema.parse(req.body);
            const { filters = {}, format, columns } = validatedData;

            // Build query similar to getAllPayments
            const query = { isDeleted: false };
            
            if (filters.status && filters.status !== 'all') {
                query.status = filters.status;
            }
            
            if (filters.contestId && filters.contestId !== 'all') {
                query.contestRef = new mongoose.Types.ObjectId(filters.contestId);
            }
            
            if (filters.dateRange) {
                query.createdAt = {
                    $gte: new Date(filters.dateRange.startDate),
                    $lte: new Date(filters.dateRange.endDate + 'T23:59:59.999Z')
                };
            }

            const payments = await Payment.find(query)
                .populate('userRef', 'firstName lastName email registrationId')
                .populate('contestRef', 'title slug registerFee')
                .lean();

            // For demo purposes, return a mock export URL
            const filename = `payments-${new Date().toISOString().split('T')[0]}.${format}`;
            const exportUrl = `https://cdn.example.com/exports/${filename}`;

            res.json({
                success: true,
                data: {
                    exportUrl,
                    filename,
                    expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
                    recordCount: payments.length
                }
            });

        } catch (error) {
            console.error('Export payments error:', error);
            res.status(500).json({
                success: false,
                error: {
                    code: 'INTERNAL_SERVER_ERROR',
                    message: 'Failed to export payments',
                    details: { timestamp: new Date().toISOString() }
                }
            });
        }
    }

    // 5. Get Payment Statistics
    export const getPaymentStatistics = async (req, res) => {
        try {
            const validatedData = paymentStatsSchema.parse(req.body);
            const { dateRange, groupBy } = validatedData;

            // Check Redis cache first
            const cachedStats = await paymentStore.getPaymentStats(dateRange, groupBy);
            if (cachedStats) {
                return res.json({
                    success: true,
                    data: cachedStats,
                    cached: true
                });
            }

            const query = {
                isDeleted: false,
                createdAt: {
                    $gte: new Date(dateRange.startDate),
                    $lte: new Date(dateRange.endDate + 'T23:59:59.999Z')
                }
            };

            // Aggregate statistics
            const [summaryStats, breakdownStats, topContests, paymentMethods] = await Promise.all([
                // Summary statistics
                Payment.aggregate([
                    { $match: query },
                    {
                        $group: {
                            _id: null,
                            totalRevenue: { $sum: { $cond: [{ $eq: ['$status', 'completed'] }, '$amount', 0] } },
                            totalTransactions: { $sum: 1 },
                            completedTransactions: { $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] } },
                            pendingTransactions: { $sum: { $cond: [{ $eq: ['$status', 'pending'] }, 1, 0] } },
                            failedTransactions: { $sum: { $cond: [{ $eq: ['$status', 'failed'] }, 1, 0] } },
                            refundedTransactions: { $sum: { $cond: [{ $eq: ['$status', 'refunded'] }, 1, 0] } },
                            averageTransaction: { $avg: { $cond: [{ $eq: ['$status', 'completed'] }, '$amount', null] } },
                        }
                    }
                ]),
                
                // Daily breakdown
                Payment.aggregate([
                    { $match: query },
                    {
                        $group: {
                            _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
                            revenue: { $sum: { $cond: [{ $eq: ['$status', 'completed'] }, '$amount', 0] } },
                            transactions: { $sum: 1 },
                            completed: { $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] } }
                        }
                    },
                    {
                        $project: {
                            date: '$_id',
                            revenue: 1,
                            transactions: 1,
                            successRate: { $multiply: [{ $divide: ['$completed', '$transactions'] }, 100] }
                        }
                    },
                    { $sort: { date: 1 } }
                ]),
                
                // Top contests
                Payment.aggregate([
                    { $match: { ...query, status: 'completed' } },
                    { $lookup: { from: 'contests', localField: 'contestRef', foreignField: '_id', as: 'contest' } },
                    { $unwind: '$contest' },
                    {
                        $group: {
                            _id: '$contestRef',
                            contestTitle: { $first: '$contest.title' },
                            revenue: { $sum: '$amount' },
                            transactions: { $sum: 1 }
                        }
                    },
                    { $sort: { revenue: -1 } },
                    { $limit: 5 },
                    {
                        $project: {
                            contestId: { $toString: '$_id' },
                            contestTitle: 1,
                            revenue: 1,
                            transactions: 1
                        }
                    }
                ]),
                
                // Payment methods (mock data since not in schema)
                [
                    { method: 'Credit Card', count: 30, revenue: 750.00, percentage: 60.0 },
                    { method: 'PayPal', count: 15, revenue: 375.00, percentage: 30.0 },
                    { method: 'Bank Transfer', count: 5, revenue: 125.00, percentage: 10.0 }
                ]
            ]);

            const summary = summaryStats[0] || {
                totalRevenue: 0,
                totalTransactions: 0,
                completedTransactions: 0,
                pendingTransactions: 0,
                failedTransactions: 0,
                refundedTransactions: 0,
                averageTransaction: 0,
            };

            summary.successRate = summary.totalTransactions > 0 
                ? (summary.completedTransactions / summary.totalTransactions * 100)
                : 0;

            const responseData = {
                summary,
                breakdown: breakdownStats,
                topContests,
                paymentMethods
            };

            // Cache the result
            await paymentStore.setPaymentStats(dateRange, groupBy, responseData);

            res.json({
                success: true,
                data: responseData
            });

        } catch (error) {
            console.error('Get payment statistics error:', error);
            res.status(500).json({
                success: false,
                error: {
                    code: 'INTERNAL_SERVER_ERROR',
                    message: 'Failed to retrieve payment statistics',
                    details: { timestamp: new Date().toISOString() }
                }
            });
        }
    }

    // 6. Get Contests
    export const getContests = async (req, res) => {
        try {
            const { active, limit = 100 } = req.query;
            
            const query = { isDeleted: false };
            if (active === 'true') {
                query.deadline = { $gt: new Date() };
            }

            const contests = await Contest.find(query)
                .select('title slug registerFee startTime deadline')
                .limit(parseInt(limit))
                .lean();

            const formattedContests = contests.map(contest => ({
                id: contest._id.toString(),
                title: contest.title,
                status: new Date(contest.deadline) > new Date() ? 'active' : 'completed',
                entryFee: contest.registerFee,
                participants: contest.participants?.length || 0,
                createdAt: contest.createdAt
            }));

            res.json({
                success: true,
                data: { contests: formattedContests }
            });

        } catch (error) {
            console.error('Get contests error:', error);
            res.status(500).json({
                success: false,
                error: {
                    code: 'INTERNAL_SERVER_ERROR',
                    message: 'Failed to retrieve contests',
                    details: { timestamp: new Date().toISOString() }
                }
            });
        }
    }


    // 7. Get Payment Analytics
    export const getPaymentAnalytics = async (req, res) => {
        try {
            const { period = '30d', metrics } = req.query;
            
            // Parse metrics if provided (comma-separated list)
            const requestedMetrics = metrics ? metrics.split(',') : [
                'revenue', 'transactions', 'successRate', 'averageOrderValue', 
                'churnRate', 'conversionRate', 'refundRate'
            ];
            
            // Check Redis cache first
            const cacheKey = `analytics:${period}:${requestedMetrics.join(',')}`;
            const cachedAnalytics = await paymentStore.getPaymentStats({ period }, 'analytics');
            if (cachedAnalytics) {
                return res.json({
                    success: true,
                    data: cachedAnalytics,
                    cached: true
                });
            }

            // Calculate date range based on period
            const now = new Date();
            let startDate, groupFormat, previousPeriodDays;
            
            switch (period) {
                case '7d':
                    startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
                    groupFormat = '%Y-%m-%d';
                    previousPeriodDays = 7;
                    break;
                case '30d':
                    startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
                    groupFormat = '%Y-%m-%d';
                    previousPeriodDays = 30;
                    break;
                case '90d':
                    startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
                    groupFormat = '%Y-%U'; // Group by week
                    previousPeriodDays = 90;
                    break;
                case '1y':
                    startDate = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
                    groupFormat = '%Y-%m'; // Group by month
                    previousPeriodDays = 365;
                    break;
                default:
                    startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
                    groupFormat = '%Y-%m-%d';
                    previousPeriodDays = 30;
            }

            const query = {
                isDeleted: false,
                createdAt: { $gte: startDate, $lte: now }
            };

            // Calculate previous period for comparison
            const previousPeriodStart = new Date(startDate.getTime() - (previousPeriodDays * 24 * 60 * 60 * 1000));
            const previousQuery = {
                isDeleted: false,
                createdAt: { $gte: previousPeriodStart, $lt: startDate }
            };

            // Advanced trends aggregation with multiple metrics
            const trendsAggregation = [
                { $match: query },
                {
                    $group: {
                        _id: { $dateToString: { format: groupFormat, date: '$createdAt' } },
                        revenue: { $sum: { $cond: [{ $eq: ['$status', 'completed'] }, '$amount', 0] } },
                        totalAmount: { $sum: '$amount' }, // For calculating potential revenue
                        transactions: { $sum: 1 },
                        completed: { $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] } },
                        failed: { $sum: { $cond: [{ $eq: ['$status', 'failed'] }, 1, 0] } },
                        refunded: { $sum: { $cond: [{ $eq: ['$status', 'refunded'] }, 1, 0] } },
                        refundedAmount: { $sum: { $cond: [{ $eq: ['$status', 'refunded'] }, '$amount', 0] } },
                        uniqueUsers: { $addToSet: '$userRef' }, // For user metrics
                        averageAmount: { $avg: { $cond: [{ $eq: ['$status', 'completed'] }, '$amount', null] } }
                    }
                },
                {
                    $project: {
                        date: '$_id',
                        revenue: 1,
                        totalAmount: 1,
                        transactions: 1,
                        completed: 1,
                        failed: 1,
                        refunded: 1,
                        refundedAmount: 1,
                        uniqueUsers: { $size: '$uniqueUsers' },
                        averageAmount: { $ifNull: ['$averageAmount', 0] },
                        successRate: { 
                            $multiply: [
                                { $divide: ['$completed', { $max: ['$transactions', 1] }] }, 
                                100
                            ] 
                        },
                        failureRate: { 
                            $multiply: [
                                { $divide: ['$failed', { $max: ['$transactions', 1] }] }, 
                                100
                            ] 
                        },
                        refundRate: { 
                            $multiply: [
                                { $divide: ['$refunded', { $max: ['$transactions', 1] }] }, 
                                100
                            ] 
                        },
                        conversionRate: {
                            $multiply: [
                                { $divide: ['$completed', { $max: ['$transactions', 1] }] }, 
                                100
                            ]
                        }
                    }
                },
                { $sort: { date: 1 } }
            ];

            // Parallel execution of multiple aggregations
            const [
                trendsData, 
                currentPeriodStats, 
                previousPeriodStats,
                paymentMethodStats,
                hourlyDistribution,
                topPerformingContests,
                userSegmentAnalysis
            ] = await Promise.all([
                Payment.aggregate(trendsAggregation),
                
                // Current period comprehensive stats
                Payment.aggregate([
                    { $match: query },
                    {
                        $group: {
                            _id: null,
                            totalRevenue: { $sum: { $cond: [{ $eq: ['$status', 'completed'] }, '$amount', 0] } },
                            totalTransactions: { $sum: 1 },
                            completedTransactions: { $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] } },
                            failedTransactions: { $sum: { $cond: [{ $eq: ['$status', 'failed'] }, 1, 0] } },
                            refundedTransactions: { $sum: { $cond: [{ $eq: ['$status', 'refunded'] }, 1, 0] } },
                            refundedAmount: { $sum: { $cond: [{ $eq: ['$status', 'refunded'] }, '$amount', 0] } },
                            averageOrderValue: { $avg: { $cond: [{ $eq: ['$status', 'completed'] }, '$amount', null] } },
                            uniqueUsers: { $addToSet: '$userRef' },
                            uniqueContests: { $addToSet: '$contestRef' },
                            totalPotentialRevenue: { $sum: '$amount' }
                        }
                    },
                    {
                        $project: {
                            totalRevenue: 1,
                            totalTransactions: 1,
                            completedTransactions: 1,
                            failedTransactions: 1,
                            refundedTransactions: 1,
                            refundedAmount: 1,
                            averageOrderValue: { $ifNull: ['$averageOrderValue', 0] },
                            uniqueUsers: { $size: '$uniqueUsers' },
                            uniqueContests: { $size: '$uniqueContests' },
                            totalPotentialRevenue: 1,
                            successRate: { 
                                $multiply: [
                                    { $divide: ['$completedTransactions', { $max: ['$totalTransactions', 1] }] }, 
                                    100
                                ] 
                            },
                            refundRate: { 
                                $multiply: [
                                    { $divide: ['$refundedTransactions', { $max: ['$totalTransactions', 1] }] }, 
                                    100
                                ] 
                            },
                            conversionEfficiency: {
                                $multiply: [
                                    { $divide: ['$totalRevenue', { $max: ['$totalPotentialRevenue', 1] }] }, 
                                    100
                                ]
                            }
                        }
                    }
                ]),
                
                // Previous period stats for comparison
                Payment.aggregate([
                    { $match: previousQuery },
                    {
                        $group: {
                            _id: null,
                            revenue: { $sum: { $cond: [{ $eq: ['$status', 'completed'] }, '$amount', 0] } },
                            transactions: { $sum: 1 },
                            completed: { $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] } },
                            uniqueUsers: { $addToSet: '$userRef' },
                            averageOrderValue: { $avg: { $cond: [{ $eq: ['$status', 'completed'] }, '$amount', null] } }
                        }
                    },
                    {
                        $project: {
                            revenue: 1,
                            transactions: 1,
                            completed: 1,
                            uniqueUsers: { $size: '$uniqueUsers' },
                            averageOrderValue: { $ifNull: ['$averageOrderValue', 0] },
                            successRate: { 
                                $multiply: [
                                    { $divide: ['$completed', { $max: ['$transactions', 1] }] }, 
                                    100
                                ] 
                            }
                        }
                    }
                ]),
                
                // Payment method performance
                Payment.aggregate([
                    { $match: query },
                    {
                        $group: {
                            _id: '$paymentMethod',
                            count: { $sum: 1 },
                            revenue: { $sum: { $cond: [{ $eq: ['$status', 'completed'] }, '$amount', 0] } },
                            successRate: { 
                                $avg: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] }
                            }
                        }
                    },
                    {
                        $project: {
                            method: '$_id',
                            count: 1,
                            revenue: 1,
                            successRate: { $multiply: ['$successRate', 100] }
                        }
                    },
                    { $sort: { revenue: -1 } }
                ]),
                
                // Hourly distribution for pattern analysis
                Payment.aggregate([
                    { $match: query },
                    {
                        $group: {
                            _id: { $hour: '$createdAt' },
                            count: { $sum: 1 },
                            revenue: { $sum: { $cond: [{ $eq: ['$status', 'completed'] }, '$amount', 0] } },
                            successRate: { 
                                $avg: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] }
                            }
                        }
                    },
                    {
                        $project: {
                            hour: '$_id',
                            count: 1,
                            revenue: 1,
                            successRate: { $multiply: ['$successRate', 100] }
                        }
                    },
                    { $sort: { hour: 1 } }
                ]),
                
                // Top performing contests
                Payment.aggregate([
                    { $match: { ...query, status: 'completed' } },
                    { $lookup: { from: 'contests', localField: 'contestRef', foreignField: '_id', as: 'contest' } },
                    { $unwind: '$contest' },
                    {
                        $group: {
                            _id: '$contestRef',
                            contestTitle: { $first: '$contest.title' },
                            revenue: { $sum: '$amount' },
                            transactions: { $sum: 1 },
                            uniqueParticipants: { $addToSet: '$userRef' },
                            averageOrderValue: { $avg: '$amount' }
                        }
                    },
                    {
                        $project: {
                            contestId: { $toString: '$_id' },
                            contestTitle: 1,
                            revenue: 1,
                            transactions: 1,
                            uniqueParticipants: { $size: '$uniqueParticipants' },
                            averageOrderValue: 1,
                            revenuePerParticipant: { 
                                $divide: ['$revenue', { $size: '$uniqueParticipants' }] 
                            }
                        }
                    },
                    { $sort: { revenue: -1 } },
                    { $limit: 10 }
                ]),
                
                // User segment analysis
                Payment.aggregate([
                    { $match: query },
                    {
                        $group: {
                            _id: '$userRef',
                            totalSpent: { $sum: { $cond: [{ $eq: ['$status', 'completed'] }, '$amount', 0] } },
                            transactionCount: { $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] } },
                            firstPurchase: { $min: '$createdAt' },
                            lastPurchase: { $max: '$createdAt' }
                        }
                    },
                    {
                        $bucket: {
                            groupBy: '$totalSpent',
                            boundaries: [0, 50, 200, 500, 1000, 5000],
                            default: '5000+',
                            output: {
                                count: { $sum: 1 },
                                averageSpent: { $avg: '$totalSpent' },
                                averageTransactions: { $avg: '$transactionCount' }
                            }
                        }
                    }
                ])
            ]);

            // Process results
            const current = currentPeriodStats[0] || {
                totalRevenue: 0, totalTransactions: 0, completedTransactions: 0,
                failedTransactions: 0, refundedTransactions: 0, refundedAmount: 0,
                averageOrderValue: 0, uniqueUsers: 0, uniqueContests: 0,
                successRate: 0, refundRate: 0, conversionEfficiency: 0
            };

            const previous = previousPeriodStats[0] || {
                revenue: 0, transactions: 0, completed: 0, uniqueUsers: 0,
                averageOrderValue: 0, successRate: 0
            };

            // Calculate percentage changes with proper handling of zero values
            const calculateChange = (current, previous) => {
                if (previous === 0) return current > 0 ? '+100%' : '0%';
                const change = ((current - previous) / previous * 100).toFixed(1);
                return change >= 0 ? `+${change}%` : `${change}%`;
            };

            // Build comprehensive trends object
            const trends = {};
            requestedMetrics.forEach(metric => {
                switch (metric) {
                    case 'revenue':
                        trends.revenue = trendsData.map(item => ({ 
                            date: item.date, 
                            value: item.revenue || 0 
                        }));
                        break;
                    case 'transactions':
                        trends.transactions = trendsData.map(item => ({ 
                            date: item.date, 
                            value: item.transactions || 0 
                        }));
                        break;
                    case 'successRate':
                        trends.successRate = trendsData.map(item => ({ 
                            date: item.date, 
                            value: item.successRate || 0 
                        }));
                        break;
                    case 'averageOrderValue':
                        trends.averageOrderValue = trendsData.map(item => ({ 
                            date: item.date, 
                            value: item.averageAmount || 0 
                        }));
                        break;
                    case 'refundRate':
                        trends.refundRate = trendsData.map(item => ({ 
                            date: item.date, 
                            value: item.refundRate || 0 
                        }));
                        break;
                    case 'conversionRate':
                        trends.conversionRate = trendsData.map(item => ({ 
                            date: item.date, 
                            value: item.conversionRate || 0 
                        }));
                        break;
                    case 'uniqueUsers':
                        trends.uniqueUsers = trendsData.map(item => ({ 
                            date: item.date, 
                            value: item.uniqueUsers || 0 
                        }));
                        break;
                }
            });

            // Advanced forecasting based on trend analysis
            const revenueValues = trends.revenue?.map(item => item.value) || [];
            const lastWeekAvg = revenueValues.slice(-7).reduce((a, b) => a + b, 0) / Math.max(revenueValues.slice(-7).length, 1);
            const trendGrowth = revenueValues.length >= 14 
                ? (lastWeekAvg - (revenueValues.slice(-14, -7).reduce((a, b) => a + b, 0) / 7)) / lastWeekAvg
                : 0.1;

            const responseData = {
                summary: {
                    totalRevenue: current.totalRevenue,
                    totalTransactions: current.totalTransactions,
                    successRate: current.successRate,
                    averageOrderValue: current.averageOrderValue,
                    uniqueUsers: current.uniqueUsers,
                    uniqueContests: current.uniqueContests,
                    refundRate: current.refundRate,
                    conversionEfficiency: current.conversionEfficiency
                },
                trends,
                comparisons: {
                    previousPeriod: {
                        revenue: previous.revenue,
                        revenueChange: calculateChange(current.totalRevenue, previous.revenue),
                        transactions: previous.transactions,
                        transactionChange: calculateChange(current.totalTransactions, previous.transactions),
                        successRate: previous.successRate,
                        successRateChange: calculateChange(current.successRate, previous.successRate),
                        averageOrderValue: previous.averageOrderValue,
                        aovChange: calculateChange(current.averageOrderValue, previous.averageOrderValue),
                        uniqueUsers: previous.uniqueUsers,
                        userGrowth: calculateChange(current.uniqueUsers, previous.uniqueUsers)
                    }
                },
                forecasts: {
                    nextMonth: {
                        estimatedRevenue: Math.max(current.totalRevenue * (1 + trendGrowth), 0),
                        confidence: Math.min(0.95, Math.max(0.5, 0.8 - Math.abs(trendGrowth))),
                        trendDirection: trendGrowth > 0.05 ? 'growing' : trendGrowth < -0.05 ? 'declining' : 'stable',
                        factors: {
                            seasonality: 'normal',
                            marketTrend: trendGrowth > 0 ? 'positive' : 'neutral',
                            riskLevel: Math.abs(trendGrowth) > 0.2 ? 'high' : 'low'
                        }
                    }
                },
                insights: {
                    paymentMethods: paymentMethodStats,
                    hourlyDistribution,
                    topPerformingContests,
                    userSegments: userSegmentAnalysis,
                    keyMetrics: {
                        peakHour: hourlyDistribution.reduce((max, hour) => 
                            hour.revenue > (max?.revenue || 0) ? hour : max, null
                        )?.hour,
                        topPaymentMethod: paymentMethodStats[0]?.method,
                        averageTransactionSize: current.averageOrderValue,
                        customerRetentionIndicator: current.uniqueUsers > 0 
                            ? (current.totalTransactions / current.uniqueUsers).toFixed(2)
                            : 0
                    }
                },
                metadata: {
                    period,
                    dateRange: {
                        start: startDate.toISOString(),
                        end: now.toISOString()
                    },
                    dataPoints: trendsData.length,
                    generatedAt: new Date().toISOString(),
                    requestedMetrics
                }
            };

            // Cache the comprehensive result
            await paymentStore.setPaymentStats({ period }, 'analytics', responseData, 1800); // 30 minutes cache

            res.json({
                success: true,
                data: responseData
            });

        } catch (error) {
            console.error('Get payment analytics error:', error);
            res.status(500).json({
                success: false,
                error: {
                    code: 'INTERNAL_SERVER_ERROR',
                    message: 'Failed to retrieve payment analytics',
                    details: { timestamp: new Date().toISOString() }
                }
            });
        }
    }

    // 8. Webhook Handler
    export const handleWebhook = async (req, res) => {
        try {
            const signature = req.headers['x-webhook-signature'];
            const source = req.headers['x-webhook-source'];

            // Validate webhook signature (implementation depends on provider)
            if (!signature) {
                return res.status(401).json({
                    success: false,
                    error: {
                        code: 'MISSING_SIGNATURE',
                        message: 'Webhook signature is required'
                    }
                });
            }

            const validatedData = webhookPaymentSchema.parse(req.body);
            const { event, data } = validatedData;

            // Find the payment
            const payment = await Payment.findOne({ 
                paymentId: data.paymentId,
                isDeleted: false 
            });

            if (!payment) {
                return res.status(404).json({
                    success: false,
                    error: {
                        code: 'PAYMENT_NOT_FOUND',
                        message: `Payment with transaction ID '${data.paymentId}' not found`
                    }
                });
            }

            // Handle different webhook events
            switch (event) {
                case 'payment.completed':
                    await Payment.findByIdAndUpdate(payment._id, {
                        status: 'completed',
                        completedAt: new Date(data.timestamp)
                    });
                    break;

                case 'payment.failed':
                    await Payment.findByIdAndUpdate(payment._id, {
                        status: 'failed',
                        failureReason: data.failureReason || 'Payment processing failed'
                    });
                    break;
            }

            // Clear caches
            await paymentStore.deletePayment(payment._id.toString());
            await paymentStore.clearListCaches();
            await paymentStore.clearStatsCaches();

            res.json({
                success: true,
                message: 'Webhook processed successfully'
            });

        } catch (error) {
            console.error('Webhook handler error:', error);
            res.status(500).json({
                success: false,
                error: {
                    code: 'WEBHOOK_PROCESSING_ERROR',
                    message: 'Failed to process webhook'
                }
            });
        }
    }

