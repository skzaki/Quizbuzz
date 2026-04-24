import { z } from "zod";

export const registerSchema = z.object({
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  email: z.string().email("Valid email is required"),
  phone: z.string().min(10, "Phone number is required"),
  college: z.string().optional(),
  department: z.string().optional(),
  password: z.string().optional(),
});

export const loginSchema = z.object({
  email: z.string().email("Valid email is required"),
  phone: z.string().min(10, "Phone number is required"),
});

export const validateCredentialsSchema = z.object({
  registrationId: z.string().min(1, "Registration ID is required"),
  phone: z.string().min(10, "Phone number is required"),
  slug: z.string().min(1, "Slug is required"),
});

export const sendOtpSchema = z.object({
  phone: z.string().min(10, "Phone number is required"),
});

export const verifyOtpSchema = z.object({
  phone: z.string().min(10, "Phone number is required"),
  otp: z.string().regex(/^\d{4,6}$/, "OTP must be 4 to 6 digits"),
});

export const validateBody = (schema) => (req, res, next) => {
  const parsed = schema.safeParse(req.body);

  if (!parsed.success) {
    const firstError = parsed.error.issues[0];
    const error = new Error(firstError?.message || "Invalid request body");
    error.statusCode = 400;
    return next(error);
  }

  req.body = parsed.data;
  return next();
};
