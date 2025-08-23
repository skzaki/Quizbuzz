import { Router } from "express";
import { resendOtp, sendOtp, verifyOtp } from "../controller/authController.js";
import { authMiddleware } from "../middleware/auth.js";

const router = Router();


router.post("/send-otp", authMiddleware, sendOtp);
router.post("/resend-otp", resendOtp);
router.post("/verify-otp", verifyOtp);

export default router;