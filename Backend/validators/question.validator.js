import { z } from "zod";

const questionOptionSchema = z.object({
  text: z.string().min(1, "Option text is required")
});

export const createQuestionSchema = z.object({
  questionText: z.string().min(10, "Question text must be at least 10 characters"),
  options: z.array(questionOptionSchema).length(4, "Exactly 4 options are required"),
  correctOptionIndex: z.number().int().min(0).max(3),
  difficulty: z.string().trim().transform((value) => value.toUpperCase()).pipe(z.enum(["EASY", "MEDIUM", "HARD"])),
  tags: z.array(z.string().min(1)).optional(),
  hint: z.string().optional(),
  explanation: z.string().optional()
});

export const updateQuestionSchema = createQuestionSchema.partial();

export const bulkImportSchema = z.object({
  questions: z.array(createQuestionSchema).min(1).max(500)
});

export const validateBulkImportRows = (questions = []) => {
  const validRows = [];
  const failedRows = [];

  questions.forEach((question, index) => {
    const parsed = createQuestionSchema.safeParse(question);

    if (parsed.success) {
      validRows.push(parsed.data);
      return;
    }

    failedRows.push({
      rowNumber: index + 1,
      errors: parsed.error.issues.map((issue) => ({
        path: issue.path.join(".") || "question",
        message: issue.message
      })),
      row: question
    });
  });

  return { validRows, failedRows };
};