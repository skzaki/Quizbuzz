import express from "express";
import { authMiddleware } from "../../middleware/auth.js";
import { validateBody } from "../../validators/auth.validator.js";
import { sendTestSchema } from "../../validators/message.validator.js";
import {
  getFailedMessages,
  getHistory,
  getStats,
  retryFailed,
  sendTest
} from "../../controllers/message.controller.js";

const router = express.Router();

router.use(authMiddleware);

router.post("/test", validateBody(sendTestSchema), sendTest);
router.get("/history/:userId", getHistory);
router.get("/stats", getStats);
router.get("/failed", getFailedMessages);
router.post("/retry/:id", retryFailed);

export default router;