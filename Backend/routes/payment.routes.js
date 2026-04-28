import { Router } from "express";
import {
  createOrder,
  verify,
  webhook
} from "../controllers/payment.controller.js";
import { authMiddleware } from "../middleware/auth.js";
import { rawBodyMiddleware } from "../middleware/razorpay-webhook.middleware.js";
import { createOrderSchema, validateBody, verifySchema } from "../validators/payment.validator.js";

const router = Router();

router.post("/create-order", authMiddleware, validateBody(createOrderSchema), createOrder);
router.post("/verify", authMiddleware, validateBody(verifySchema), verify);
router.post("/webhook", rawBodyMiddleware, webhook);

export default router;