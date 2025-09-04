import { z } from 'zod';

// Schema for issuing certificates
export const issueCertificateSchema = z.object({
    participantIds: z.array(z.string().regex(/^[0-9a-fA-F]{24}$/, "Invalid participant ID format"))
        .optional(),
    certificateType: z.enum(["completion", "participation", "achievement", "winner"])
        .default("completion"),
    customMessage: z.string()
        .max(500, "Custom message must be less than 500 characters")
        .optional(),
    minScore: z.number()
        .min(0, "Minimum score must be non-negative")
        .default(0),
    issueToAll: z.boolean()
        .default(false)
}).superRefine((data, ctx) => {
    // Either participantIds should be provided or issueToAll should be true
    if (!data.issueToAll && (!data.participantIds || data.participantIds.length === 0)) {
        ctx.addIssue({
            path: ["participantIds"],
            code: z.ZodIssueCode.custom,
            message: "Either provide participant IDs or set issueToAll to true"
        });
    }
    
    // If issueToAll is false, participantIds must be provided
    if (!data.issueToAll && data.participantIds && data.participantIds.length > 100) {
        ctx.addIssue({
            path: ["participantIds"],
            code: z.ZodIssueCode.custom,
            message: "Cannot issue certificates to more than 100 participants at once"
        });
    }
});

// Schema for exporting participants
export const exportParticipantsSchema = z.object({
    format: z.enum(["csv", "json", "xlsx"])
        .default("csv"),
    fields: z.enum(["all", "basic", "detailed"])
        .default("all"),
    includeScores: z.boolean()
        .default(true),
    includeCertificates: z.boolean()
        .default(true)
});

// Schema for participant query parameters
export const participantsQuerySchema = z.object({
    page: z.coerce.number().int().positive().default(1),
    limit: z.coerce.number().int().positive().max(100).default(20),
    search: z.string().optional(),
    status: z.enum(["all", "registered", "completed", "withdrawn", "incomplete"])
        .default("all"),
    sortBy: z.enum(["registeredAt", "username", "email", "score", "name"])
        .default("registeredAt"),
    sortOrder: z.enum(["asc", "desc"])
        .default("desc")
});

// Email notification schema
export const emailNotificationSchema = z.object({
    participantIds: z.array(z.string().regex(/^[0-9a-fA-F]{24}$/, "Invalid participant ID format"))
        .min(1, "At least one participant ID is required")
        .max(100, "Cannot send emails to more than 100 participants at once"),
    subject: z.string().min(1, "Subject is required").max(200, "Subject must be less than 200 characters"),
    message: z.string().min(1, "Message is required").max(2000, "Message must be less than 2000 characters"),
    template: z.enum(["general", "reminder", "certificate", "results"]).optional(),
    scheduledAt: z.date().optional(),
    attachments: z.array(z.object({
        filename: z.string(),
        url: z.string().url()
    })).optional()
});

// Contest analytics schema for participants
export const participantAnalyticsSchema = z.object({
    timeRange: z.enum(["24h", "7d", "30d", "90d", "1y", "all"]).default("30d"),
    groupBy: z.enum(["day", "week", "month", "country", "status"]).default("day"),
    metrics: z.array(z.enum(["registrations", "completions", "scores", "certificates"]))
        .default(["registrations", "completions"])
});

// Participant status update schema
export const updateParticipantStatusSchema = z.object({
    participantIds: z.array(z.string().regex(/^[0-9a-fA-F]{24}$/, "Invalid participant ID format"))
        .min(1, "At least one participant ID is required")
        .max(50, "Cannot update more than 50 participants at once"),
    status: z.enum(["registered", "completed", "withdrawn", "disqualified"]),
    reason: z.string().max(200, "Reason must be less than 200 characters").optional()
});


// Response schemas for API documentation
export const participantResponseSchema = z.object({
    id: z.string(),
    username: z.string(),
    email: z.string().email(),
    name: z.string(),
    profilePicture: z.string().optional(),
    country: z.string().optional(),
    registeredAt: z.string(),
    score: z.number(),
    status: z.string(),
    certificate: z.object({
        issued: z.boolean(),
        issuedAt: z.string().optional(),
        certificateUrl: z.string().optional()
    }),
    rank: z.number().nullable()
});

export const participantsListResponseSchema = z.object({
    success: z.literal(true),
    data: z.object({
        contest: z.object({
            id: z.string(),
            title: z.string(),
            totalParticipants: z.number()
        }),
        participants: z.array(participantResponseSchema),
        pagination: z.object({
            currentPage: z.number(),
            totalPages: z.number(),
            totalItems: z.number(),
            itemsPerPage: z.number(),
            hasNextPage: z.boolean(),
            hasPreviousPage: z.boolean()
        }),
        summary: z.object({
            total: z.number(),
            registered: z.number(),
            completed: z.number(),
            averageScore: z.number()
        })
    }),
    message: z.string()
});