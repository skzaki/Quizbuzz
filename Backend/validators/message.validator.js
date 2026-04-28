import { z } from "zod";

export const messageTypeSchema = z.enum(["WHATSAPP", "EMAIL"]);

export const messageTemplateSchema = z.enum([
  "REGISTRATION_CONFIRMATION",
  "PAYMENT_RECEIPT",
  "QUIZ_REMINDER",
  "RESULT_ANNOUNCEMENT",
  "CERTIFICATE_READY",
  "OTP",
  "PAYMENT_FAILED"
]);

export const sendTestSchema = z.object({
  type: messageTypeSchema,
  template: messageTemplateSchema,
  recipient: z.string().min(1, "Recipient is required"),
  variables: z.record(z.string(), z.unknown()).optional().default({})
});