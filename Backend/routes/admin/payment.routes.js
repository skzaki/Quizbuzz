import { Router } from "express";
import {
  exportCsv,
  getAll,
  getById,
  getStats
} from "../../controllers/payment.controller.js";

const router = Router();

router.get("/", getAll);
router.get("/stats", getStats);
router.get("/export", exportCsv);
router.get("/:id", getById);

export default router;