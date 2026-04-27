import { z } from "zod";

export const createContestSchema = z.object({
  title: z.string().min(1),
  slug: z.string().min(1),
  description: z.string().min(1),
  startTime: z.string().min(1),
  endTime: z.string().min(1),
  duration: z.number().int().positive(),
  registerFee: z.number().min(0),
  maxParticipants: z.number().int().min(1)
});

export const updateContestSchema = createContestSchema.partial();

export const updateStatusSchema = z.object({
  status: z.enum(["DRAFT", "PUBLISHED", "UPCOMING", "LIVE", "COMPLETED", "CANCELLED"])
});

export const addQuestionsSchema = z.object({
  questionIds: z.array(z.string().min(1)).min(1)
});

export const validateContestId = (id) => {
  const parsed = z.string().regex(/^[0-9a-fA-F]{24}$/).safeParse(id);

  if (!parsed.success) {
    const error = new Error("Invalid contest ID format");
    error.statusCode = 400;
    error.code = "VALIDATION_ERROR";
    throw error;
  }

  return parsed.data;
};