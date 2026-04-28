import { z } from "zod";

export const createOrderSchema = z.object({
  contestId: z.string().regex(/^[0-9a-fA-F]{24}$/, "Contest ID must be a valid MongoDB ObjectId")
});

export const verifySchema = z.object({
  razorpayOrderId: z.string().regex(/^order_/, "Razorpay order ID must start with order_"),
  razorpayPaymentId: z.string().regex(/^pay_/, "Razorpay payment ID must start with pay_"),
  razorpaySignature: z.string().length(64, "Razorpay signature must be exactly 64 characters")
});

export const validateBody = (schema) => (req, res, next) => {
  const parsed = schema.safeParse(req.body);

  if (!parsed.success) {
    const firstIssue = parsed.error.issues[0];

    return res.status(400).json({
      success: false,
      error: {
        code: "VALIDATION_ERROR",
        message: firstIssue?.message || "Invalid request body",
        details: parsed.error.issues.map((issue) => ({
          field: issue.path.join("."),
          message: issue.message
        }))
      }
    });
  }

  req.body = parsed.data;
  return next();
};