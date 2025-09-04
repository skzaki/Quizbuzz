import { z } from "zod";

export  const validateCredentialsSchema = z.object({
  registrationId: z.string().min(1, "Registration ID is required"),
  phone: z.string().regex(/^\d{10}$/, "Phone must be 10 digits"),
  slug: z.string().min(1, "Slug is required"),
});


// Prize Schema 
const prizeSchema = z.object({
    rankFrom: z.number().int().positive("Rank <from> must be a positive integer"),
    rankTo: z.number().int().positive("Rank <to> must be a positive integer"),
    amount: z.number().positive("Amount must be positive"),
    currency: z.string().default('INR'),
    benefits: z.array(z.string()).optional().default([])
}).superRefine( (data, ctx) => {
    if (data.rankFrom > data.rankTo) {
        ctx.addIssue({
            path: ['rankTo'],
            code: z.ZodIssueCode.custom,
            message: "Rank <to> must be greater than or equal ro rank <from>"
        });
    }
});

// Contest creation schema
export const contestSchema = z.object({
    title: z.string().min(1, "Title is required").max(200, "Title must be less than 200 charactoe"),
    description: z.string().min(1, "Description is required").max(1000, "Description must be less than 1000 charactors"),
    details: z.string().optional(),
    topics: z.array(z.string().min(1, "Topic cannot be empty")).min(1, "At least one topic is required"),
    rules: z.array(z.string().min(1, "Rule cannot be empty")).min(1, "At least one rule is required"),
    registrationFee: z.number().min(0, "Registration fee must be non-negative"),
    duration: z.number().int().positive("Duration must be a positive integer (in minutes)"),
    cutoff: z.number().min(0, "Cut off must be non-negative").optional(),
    startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Start date must be in YYYY-MM-DD format"),
    startTime: z.string().regex(/^\d{2}:\d{2}$/, "Start time must be in HH:MM format"),
    maxParticipants: z.number().int().positive("Max participants must be positive integer"),
    prizes: z.array(prizeSchema).min(1, "At least one prize must be defined"),
    status: z.enum(["draft", "upcoming", "ongoing", "completed", "cancelled"]).default("draft")
}).superRefine( (data, ctx) => {
    // Validate start date is not in past
    if(data.status !== "draft") {
        const startDateTime = new Date(`${data.startDate} ${data.startTime}`);
        const now = new Date();
        if(startDateTime <= now) {
            ctx.addIssue({
                path:["startDate"],
                code: z.ZodIssueCode.custom,
                message: "Start date and time cannot be in the past fro published contetss"
            });
        }
    }

    // Validate prize ranks don;t overlap
    const sortedPrizes = [...data.prizes].sort((a,b) => a.rankFrom - b.rankFrom);
    for (let i = 1; i < sortedPrizes.length; i++) {
        if(sortedPrizes[i].rankFrom <= sortedPrizes[i - 1].rankTo) {
            ctx.addIssue({
                path:["prizes"],
                code: z.ZodIssueCode.custom,
                message: "Prize ranks cannot overlap"
            })
        }
    }
})

// Contest update schema (all fields optional)
export const updateContestSchema = z.object({
    title: z.string().min(1, "Title is required").max(200, "Title must be less than 200 characters").optional(),
    description: z.string().min(1, "Description is required").max(1000, "Description must be less than 1000 characters").optional(),
    details: z.string().optional(),
    topics: z.array(z.string().min(1, "Topic cannot be empty")).min(1, "At least one topic is required").optional(),
    rules: z.array(z.string().min(1, "Rule cannot be empty")).min(1, "At least one rule is required").optional(),
    registrationFee: z.number().min(0, "Registration fee must be non-negative").optional(),
    duration: z.number().int().positive("Duration must be a positive integer (in minutes)").optional(),
    cutOff: z.number().min(0, "Cut off must be non-negative").optional(),
    startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Start date must be in YYYY-MM-DD format").optional(),
    startTime: z.string().regex(/^\d{2}:\d{2}$/, "Start time must be in HH:MM format").optional(),
    maxParticipants: z.number().int().positive("Max participants must be a positive integer").optional(),
    prizes: z.array(prizeSchema).min(1, "At least one prize must be defined").optional()
}).superRefine((data, ctx) => {
    // If both startDate and startTime are provided, validate they're not in the past
    if (data.startDate && data.startTime) {
        const startDateTime = new Date(`${data.startDate} ${data.startTime}`);
        const now = new Date();
        if (startDateTime <= now) {
            ctx.addIssue({
                path: ["startDate"],
                code: z.ZodIssueCode.custom,
                message: "Start date and time cannot be in the past"
            });
        }
    }

    // Validate prize ranks if prizes are provided
    if (data.prizes) {
        const sortedPrizes = [...data.prizes].sort((a, b) => a.rankFrom - b.rankFrom);
        for (let i = 1; i < sortedPrizes.length; i++) {
            if (sortedPrizes[i].rankFrom <= sortedPrizes[i - 1].rankTo) {
                ctx.addIssue({
                    path: ["prizes"],
                    code: z.ZodIssueCode.custom,
                    message: "Prize ranks cannot overlap"
                });
                break;
            }
        }
    }
});

