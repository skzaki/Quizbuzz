import { Router } from "express";
import { resendOtp, sendOtp, verifyOtp } from "../controller/authController.js";

const router = Router();


router.post("/send-otp", sendOtp);
router.post("/resend-otp", resendOtp);
router.post("/verify-otp", verifyOtp);

export default router;