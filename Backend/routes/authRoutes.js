import { Router } from "express";
import { login, resendOtp, sendOtp, verifyOtp } from "../controller/authController.js";
import { authMiddleware } from "../middleware/auth.js";

const router = Router();


router.post("/login", login);
router.post("/send-otp", authMiddleware, sendOtp);
router.post("/resend-otp", resendOtp);
router.post("/verify-otp", authMiddleware, verifyOtp);
export default router;