// Contest status update schema
export const contestStatusUpdateSchema = z.object({
    status: z.enum(["draft", "upcoming", "ongoing", "completed", "cancelled"])
});

// Bulk operations schemas
export const bulkStatusUpdateSchema = z.object({
    contestIds: z.array(z.string().regex(/^[0-9a-fA-F]{24}$/, "Invalid contest ID format"))
        .min(1, "At least one contest ID is required")
        .max(50, "Cannot update more than 50 contests at once"),
    status: z.enum(["draft", "upcoming", "ongoing", "completed", "cancelled"])
});

export const bulkDeleteSchema = z.object({
    contestIds: z.array(z.string().regex(/^[0-9a-fA-F]{24}$/, "Invalid contest ID format"))
        .min(1, "At least one contest ID is required")
        .max(50, "Cannot delete more than 50 contests at once")
});

export const questionsSchema = z.object({
    questionText: z.string().min(1, "Question text is required"),
    options: z.array(z.string().min(1, "Option cannot be empty")).min(1, "At least one option is required"),
    correctOptionIndex: z.number().int().nonnegative("Must be 0 or a positive integer"),
    correctOptionText: z.string().min(1, "Correct option text is required"),
    difficulty: z.enum(["easy", "medium", "hard"]), 
    hint: z.string().optional(),
    explanation: z.string().optional(),
})
.superRefine((data, ctx) => {
    // Check if index is within options array bounds
    if (data.correctOptionIndex < 0 || data.correctOptionIndex >= data.options.length) { // Fixed >= 
        ctx.addIssue({
            path: ["correctOptionIndex"],
            code: z.ZodIssueCode.custom,
            message: "correctOptionIndex must be a valid index from options array",
        });
    }
    
    // Check if text matches the option at given index
    if (
        data.options[data.correctOptionIndex] !== undefined &&
        data.options[data.correctOptionIndex] !== data.correctOptionText 
    ) {
        ctx.addIssue({
            path: ["correctOptionText"],
            code: z.ZodIssueCode.custom,
            message: "correctOptionText must match the option at correctOptionIndex"
        });
    }
});


// Add questions to contest schema
export const addQuestionsSchema = z.object({
    contestId: z.string().regex(/^[0-9a-fA-F]{24}$/, "Invalid contest ID format"),
    questions: z.array(questionsSchema).min(1, "At least one question is required").max(100, "Cannot add more than 100 questions at once")
});

// Query parameter validation schemas
export const contestsQuerySchema = z.object({
    page: z.coerce.number().int().positive().default(1),
    limit: z.coerce.number().int().positive().max(100).default(10),
    search: z.string().optional(),
    status: z.enum(["draft", "upcoming", "ongoing", "completed", "cancelled", "all"]).optional(),
    sortBy: z.enum(["title", "createdAt", "startTime", "registrationCount"]).default("createdAt"),
    sortOrder: z.enum(["asc", "desc"]).default("desc")
});

// Pagination response schema
export const paginationSchema = z.object({
    currentPage: z.number().int().positive(),
    totalPages: z.number().int().nonnegative(),
    totalItems: z.number().int().nonnegative(),
    itemsPerPage: z.number().int().positive(),
    hasNextPage: z.boolean(),
    hasPreviousPage: z.boolean()
});

// API response schemas
export const apiSuccessResponseSchema = z.object({
    success: z.literal(true),
    data: z.any(),
    message: z.string()
});

export const apiErrorResponseSchema = z.object({
    success: z.literal(false),
    error: z.object({
        code: z.string(),
        message: z.string(),
        details: z.array(z.object({
            field: z.string(),
            message: z.string()
        })).optional()
    })
});

// Contest statistics schema
export const contestStatisticsSchema = z.object({
    contestId: z.string(),
    registrationCount: z.number().int().nonnegative(),
    completedParticipants: z.number().int().nonnegative(),
    averageScore: z.number().nonnegative(),
    highestScore: z.number().nonnegative(),
    lowestScore: z.number().nonnegative(),
    totalRevenue: z.number().nonnegative(),
    participantsByCountry: z.record(z.string(), z.number().int().nonnegative()),
    registrationTrend: z.array(z.object({
        date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be in YYYY-MM-DD format"),
        count: z.number().int().nonnegative()
    }))
});

// Export validation helper functions
export const validateContestId = (id) => {
    return z.string().regex(/^[0-9a-fA-F]{24}$/, "Invalid contest ID format").safeParse(id);
};

export const validatePaginationParams = (params) => {
    return contestsQuerySchema.safeParse(params);
};
