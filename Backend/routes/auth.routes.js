import { Router } from "express";
import {
  login,
  logout,
  register,
  sendOtp,
  validateCredentials,
  verifyOtp,
} from "../controllers/auth.controller.js";
import { authMiddleware } from "../middleware/auth.middleware.js";
import {
  loginSchema,
  registerSchema,
  sendOtpSchema,
  validateBody,
  validateCredentialsSchema,
  verifyOtpSchema,
} from "../validators/auth.validator.js";

const router = Router();

router.post("/register", validateBody(registerSchema), register);
router.post("/login", validateBody(loginSchema), login);
router.post(
  "/validate-credentials",
  validateBody(validateCredentialsSchema),
  validateCredentials
);
router.post("/logout", authMiddleware, logout);
router.post("/send-otp", validateBody(sendOtpSchema), sendOtp);
router.post("/verify-otp", validateBody(verifyOtpSchema), verifyOtp);

export default router;
