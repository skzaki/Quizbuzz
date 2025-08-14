import { z } from "zod";

export  const validateCredentialsSchema = z.object({
  registrationId: z.string().min(1, "Registration ID is required"),
  phone: z.string().regex(/^\d{10}$/, "Phone must be 10 digits"),
  slug: z.string().min(1, "Slug is required"),
});