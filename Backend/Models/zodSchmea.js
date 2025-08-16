import { z } from "zod";

export  const validateCredentialsSchema = z.object({
  registrationId: z.string().min(1, "Registration ID is required"),
  phone: z.string().regex(/^\d{10}$/, "Phone must be 10 digits"),
  slug: z.string().min(1, "Slug is required"),
});



export const questionsSchema = z.object({
    questionText: z.string().min(1, "Question text is required"),
    options: z.array(z.string().min(1, "Option cannot be empty")).min(1, "At least one option is required"),
    correctOptionIndex: z.number().int().nonnegative("Must be 0 or a positive integer"),
    correctOptionText: z.string().min(1, "Correct option text is required"), // Fixed typo
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

// questionText: { type: String, required: true },
//     options: { type: [String], required: true },
//     correctOptionIndex: { type: Number, required: true},
//     correctOptionText: { type: String, required: true},
//     difficulty: { type: String, enum:['easy', 'medium', 'hard'], required:true, index:true },
//     hint: {type: String},
//     explanation: { type: String },
//     isDeleted: { type: Boolean, default: false},
