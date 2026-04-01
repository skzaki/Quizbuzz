import { Router } from "express";
import { login, refreshToken, resendOtp, sendOtp, verifyOtp } from "../controller/authController.js";
import { authMiddleware } from "../middleware/auth.js";

import { authRateLimit } from "../middleware/rateLimit.js";

const router = Router();


router.post("/login", authRateLimit, login);
router.post("/send-otp", authMiddleware, sendOtp);
router.post("/resend-otp", authMiddleware, authRateLimit, resendOtp);
router.post("/verify-otp", authMiddleware, verifyOtp);
router.post("/refresh-token", authMiddleware, refreshToken);
export default router;