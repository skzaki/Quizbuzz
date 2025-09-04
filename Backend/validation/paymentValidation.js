// validation/paymentValidation.js
import { z } from 'zod';

// Payment filters validation
export const paymentFiltersSchema = z.object({
    status: z.enum(['paid', 'pending', 'failed', 'refunded', 'all']).optional(),
    contestId: z.string().optional(),
    userId: z.string().optional(),
    dateRange: z.object({
        startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be in YYYY-MM-DD format"),
        endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be in YYYY-MM-DD format")
    }).optional(),
    searchTerm: z.string().optional(),
    paymentMethod: z.enum(['Credit Card', 'PayPal', 'Bank Transfer', 'all']).optional()
});

// Pagination validation
export const paginationSchema = z.object({
    page: z.number().int().min(1).default(1),
    limit: z.number().int().min(1).max(100).default(50)
});

// Sorting validation
export const sortingSchema = z.object({
    field: z.enum(['createdAt', 'amount', 'status']).default('createdAt'),
    order: z.enum(['asc', 'desc']).default('desc')
});

// Get all payments request validation
export const getAllPaymentsSchema = z.object({
    filters: paymentFiltersSchema.optional(),
    pagination: paginationSchema.optional(),
    sorting: sortingSchema.optional()
});

// Refund payment validation
export const refundPaymentSchema = z.object({
    amount: z.number().positive("Amount must be positive"),
    reason: z.enum(['Customer request', 'Contest cancelled', 'Technical issue']),
    refundType: z.enum(['full', 'partial']),
    notifyUser: z.boolean().default(true)
});

// Update payment status validation
export const updatePaymentStatusSchema = z.object({
    status: z.enum(['completed', 'failed', 'pending', 'refunded']),
    reason: z.string().optional(),
    adminNote: z.string().optional()
});

// Export payments validation
export const exportPaymentsSchema = z.object({
    filters: paymentFiltersSchema.optional(),
    format: z.enum(['csv', 'xlsx', 'pdf']).default('csv'),
    columns: z.array(z.enum([
        'transactionId', 'userName', 'userEmail', 'contestTitle', 
        'amount', 'status', 'createdAt', 'paymentMethod'
    ])).min(1, "At least one column must be selected")
});

// Payment statistics validation
export const paymentStatsSchema = z.object({
    dateRange: z.object({
        startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be in YYYY-MM-DD format"),
        endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be in YYYY-MM-DD format")
    }),
    groupBy: z.enum(['day', 'week', 'month', 'contest', 'status']).default('day')
});

// Webhook validation
export const webhookPaymentSchema = z.object({
    event: z.enum(['payment.completed', 'payment.failed', 'refund.completed']),
    data: z.object({
        paymentId: z.string().min(1, "Payment ID is required"),
        transactionId: z.string().min(1, "Transaction ID is required"),
        status: z.string().min(1, "Status is required"),
        amount: z.number().positive("Amount must be positive"),
        timestamp: z.string().datetime("Invalid timestamp format")
    })
});
